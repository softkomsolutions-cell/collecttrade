import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import localtunnel from "localtunnel";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(repoRoot, "server", "data");
const shareStatusFile = path.join(dataDir, "share-status.json");
const localUrl = process.env.PARTNER_LOCAL_URL || "http://127.0.0.1:5000";
const localHost = process.env.PARTNER_LOCAL_HOST || "127.0.0.1";
const port = Number(process.env.PARTNER_PORT || 5000);

function nowIso() {
  return new Date().toISOString();
}

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function writeStatus(payload) {
  ensureDataDir();
  fs.writeFileSync(shareStatusFile, JSON.stringify(payload, null, 2));
}

async function waitForHealth(url, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Could not reach ${url} within ${timeoutMs}ms. Start staging first with npm run partner:staging.`);
}

function createBaseStatus(provider = "pending") {
  return {
    status: "starting",
    provider,
    publicUrl: null,
    localUrl,
    startedAt: nowIso(),
    lastHeartbeatAt: null,
    notes: "Opening a temporary public partner-testing link.",
  };
}

function updateStatus(baseStatus, patch = {}) {
  writeStatus({
    ...baseStatus,
    ...patch,
  });
}

function summarizeShareError(error) {
  const message = String(error?.message || "");

  if (message.includes("cloudflared_exit_1") || message.includes("cloudflared_timeout")) {
    return "Cloudflare quick tunnel did not complete cleanly, so the helper fell back to localtunnel.";
  }

  if (message.includes("cloudflared_not_available")) {
    return "Cloudflare quick tunnel is not installed on this machine, so the helper used localtunnel.";
  }

  return "The preferred share provider was unavailable, so the helper used localtunnel.";
}

function findCloudflaredBinary() {
  const candidates = [
    process.env.CLOUDFLARED_BIN,
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function startCloudflareQuickTunnel(baseStatus) {
  const cloudflaredBin = findCloudflaredBinary();
  if (!cloudflaredBin) {
    throw new Error("cloudflared_not_available");
  }

  updateStatus(baseStatus, {
    provider: "cloudflared",
    notes: "Opening Cloudflare quick tunnel.",
  });

  return new Promise((resolve, reject) => {
    const child = spawn(
      cloudflaredBin,
      [
        "tunnel",
        "--url",
        localUrl,
        "--no-autoupdate",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let settled = false;
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const finish = (result, error = null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    const captureUrl = (chunk) => {
      const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (!match) {
        return;
      }

      finish({
        provider: "cloudflared",
        url: match[0],
        child,
        close: async () => {
          if (!child.killed) {
            child.kill("SIGTERM");
          }
        },
      });
    };

    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      reject(
        new Error(
          `cloudflared_timeout:${stdoutBuffer}\n${stderrBuffer}`.trim(),
        ),
      );
    }, 30000);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutBuffer += text;
      captureUrl(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;
      captureUrl(text);
    });

    child.on("exit", (code) => {
      if (!settled) {
        reject(new Error(`cloudflared_exit_${code || 0}:${stdoutBuffer}\n${stderrBuffer}`.trim()));
      }
    });
  });
}

async function startLocalTunnel(baseStatus) {
  updateStatus(baseStatus, {
    provider: "localtunnel",
    notes: "Falling back to localtunnel.",
  });

  const tunnel = await localtunnel({
    port,
    local_host: localHost,
  });

  return {
    provider: "localtunnel",
    url: tunnel.url,
    tunnel,
    close: async () => {
      try {
        await tunnel.close();
      } catch {
        // ignore close errors
      }
    },
  };
}

const baseStatus = createBaseStatus();
writeStatus(baseStatus);
await waitForHealth(`${localUrl}/api/health`);

let shareHandle;
let providerNotes = "Keep this share helper running while partners test.";

try {
  shareHandle = await startCloudflareQuickTunnel(baseStatus);
  providerNotes = "Cloudflare quick tunnel is live. Keep this helper running while partners test.";
} catch (error) {
  shareHandle = await startLocalTunnel(baseStatus);
  providerNotes = `Localtunnel is live. Keep this helper running while partners test. ${summarizeShareError(error)}`;
}

function updateLiveStatus(status = "live", notes = providerNotes) {
  updateStatus(baseStatus, {
    status,
    provider: shareHandle.provider,
    publicUrl: shareHandle.url,
    lastHeartbeatAt: nowIso(),
    notes,
  });
}

updateLiveStatus();
console.log("");
console.log(`Partner share URL: ${shareHandle.url}`);
console.log(`Provider: ${shareHandle.provider}`);
console.log(`Local app URL: ${localUrl}`);
console.log("Keep this process running while partners test.");
console.log("");

const heartbeat = setInterval(() => {
  updateLiveStatus();
}, 30000);

async function shutdown(status, notes) {
  clearInterval(heartbeat);
  updateStatus(baseStatus, {
    status,
    provider: shareHandle.provider,
    publicUrl: shareHandle.url,
    lastHeartbeatAt: nowIso(),
    notes,
  });

  await shareHandle.close();
}

process.on("SIGINT", async () => {
  await shutdown("closed", "Partner share session closed.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown("closed", "Partner share session closed.");
  process.exit(0);
});

await new Promise(() => {});

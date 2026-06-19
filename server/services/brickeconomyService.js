const rateLimits = require("./rateLimitManager");

const BRICKECONOMY_BASE_URL =
  process.env.BRICKECONOMY_BASE_URL || "https://www.brickeconomy.com/api/v1";
const CACHE_TTL_MS = Number(process.env.BRICKECONOMY_CACHE_TTL_MS || 12 * 60 * 60 * 1000);
const cache = new Map();

function configured() {
  return Boolean(process.env.BRICKECONOMY_API_KEY);
}

async function getSet(setNum) {
  const normalized = String(setNum || "").trim().split("-")[0];
  const cacheKey = `set:${normalized}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cache: "fresh" };
  }

  const quota = rateLimits.canRequest("brickeconomy");
  if (!configured()) {
    return { ok: false, reason: "credentials_not_configured", quota };
  }
  if (!quota.allowed) {
    return cached
      ? { ...cached.value, cache: "stale" }
      : { ok: false, reason: "quota_reserve_active", quota };
  }

  rateLimits.recordRequest("brickeconomy");

  try {
    const response = await fetch(
      `${BRICKECONOMY_BASE_URL}/set?number=${encodeURIComponent(`${normalized}-1`)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "BuildAlpha-Beta/1.0",
          "x-apikey": process.env.BRICKECONOMY_API_KEY,
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      rateLimits.recordError(
        "brickeconomy",
        new Error(`brickeconomy_http_${response.status}`),
        retryAfter,
      );
      return cached
        ? { ...cached.value, cache: "stale" }
        : {
            ok: false,
            reason: `http_${response.status}`,
            quota: rateLimits.canRequest("brickeconomy"),
          };
    }

    const value = {
      ok: true,
      data: payload?.data || payload,
      quota: rateLimits.canRequest("brickeconomy"),
    };
    cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    rateLimits.recordError("brickeconomy", error);
    return cached
      ? { ...cached.value, cache: "stale" }
      : {
          ok: false,
          reason: error.name === "TimeoutError" ? "timeout" : "request_failed",
          quota: rateLimits.canRequest("brickeconomy"),
        };
  }
}

function status() {
  return {
    configured: configured(),
    source: "BrickEconomy",
    quota: rateLimits.canRequest("brickeconomy"),
  };
}

module.exports = {
  getSet,
  status,
};

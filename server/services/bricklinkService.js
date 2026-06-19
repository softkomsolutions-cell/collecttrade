const crypto = require("crypto");
const rateLimits = require("./rateLimitManager");

const BRICKLINK_BASE_URL =
  process.env.BRICKLINK_BASE_URL || "https://api.bricklink.com/api/store/v1";
const CACHE_TTL_MS = Number(process.env.BRICKLINK_CACHE_TTL_MS || 12 * 60 * 60 * 1000);
const cache = new Map();

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function configured() {
  return Boolean(
    process.env.BRICKLINK_CONSUMER_KEY &&
      process.env.BRICKLINK_CONSUMER_SECRET &&
      process.env.BRICKLINK_TOKEN &&
      process.env.BRICKLINK_TOKEN_SECRET,
  );
}

function oauthHeader(method, baseUrl, query = {}) {
  const oauthParams = {
    oauth_consumer_key: process.env.BRICKLINK_CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.BRICKLINK_TOKEN,
    oauth_version: "1.0",
  };
  const signatureParams = { ...query, ...oauthParams };
  const parameterString = Object.entries(signatureParams)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyOrder = percentEncode(leftKey).localeCompare(percentEncode(rightKey));
      return keyOrder || percentEncode(leftValue).localeCompare(percentEncode(rightValue));
    })
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
  const baseString = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(parameterString),
  ].join("&");
  const signingKey = [
    percentEncode(process.env.BRICKLINK_CONSUMER_SECRET),
    percentEncode(process.env.BRICKLINK_TOKEN_SECRET),
  ].join("&");
  const oauth_signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function withQuery(baseUrl, query) {
  const search = new URLSearchParams(query);
  return `${baseUrl}?${search.toString()}`;
}

function normalizeSetNumber(setNum) {
  const normalized = String(setNum || "").trim();
  return normalized.includes("-") ? normalized : `${normalized}-1`;
}

async function request(pathname, query = {}) {
  const quota = rateLimits.canRequest("bricklink");
  if (!configured()) {
    return { ok: false, reason: "credentials_not_configured", quota };
  }
  if (!quota.allowed) {
    return { ok: false, reason: "quota_reserve_active", quota };
  }

  const baseUrl = `${BRICKLINK_BASE_URL}${pathname}`;
  const url = withQuery(baseUrl, query);
  rateLimits.recordRequest("bricklink");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: oauthHeader("GET", baseUrl, query),
        "User-Agent": "BuildAlpha-Beta/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      rateLimits.recordError(
        "bricklink",
        new Error(`bricklink_http_${response.status}`),
        retryAfter,
      );
      return {
        ok: false,
        reason: `http_${response.status}`,
        payload,
        quota: rateLimits.canRequest("bricklink"),
      };
    }

    return {
      ok: true,
      data: payload?.data || payload,
      quota: rateLimits.canRequest("bricklink"),
    };
  } catch (error) {
    rateLimits.recordError("bricklink", error);
    return {
      ok: false,
      reason: error.name === "TimeoutError" ? "timeout" : "request_failed",
      quota: rateLimits.canRequest("bricklink"),
    };
  }
}

async function getPriceGuide(setNum) {
  const catalogNumber = normalizeSetNumber(setNum);
  const cacheKey = `set:${catalogNumber}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cache: "fresh" };
  }

  const [sold, stock] = await Promise.all([
    request(`/items/set/${encodeURIComponent(catalogNumber)}/price`, {
      guide_type: "sold",
      new_or_used: "N",
    }),
    request(`/items/set/${encodeURIComponent(catalogNumber)}/price`, {
      guide_type: "stock",
      new_or_used: "N",
    }),
  ]);
  const value = {
    ok: sold.ok || stock.ok,
    catalogNumber,
    sold: sold.ok ? sold.data : null,
    stock: stock.ok ? stock.data : null,
    error: sold.ok || stock.ok ? null : sold.reason || stock.reason,
    quota: sold.quota || stock.quota,
  };

  if (value.ok) {
    cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return value.ok || !cached ? value : { ...cached.value, cache: "stale" };
}

function status() {
  return {
    configured: configured(),
    source: "BrickLink",
    quota: rateLimits.canRequest("bricklink"),
  };
}

module.exports = {
  getPriceGuide,
  status,
};

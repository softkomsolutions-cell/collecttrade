const DAY_MS = 24 * 60 * 60 * 1000;

const PLATFORM_CONFIG = {
  bricklink: {
    dailyBudget: Number(process.env.BRICKLINK_DAILY_BUDGET || 4500),
    reservePercent: Number(process.env.BRICKLINK_RESERVE_PERCENT || 15),
  },
  brickeconomy: {
    dailyBudget: Number(process.env.BRICKECONOMY_DAILY_BUDGET || 100),
    reservePercent: Number(process.env.BRICKECONOMY_RESERVE_PERCENT || 15),
  },
};

const platformState = Object.fromEntries(
  Object.keys(PLATFORM_CONFIG).map((platform) => [
    platform,
    {
      used: 0,
      blockedUntil: null,
      resetAt: nextResetAt(),
      lastRequestAt: null,
      lastError: null,
    },
  ]),
);

function nextResetAt() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

function resetIfNeeded(platform) {
  const state = platformState[platform];
  if (Date.now() >= Date.parse(state.resetAt)) {
    state.used = 0;
    state.blockedUntil = null;
    state.resetAt = nextResetAt();
    state.lastError = null;
  }
}

function getPlatformConfig(platform) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    throw new Error(`unknown_rate_limit_platform:${platform}`);
  }
  return config;
}

function canRequest(platform) {
  const config = getPlatformConfig(platform);
  const state = platformState[platform];
  resetIfNeeded(platform);

  const reserve = Math.ceil(config.dailyBudget * (config.reservePercent / 100));
  const usableBudget = Math.max(0, config.dailyBudget - reserve);
  const blocked = state.blockedUntil && Date.now() < Date.parse(state.blockedUntil);

  return {
    allowed: !blocked && state.used < usableBudget,
    used: state.used,
    dailyBudget: config.dailyBudget,
    reserve,
    usableBudget,
    remaining: Math.max(0, usableBudget - state.used),
    resetAt: state.resetAt,
    blockedUntil: state.blockedUntil,
  };
}

function recordRequest(platform) {
  resetIfNeeded(platform);
  platformState[platform].used += 1;
  platformState[platform].lastRequestAt = new Date().toISOString();
}

function recordError(platform, error, retryAfterSeconds = null) {
  const state = platformState[platform];
  state.lastError = String(error?.message || error || "request_failed");

  if (Number.isFinite(Number(retryAfterSeconds)) && Number(retryAfterSeconds) > 0) {
    state.blockedUntil = new Date(Date.now() + Number(retryAfterSeconds) * 1000).toISOString();
  }
}

function getStats() {
  return Object.fromEntries(
    Object.keys(PLATFORM_CONFIG).map((platform) => [
      platform,
      {
        ...canRequest(platform),
        lastRequestAt: platformState[platform].lastRequestAt,
        lastError: platformState[platform].lastError,
      },
    ]),
  );
}

module.exports = {
  canRequest,
  getStats,
  recordError,
  recordRequest,
};

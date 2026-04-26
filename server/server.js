const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Parser = require("rss-parser");

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const AUTH_SECRET =
  process.env.AUTH_SECRET || "collecttrade-local-development-secret";
const ENGINE_TICK_MS = 5000;
const MARKET_REFRESH_MS = 60 * 1000;
const NEWS_REFRESH_MS = 10 * 60 * 1000;
const HISTORY_LIMIT = 96;
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "app-store.json");
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const TWELVE_DATA_INTERVAL = process.env.TWELVE_DATA_INTERVAL || "1h";

const DEFAULT_SETTINGS = {
  preferredRegion: "south-africa",
  timezone: "Africa/Johannesburg",
  riskMode: "balanced",
};

const DEFAULT_TARGETS = [
  "USD/ZAR macro pressure",
  "JSE risk appetite",
  "Pokemon sealed demand",
  "Retired LEGO set spreads",
];

const COLLECTIBLES = [
  {
    id: "lego-10316",
    name: "LEGO The Lord of the Rings: Rivendell",
    category: "LEGO",
    venue: "Local collectors / international resale",
    market: "Retired premium sets",
    status: "Accumulating",
    price: 10999,
    changePercent: 8.2,
    confidence: 86,
    note: "Large-format display set with persistent collector demand and limited local supply.",
  },
  {
    id: "lego-10294",
    name: "LEGO Titanic",
    category: "LEGO",
    venue: "Collector resale desks",
    market: "High-ticket sealed inventory",
    status: "Hold",
    price: 12999,
    changePercent: 4.7,
    confidence: 74,
    note: "Premium shelf piece with slower turnover but strong headline appeal.",
  },
  {
    id: "pokemon-151",
    name: "Pokemon Scarlet & Violet 151 Elite Trainer Box",
    category: "Pokemon",
    venue: "Sealed box flow",
    market: "TCG sealed",
    status: "Buy",
    price: 2499,
    changePercent: 12.4,
    confidence: 91,
    note: "Nostalgia set with broad casual demand and deep sealed liquidity.",
  },
  {
    id: "pokemon-prismatic",
    name: "Pokemon Prismatic Evolutions Booster Bundle",
    category: "Pokemon",
    venue: "Launch allocation flips",
    market: "TCG sealed",
    status: "Watch",
    price: 1499,
    changePercent: 6.1,
    confidence: 67,
    note: "Fast-moving launch product with attractive spread when allocation is tight.",
  },
  {
    id: "pokemon-zard-psa10",
    name: "Charizard ex Special Illustration PSA 10",
    category: "Pokemon",
    venue: "Graded singles desk",
    market: "TCG slabs",
    status: "Hold",
    price: 8999,
    changePercent: 3.3,
    confidence: 72,
    note: "Icon-card grading premium with thinner liquidity but durable buyer interest.",
  },
  {
    id: "onepiece-op05",
    name: "One Piece OP-05 Awakening of the New Era Booster Box",
    category: "TCG",
    venue: "Sealed case trade",
    market: "Anime TCG",
    status: "Buy",
    price: 4199,
    changePercent: 9.5,
    confidence: 79,
    note: "Broadening collector base and healthy international comps.",
  },
];

const NEWS_SOURCES = [
  {
    id: "businesstech",
    name: "BusinessTech",
    region: "south-africa",
    url: "https://businesstech.co.za/news/feed/",
  },
  {
    id: "dailyinvestor",
    name: "Daily Investor",
    region: "south-africa",
    url: "https://dailyinvestor.com/feed/",
  },
  {
    id: "sabc-business",
    name: "SABC Business",
    region: "south-africa",
    url: "https://www.sabcnews.com/sabcnews/category/business/feed/",
  },
  {
    id: "coindesk",
    name: "CoinDesk",
    region: "global",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    id: "fxstreet",
    name: "FXStreet",
    region: "global",
    url: "https://www.fxstreet.com/rss/news",
  },
];

const MARKETS = [
  {
    ticker: "USDZAR",
    label: "USD/ZAR",
    region: "south-africa",
    providerSymbol: "USD/ZAR",
    basePrice: 18.42,
    drift: 0.00024,
    volatility: 0.0023,
    minPrice: 16.8,
    maxPrice: 21.2,
  },
  {
    ticker: "EURUSD",
    label: "EUR/USD",
    region: "global",
    providerSymbol: "EUR/USD",
    basePrice: 1.086,
    drift: 0.00008,
    volatility: 0.0015,
    minPrice: 0.92,
    maxPrice: 1.22,
  },
  {
    ticker: "BTCUSD",
    label: "BTC/USD",
    region: "global",
    providerSymbol: "BTC/USD",
    basePrice: 64800,
    drift: 0.00055,
    volatility: 0.0095,
    minPrice: 28000,
    maxPrice: 120000,
  },
  {
    ticker: "JSE40",
    label: "JSE Top 40",
    region: "south-africa",
    providerSymbol: process.env.TWELVE_DATA_JSE_SYMBOL || "JTOPI",
    exchange: "JSE",
    basePrice: 78500,
    drift: 0.00016,
    volatility: 0.0031,
    minPrice: 65000,
    maxPrice: 91000,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundPrice(ticker, value) {
  if (ticker === "BTCUSD" || ticker === "JSE40") {
    return Number(value.toFixed(2));
  }

  if (ticker === "USDZAR") {
    return Number(value.toFixed(4));
  }

  return Number(value.toFixed(5));
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function sanitizeSettings(input) {
  const preferredRegion =
    input?.preferredRegion === "global" || input?.preferredRegion === "all"
      ? input.preferredRegion
      : "south-africa";
  const riskMode =
    input?.riskMode === "defensive" || input?.riskMode === "aggressive"
      ? input.riskMode
      : "balanced";

  return {
    preferredRegion,
    riskMode,
    timezone: "Africa/Johannesburg",
  };
}

function defaultUserState() {
  return {
    trades: [],
    settings: { ...DEFAULT_SETTINGS },
    newsTargets: [...DEFAULT_TARGETS],
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore() {
  ensureDataDir();

  if (!fs.existsSync(STORE_FILE)) {
    return {
      users: [],
      userStates: {},
      settings: { ...DEFAULT_SETTINGS },
      trades: [],
      newsTargets: [...DEFAULT_TARGETS],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const userStates = Object.fromEntries(
      Object.entries(parsed.userStates || {}).map(([userId, state]) => [
        userId,
        {
          ...defaultUserState(),
          ...state,
          settings: sanitizeSettings(state?.settings),
          newsTargets: uniqueStrings(state?.newsTargets || DEFAULT_TARGETS),
          trades: Array.isArray(state?.trades) ? state.trades : [],
        },
      ]),
    );

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      userStates,
      settings: sanitizeSettings(parsed.settings),
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      newsTargets: uniqueStrings(parsed.newsTargets || DEFAULT_TARGETS),
    };
  } catch (error) {
    console.warn("Failed to parse store, starting fresh.", error.message);
    return {
      users: [],
      userStates: {},
      settings: { ...DEFAULT_SETTINGS },
      trades: [],
      newsTargets: [...DEFAULT_TARGETS],
    };
  }
}

let store = loadStore();
let users = store.users;
let userStates = store.userStates;
let guestTrades = store.trades;
let guestTargets = store.newsTargets;
let appSettings = store.settings;

function maxTradeId() {
  const stateTrades = Object.values(userStates).flatMap((state) => state.trades || []);
  return [...guestTrades, ...stateTrades].reduce(
    (max, trade) => Math.max(max, Number(trade.id || 0)),
    0,
  );
}

let tradeId = maxTradeId() + 1;

function persistStore() {
  ensureDataDir();
  fs.writeFileSync(
    STORE_FILE,
    JSON.stringify(
      {
        users,
        userStates,
        settings: appSettings,
        trades: guestTrades,
        newsTargets: guestTargets,
      },
      null,
      2,
    ),
  );
}

function getUserState(userId) {
  if (!userStates[userId]) {
    userStates[userId] = defaultUserState();
    persistStore();
  }

  return userStates[userId];
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function verifyPassword(password, user) {
  return hashPassword(password, user.passwordSalt) === user.passwordHash;
}

function encodeToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function decodeToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");

  if (signature !== expected) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function issueToken(user) {
  return encodeToken({
    sub: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
}

function readBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function optionalAuth(req, _res, next) {
  const token = readBearerToken(req);

  if (!token) {
    req.user = null;
    req.userState = null;
    next();
    return;
  }

  const payload = decodeToken(token);
  const user = users.find((candidate) => candidate.id === payload?.sub);

  if (!user) {
    req.user = null;
    req.userState = null;
    next();
    return;
  }

  req.user = user;
  req.userState = getUserState(user.id);
  next();
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    next();
  });
}

function ema(values, period) {
  if (!values.length) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const result = [values[0]];

  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * multiplier + result[index - 1] * (1 - multiplier));
  }

  return result;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) {
    return values.map(() => 50);
  }

  const output = new Array(period).fill(50);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) {
      gains += delta;
    } else {
      losses -= delta;
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  output.push(averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss));

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;

    if (averageLoss === 0) {
      output.push(100);
      continue;
    }

    const relativeStrength = averageGain / averageLoss;
    output.push(100 - 100 / (1 + relativeStrength));
  }

  return output;
}

function signFromDiff(value) {
  if (value > 0) {
    return 1;
  }

  if (value < 0) {
    return -1;
  }

  return 0;
}

function countRecentBraids(diffSeries) {
  let changes = 0;

  for (let index = 1; index < diffSeries.length; index += 1) {
    const previous = signFromDiff(diffSeries[index - 1]);
    const current = signFromDiff(diffSeries[index]);
    if (previous !== 0 && current !== 0 && previous !== current) {
      changes += 1;
    }
  }

  return changes;
}

function buildSeedSeries(market) {
  const series = [];
  let price = market.basePrice;
  const start = Date.now() - HISTORY_LIMIT * 60 * 60 * 1000;

  for (let index = 0; index < HISTORY_LIMIT; index += 1) {
    const cycle = Math.sin(index / 5 + market.basePrice) * market.volatility * 0.42;
    const wobble = Math.cos(index / 7 + market.basePrice) * market.volatility * 0.21;
    price = price * (1 + market.drift + cycle + wobble);
    price = clamp(price, market.minPrice, market.maxPrice);
    series.push({
      time: new Date(start + index * 60 * 60 * 1000).toISOString(),
      value: roundPrice(market.ticker, price),
    });
  }

  return series;
}

function toLineSeries(ticker, values, timestamps) {
  return values.map((value, index) => ({
    time: timestamps[index],
    value: roundPrice(ticker, value),
  }));
}

function toUtcIso(datetimeValue) {
  const value = String(datetimeValue || "").trim();
  if (!value) {
    return nowIso();
  }

  if (value.endsWith("Z") || value.includes("T")) {
    return new Date(value).toISOString();
  }

  return new Date(value.replace(" ", "T") + "Z").toISOString();
}

let marketSeries = Object.fromEntries(MARKETS.map((market) => [market.ticker, buildSeedSeries(market)]));
let latestSignals = [];
let leadSignal = null;
let lastEngineTickAt = nowIso();
let liveMarketTickers = new Set();
let marketDataMeta = {
  provider: TWELVE_DATA_API_KEY ? "Twelve Data" : "Simulator",
  mode: TWELVE_DATA_API_KEY ? "hybrid" : "simulated",
  interval: TWELVE_DATA_INTERVAL,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: TWELVE_DATA_API_KEY ? "Waiting for first live market sync." : null,
  sourceStatus: MARKETS.map((market) => ({
    ticker: market.ticker,
    label: market.label,
    provider: TWELVE_DATA_API_KEY ? "Twelve Data" : "Simulator",
    status: TWELVE_DATA_API_KEY ? "pending" : "simulated",
    points: marketSeries[market.ticker].length,
    detail: TWELVE_DATA_API_KEY ? "API key detected; awaiting first refresh." : "Using local simulator.",
  })),
};

function chooseLeadSignal(signals) {
  const scored = [...signals].sort((left, right) => {
    const actionRank = (signal) =>
      signal.action === "BUY" || signal.action === "SELL" ? 2 : signal.action === "HOLD" ? 1 : 0;

    return (
      actionRank(right) - actionRank(left) ||
      right.confidence - left.confidence ||
      Number(right.region === "south-africa") - Number(left.region === "south-africa")
    );
  });

  return scored[0] || null;
}

function sanitizeOrderNote(value) {
  return String(value || "").trim().slice(0, 240);
}

function parseQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
    return null;
  }

  return quantity;
}

function normalizeTradePrice(trade, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (trade.assetClass === "collectible") {
    return Number(numeric.toFixed(2));
  }

  return roundPrice(trade.marketTicker, numeric);
}

function updateTradeValuation(trade, price) {
  const normalizedPrice = normalizeTradePrice(trade, price);
  if (normalizedPrice == null) {
    return false;
  }

  const quantity = parseQuantity(trade.quantity) || 1;
  const direction = trade.side === "SELL" ? -1 : 1;
  const pnlPercent =
    ((normalizedPrice - trade.entryPrice) / trade.entryPrice) * 100 * direction;
  const pnlAmount =
    (normalizedPrice - trade.entryPrice) * quantity * direction;
  const entryValue = trade.entryPrice * quantity;
  const currentValue = normalizedPrice * quantity;
  let changed = false;

  const nextValues = {
    currentPrice: normalizedPrice,
    quantity,
    pnl: Number(pnlPercent.toFixed(2)),
    pnlAmount: Number(pnlAmount.toFixed(2)),
    entryValue: Number(entryValue.toFixed(2)),
    currentValue: Number(currentValue.toFixed(2)),
  };

  for (const [key, nextValue] of Object.entries(nextValues)) {
    if (trade[key] !== nextValue) {
      trade[key] = nextValue;
      changed = true;
    }
  }

  return changed;
}

function classifySignal(market, series) {
  const closes = series.map((point) => point.value);
  const timestamps = series.map((point) => point.time);
  const ema8Series = ema(closes, 8);
  const ema21Series = ema(closes, 21);
  const rsiSeries = rsi(closes, 14);

  const lastIndex = closes.length - 1;
  const lastClose = closes[lastIndex];
  const previousClose = closes[lastIndex - 1];
  const ema8Now = ema8Series[lastIndex];
  const ema8Previous = ema8Series[lastIndex - 1];
  const ema21Now = ema21Series[lastIndex];
  const ema21Previous = ema21Series[lastIndex - 1];
  const diffSeries = ema8Series.slice(-8).map((value, index) => value - ema21Series[ema21Series.length - 8 + index]);
  const spread = Math.abs(ema8Now - ema21Now) / lastClose;
  const previousSpread = Math.abs(ema8Previous - ema21Previous) / previousClose;
  const gapState =
    spread > previousSpread + 0.0001 ? "widening" : spread + 0.0001 < previousSpread ? "narrowing" : "steady";
  const bullishCross = ema8Previous <= ema21Previous && ema8Now > ema21Now;
  const bearishCross = ema8Previous >= ema21Previous && ema8Now < ema21Now;
  const anchorCloses = closes.filter((_, index) => index % 4 === 0);
  const anchorEma8 = ema(anchorCloses, 8);
  const anchorEma21 = ema(anchorCloses, 21);
  const anchorTrend =
    anchorEma8.at(-1) > anchorEma21.at(-1)
      ? "bullish"
      : anchorEma8.at(-1) < anchorEma21.at(-1)
        ? "bearish"
        : "neutral";
  const braids = countRecentBraids(diffSeries);
  const chop = braids >= 2 || spread < market.volatility * 0.45;
  const retestWindow = market.volatility * 2.1;
  const bullishRetest =
    ema8Now > ema21Now &&
    anchorTrend === "bullish" &&
    Math.abs(lastClose - ema21Now) / lastClose < retestWindow &&
    lastClose > ema21Now;
  const bearishRejection =
    ema8Now < ema21Now &&
    anchorTrend === "bearish" &&
    Math.abs(lastClose - ema21Now) / lastClose < retestWindow &&
    lastClose < ema21Now;

  let action = "HOLD";
  let setup = "Trend continuation";
  let thesis = "Price is holding its current structure; patience matters more than forcing the next entry.";

  if (chop) {
    action = "HOLD";
    setup = "Neutral chop";
    thesis = "The 8 and 21 are braiding. Stand aside until the averages separate cleanly.";
  } else if (bullishCross && lastClose > ema8Now) {
    action = "BUY";
    setup = "Bullish 8/21 cross";
    thesis = "Momentum flipped up and price is already respecting the fast EMA.";
  } else if (bearishCross && lastClose < ema8Now) {
    action = "SELL";
    setup = "Bearish 8/21 cross";
    thesis = "Momentum rolled over and price is staying beneath the fast EMA.";
  } else if (bullishRetest) {
    action = "BUY";
    setup = "21 EMA retest";
    thesis = "Trend remains up, the pullback is shallow, and the 21 EMA is acting as support.";
  } else if (bearishRejection) {
    action = "SELL";
    setup = "21 EMA rejection";
    thesis = "The rally into the 21 EMA failed, keeping bears in control.";
  } else if (ema8Now > ema21Now && lastClose > ema8Now) {
    action = "HOLD";
    setup = "Long bias continuation";
    thesis = "The trend is constructive, but the cleaner entry is the next retest instead of chasing.";
  } else if (ema8Now < ema21Now && lastClose < ema8Now) {
    action = "HOLD";
    setup = "Short bias continuation";
    thesis = "The downtrend remains intact, but the higher-quality setup is a rally back toward the 21 EMA.";
  }

  const confidence = clamp(
    56 +
      Number(bullishCross || bearishCross) * 14 +
      Number(bullishRetest || bearishRejection) * 11 +
      Number(anchorTrend !== "neutral") * 6 +
      Number(gapState === "widening") * 6 -
      braids * 6,
    42,
    95,
  );

  return {
    ticker: market.ticker,
    label: market.label,
    headline: `${market.label}: ${setup}`,
    region: market.region,
    action,
    setup,
    thesis,
    confidence,
    rsi: Number(rsiSeries.at(-1).toFixed(1)),
    price: roundPrice(market.ticker, lastClose),
    ema8: roundPrice(market.ticker, ema8Now),
    ema21: roundPrice(market.ticker, ema21Now),
    anchorTrend,
    gapState,
    retest: bullishRetest || bearishRejection,
    chop,
    exitRule:
      action === "SELL" || anchorTrend === "bearish"
        ? "Exit short if price closes above the 8 EMA."
        : "Exit long if price closes below the 8 EMA.",
    generatedAt: nowIso(),
    chart: {
      price: series,
      ema8: toLineSeries(market.ticker, ema8Series, timestamps),
      ema21: toLineSeries(market.ticker, ema21Series, timestamps),
    },
  };
}

function updateTradeMetrics(trade, signal) {
  if (trade.status !== "open") {
    const frozenPrice = trade.exitPrice || trade.currentPrice || trade.entryPrice;
    return updateTradeValuation(trade, frozenPrice);
  }

  if (!signal) {
    return false;
  }

  const currentPrice = signal.price;
  let changed = updateTradeValuation(trade, currentPrice);

  const shouldClose =
    (trade.side === "BUY" && currentPrice < signal.ema8) ||
    (trade.side === "SELL" && currentPrice > signal.ema8);

  if (shouldClose) {
    trade.status = "closed";
    trade.exitPrice = currentPrice;
    trade.closedAt = nowIso();
    trade.exitReason = "Price closed through the 8 EMA";
    changed = true;
  }

  if (changed) {
    trade.updatedAt = nowIso();
  }

  return changed;
}

function tickMarket(market, previousPrice, signal) {
  const bias =
    signal?.action === "BUY"
      ? market.drift + market.volatility * 0.08
      : signal?.action === "SELL"
        ? market.drift - market.volatility * 0.08
        : market.drift;
  const cycle = Math.sin(Date.now() / 180000 + market.basePrice) * market.volatility * 0.35;
  const noise = (Math.random() - 0.5) * market.volatility;
  const nextPrice = clamp(
    previousPrice * (1 + bias + cycle + noise),
    market.minPrice,
    market.maxPrice,
  );

  return roundPrice(market.ticker, nextPrice);
}

function rebuildSignalsFromSeries() {
  latestSignals = MARKETS.map((market) => classifySignal(market, marketSeries[market.ticker]));
  leadSignal = chooseLeadSignal(latestSignals);
  lastEngineTickAt = nowIso();
}

function syncTradeBookToLatestSignals() {
  let storeChanged = false;

  for (const trade of guestTrades) {
    storeChanged = updateTradeMetrics(
      trade,
      latestSignals.find((signal) => signal.ticker === trade.marketTicker),
    ) || storeChanged;
  }

  for (const state of Object.values(userStates)) {
    for (const trade of state.trades) {
      storeChanged = updateTradeMetrics(
        trade,
        latestSignals.find((signal) => signal.ticker === trade.marketTicker),
      ) || storeChanged;
    }
  }

  if (storeChanged) {
    persistStore();
  }
}

function engineTick() {
  for (const market of MARKETS) {
    if (TWELVE_DATA_API_KEY && liveMarketTickers.has(market.ticker)) {
      continue;
    }

    const series = marketSeries[market.ticker];
    const previousPoint = series[series.length - 1];
    const previousSignal = latestSignals.find((signal) => signal.ticker === market.ticker);
    const nextPoint = {
      time: nowIso(),
      value: tickMarket(market, previousPoint.value, previousSignal),
    };

    marketSeries[market.ticker] = [...series.slice(-(HISTORY_LIMIT - 1)), nextPoint];
  }

  rebuildSignalsFromSeries();
  syncTradeBookToLatestSignals();
}

async function fetchTwelveDataSeries(market) {
  const params = new URLSearchParams({
    symbol: market.providerSymbol,
    interval: TWELVE_DATA_INTERVAL,
    outputsize: String(HISTORY_LIMIT),
    order: "asc",
    timezone: "UTC",
    apikey: TWELVE_DATA_API_KEY,
  });

  if (market.exchange) {
    params.set("exchange", market.exchange);
  }

  const response = await fetch(`${TWELVE_DATA_BASE_URL}/time_series?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Market API request failed with ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status === "error" || !Array.isArray(payload.values)) {
    throw new Error(payload.message || "Market API returned no series data.");
  }

  const points = payload.values
    .map((entry) => ({
      time: toUtcIso(entry.datetime),
      value: roundPrice(market.ticker, Number(entry.close)),
    }))
    .filter((entry) => Number.isFinite(entry.value));

  if (points.length < 24) {
    throw new Error("Market API returned too few candles for the EMA workflow.");
  }

  return points.slice(-HISTORY_LIMIT);
}

async function refreshMarketDataOnce() {
  if (!TWELVE_DATA_API_KEY) {
    marketDataMeta = {
      ...marketDataMeta,
      provider: "Simulator",
      mode: "simulated",
      lastAttemptAt: nowIso(),
      sourceStatus: MARKETS.map((market) => ({
        ticker: market.ticker,
        label: market.label,
        provider: "Simulator",
        status: "simulated",
        points: marketSeries[market.ticker].length,
        detail: "Using local simulator.",
      })),
    };
    return;
  }

  marketDataMeta.lastAttemptAt = nowIso();

  const results = await Promise.allSettled(
    MARKETS.map(async (market) => ({
      market,
      points: await fetchTwelveDataSeries(market),
    })),
  );

  const nextLiveTickers = new Set();
  const statuses = [];
  let liveMarkets = 0;
  let fallbackMarkets = 0;

  results.forEach((result, index) => {
    const market = MARKETS[index];

    if (result.status === "fulfilled") {
      marketSeries[market.ticker] = result.value.points;
      nextLiveTickers.add(market.ticker);
      liveMarkets += 1;
      statuses.push({
        ticker: market.ticker,
        label: market.label,
        provider: "Twelve Data",
        status: "live",
        points: result.value.points.length,
        detail: `${market.providerSymbol} via ${TWELVE_DATA_INTERVAL} candles.`,
      });
      return;
    }

    fallbackMarkets += 1;
    statuses.push({
      ticker: market.ticker,
      label: market.label,
      provider: "Simulator fallback",
      status: "fallback",
      points: marketSeries[market.ticker].length,
      detail: result.reason?.message || "Live candles unavailable; using local fallback.",
    });
  });

  liveMarketTickers = nextLiveTickers;
  marketDataMeta.provider = "Twelve Data";
  marketDataMeta.mode =
    liveMarkets === MARKETS.length ? "live" : liveMarkets > 0 ? "hybrid" : "simulated";
  marketDataMeta.sourceStatus = statuses;
  marketDataMeta.lastSuccessAt = liveMarkets > 0 ? nowIso() : marketDataMeta.lastSuccessAt;
  marketDataMeta.lastError =
    fallbackMarkets > 0
      ? "Some markets are using the simulator fallback."
      : null;

  rebuildSignalsFromSeries();
  syncTradeBookToLatestSignals();
}

function buildFallbackNews() {
  const seenAt = nowIso();
  return [
    {
      id: "fallback-za-rand",
      title: "South African macro desk waiting for a cleaner USD/ZAR pullback into the 21 EMA",
      link: "",
      sourceId: "fallback",
      sourceName: "Collecttrade Desk",
      region: "south-africa",
      marketTicker: "USDZAR",
      publishedAt: null,
      seenAt,
      summary: "Fallback intelligence while live feeds refresh.",
    },
    {
      id: "fallback-global-btc",
      title: "Crypto risk appetite remains sensitive to momentum acceleration above the fast EMA",
      link: "",
      sourceId: "fallback",
      sourceName: "Collecttrade Desk",
      region: "global",
      marketTicker: "BTCUSD",
      publishedAt: null,
      seenAt,
      summary: "Fallback intelligence while live feeds refresh.",
    },
  ];
}

function detectMarketTicker(title) {
  const headline = String(title || "").toLowerCase();
  if (/rand|zar|jse|south africa|sa\b/.test(headline)) {
    return "USDZAR";
  }

  if (/bitcoin|crypto|ethereum|coin/.test(headline)) {
    return "BTCUSD";
  }

  if (/euro|ecb|eur\/usd|eurozone/.test(headline)) {
    return "EURUSD";
  }

  return "USDZAR";
}

let newsItems = buildFallbackNews();
let newsMeta = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  sourceStatus: [],
};

function normalizeNewsItem(source, item) {
  const publishedAt = item.isoDate
    ? new Date(item.isoDate).toISOString()
    : item.pubDate
      ? new Date(item.pubDate).toISOString()
      : null;
  const seenAt = nowIso();
  const link = item.link || "";

  return {
    id: crypto
      .createHash("sha1")
      .update(`${source.id}:${link || item.title || seenAt}`)
      .digest("hex")
      .slice(0, 16),
    title: String(item.title || "Untitled headline").trim(),
    link,
    sourceId: source.id,
    sourceName: source.name,
    region: source.region,
    marketTicker: detectMarketTicker(item.title),
    publishedAt,
    seenAt,
    summary: String(item.contentSnippet || item.content || "").replace(/<[^>]+>/g, " ").trim().slice(0, 220),
  };
}

async function refreshNewsOnce() {
  newsMeta.lastAttemptAt = nowIso();

  const results = await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return {
        source,
        items: (feed.items || []).slice(0, 8).map((item) => normalizeNewsItem(source, item)),
      };
    }),
  );

  const nextItems = [];
  const sourceStatus = [];

  results.forEach((result, index) => {
    const source = NEWS_SOURCES[index];
    if (result.status === "fulfilled") {
      sourceStatus.push({
        id: source.id,
        name: source.name,
        region: source.region,
        status: "ok",
        items: result.value.items.length,
      });
      nextItems.push(...result.value.items);
      return;
    }

    sourceStatus.push({
      id: source.id,
      name: source.name,
      region: source.region,
      status: "error",
      items: 0,
      detail: result.reason?.message || "Feed failed",
    });
  });

  newsMeta.sourceStatus = sourceStatus;

  if (nextItems.length) {
    newsItems = [...new Map(nextItems.map((item) => [item.link || item.id, item])).values()].sort((left, right) => {
      const leftDate = new Date(left.publishedAt || left.seenAt).getTime();
      const rightDate = new Date(right.publishedAt || right.seenAt).getTime();
      return rightDate - leftDate;
    });
    newsMeta.lastSuccessAt = nowIso();
    newsMeta.lastError = null;
    return;
  }

  if (!newsItems.length) {
    newsItems = buildFallbackNews();
  }

  newsMeta.lastError = "Live feeds unavailable; serving fallback items.";
}

function filterNewsByRegion(region) {
  if (region === "all") {
    return newsItems;
  }

  return newsItems.filter((item) => item.region === region);
}

function findCollectibleById(collectibleId) {
  return COLLECTIBLES.find((item) => item.id === collectibleId);
}

function collectionForRequest(req) {
  return req.userState ? req.userState.trades : guestTrades;
}

function targetsForRequest(req) {
  return req.userState ? req.userState.newsTargets : guestTargets;
}

function settingsForRequest(req) {
  return req.userState ? req.userState.settings : appSettings;
}

function createTrade(signal, side, userId, overrides = {}) {
  const trade = {
    id: tradeId++,
    marketTicker: signal.ticker,
    ticker: signal.label,
    assetClass: "market",
    side,
    status: "open",
    entryPrice: signal.price,
    currentPrice: signal.price,
    pnl: 0,
    setup: signal.setup,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    owner: userId || "guest",
    ...overrides,
  };

  trade.quantity = parseQuantity(trade.quantity) || 1;
  trade.orderNote = sanitizeOrderNote(trade.orderNote);
  trade.unitLabel =
    trade.unitLabel || (trade.assetClass === "collectible" ? "items" : "units");
  updateTradeValuation(trade, trade.currentPrice ?? trade.entryPrice);
  return trade;
}

function createCollectibleTrade(item, side, userId, overrides = {}) {
  const entryPrice = Number(item.price);
  const markedPrice = Number((item.price * (1 + item.changePercent / 100)).toFixed(2));

  return createTrade(
    {
      ticker: `COLLECTIBLE:${item.id}`,
      label: item.name,
      price: entryPrice,
      setup: `${item.category} collector flow`,
    },
    side,
    userId,
    {
      assetClass: "collectible",
      collectibleId: item.id,
      category: item.category,
      marketTicker: `COLLECTIBLE:${item.id}`,
      currentPrice: markedPrice,
      market: item.market,
      venue: item.venue,
      note: item.note,
      unitLabel: "items",
      ...overrides,
    },
  );
}

function findTradeById(trades, tradeIdToFind) {
  return trades.find((trade) => String(trade.id) === String(tradeIdToFind));
}

function closeTrade(trade, exitReason, signal) {
  if (trade.status !== "open") {
    return false;
  }

  const closingPrice = signal?.price || trade.currentPrice || trade.entryPrice;
  trade.status = "closed";
  trade.exitPrice = normalizeTradePrice(trade, closingPrice);
  trade.closedAt = nowIso();
  trade.exitReason = exitReason || "Manual close";
  trade.updatedAt = nowIso();
  updateTradeValuation(trade, trade.exitPrice);
  return true;
}

function buildHealth() {
  const openTrades = Object.values(userStates)
    .flatMap((state) => state.trades)
    .filter((trade) => trade.status === "open").length;
  const marketServiceStatus =
    marketDataMeta.mode === "live"
      ? "online"
      : marketDataMeta.mode === "hybrid"
        ? "degraded"
        : "simulated";

  return {
    ok: true,
    services: {
      api: "online",
      engine: "online",
      marketData: marketServiceStatus,
      news: newsMeta.lastError ? "degraded" : "online",
      persistence: "online",
    },
    metrics: {
      userCount: users.length,
      openTrades,
      newsItems: newsItems.length,
      preferredRegion: appSettings.preferredRegion,
      marketDataProvider: marketDataMeta.provider,
      marketDataMode: marketDataMeta.mode,
      marketDataInterval: marketDataMeta.interval,
      lastEngineTickAt,
      lastMarketRefreshAt: marketDataMeta.lastSuccessAt || marketDataMeta.lastAttemptAt,
      lastNewsAttemptAt: newsMeta.lastAttemptAt,
      lastNewsSuccessAt: newsMeta.lastSuccessAt,
    },
    sources: newsMeta.sourceStatus,
    marketSources: marketDataMeta.sourceStatus,
  };
}

app.get("/", (_req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Collecttrade API</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, Segoe UI, Arial, sans-serif;
        background: #05070c;
        color: #f5f7fb;
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        width: min(720px, 100%);
        border: 1px solid rgba(116, 132, 171, 0.18);
        border-radius: 24px;
        padding: 28px;
        background: rgba(255, 255, 255, 0.03);
      }
      h1 {
        margin: 0 0 12px;
        color: #fff6ea;
      }
      p {
        color: #8da2c8;
        line-height: 1.6;
      }
      a {
        color: #4a8bff;
        text-decoration: none;
      }
      ul {
        margin: 18px 0 0;
        padding-left: 18px;
      }
      li {
        margin: 10px 0;
      }
      code {
        color: #dbe7ff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Collecttrade API is running</h1>
      <p>This is the backend service. The app UI lives on the frontend dev server.</p>
      <ul>
        <li>Frontend: <a href="http://127.0.0.1:5173/">http://127.0.0.1:5173/</a></li>
        <li>Health: <a href="/api/health">/api/health</a></li>
        <li>Signals: <a href="/api/signals">/api/signals</a></li>
      </ul>
      <p>If you want live market candles, add <code>TWELVE_DATA_API_KEY</code> to the server environment and restart the API.</p>
    </main>
  </body>
</html>`);
});

app.get("/api/health", (_req, res) => {
  res.json(buildHealth());
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (name.length < 2) {
    res.status(400).json({ ok: false, error: "name_too_short" });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ ok: false, error: "password_too_short" });
    return;
  }

  if (users.some((user) => user.email === email)) {
    res.status(409).json({ ok: false, error: "email_in_use" });
    return;
  }

  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
  };

  users.push(user);
  getUserState(user.id);
  persistStore();

  res.status(201).json({
    ok: true,
    token: issueToken(user),
    user: publicUser(user),
    settings: getUserState(user.id).settings,
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const user = users.find((candidate) => candidate.email === email);

  if (!user || !verifyPassword(password, user)) {
    res.status(401).json({ ok: false, error: "invalid_credentials" });
    return;
  }

  user.lastLoginAt = nowIso();
  persistStore();

  res.json({
    ok: true,
    token: issueToken(user),
    user: publicUser(user),
    settings: getUserState(user.id).settings,
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: publicUser(req.user),
    settings: req.userState.settings,
  });
});

app.get("/api/signals", (_req, res) => {
  res.json({
    generatedAt: lastEngineTickAt,
    leadSignal,
    signals: latestSignals,
    marketData: {
      provider: marketDataMeta.provider,
      mode: marketDataMeta.mode,
      interval: marketDataMeta.interval,
      lastAttemptAt: marketDataMeta.lastAttemptAt,
      lastSuccessAt: marketDataMeta.lastSuccessAt,
      lastError: marketDataMeta.lastError,
      sourceStatus: marketDataMeta.sourceStatus,
    },
    strategyRules: [
      "Buy when the 8 EMA crosses above the 21 EMA and price keeps holding above the fast EMA.",
      "Sell when the 8 EMA crosses below the 21 EMA and price stays under the fast EMA.",
      "Higher-probability entries come on pullbacks into the 21 EMA that hold in-trend.",
      "If the 8 and 21 braid back and forth, treat it as chop and stand aside.",
      "Use the anchor trend for alignment before taking lower-timeframe continuation entries.",
      "Exit when price closes on the opposite side of the 8 EMA.",
    ],
  });
});

app.get("/api/news", optionalAuth, (req, res) => {
  const requestedRegion = String(
    req.query.region || settingsForRequest(req).preferredRegion || "south-africa",
  );
  const region = requestedRegion === "global" || requestedRegion === "all" ? requestedRegion : "south-africa";

  res.json({
    region,
    refreshedAt: newsMeta.lastSuccessAt || newsMeta.lastAttemptAt,
    items: filterNewsByRegion(region),
    sources: NEWS_SOURCES,
    sourceStatus: newsMeta.sourceStatus,
  });
});

app.get("/api/collectibles", (_req, res) => {
  res.json({
    updatedAt: nowIso(),
    items: COLLECTIBLES,
  });
});

app.get("/api/portfolio", requireAuth, (req, res) => {
  res.json(req.userState.trades);
});

app.post("/api/trades", requireAuth, (req, res) => {
  const marketTicker = String(req.body?.marketTicker || "").toUpperCase();
  const side = String(req.body?.side || "").toUpperCase();
  const quantity = parseQuantity(req.body?.quantity);
  const orderNote = sanitizeOrderNote(req.body?.orderNote);
  const signal = latestSignals.find((candidate) => candidate.ticker === marketTicker);

  if (!signal) {
    res.status(400).json({ ok: false, error: "unknown_market" });
    return;
  }

  if (side !== "BUY" && side !== "SELL") {
    res.status(400).json({ ok: false, error: "invalid_side" });
    return;
  }

  if (!quantity) {
    res.status(400).json({ ok: false, error: "invalid_quantity" });
    return;
  }

  const trade = createTrade(signal, side, req.user.id, {
    quantity,
    orderNote,
  });
  req.userState.trades.unshift(trade);
  persistStore();

  res.status(201).json({ ok: true, trade, portfolio: req.userState.trades });
});

app.post("/api/collectibles/trades", requireAuth, (req, res) => {
  const collectibleId = String(req.body?.collectibleId || "").trim();
  const side = String(req.body?.side || "BUY").toUpperCase();
  const quantity = parseQuantity(req.body?.quantity);
  const orderNote = sanitizeOrderNote(req.body?.orderNote);
  const item = findCollectibleById(collectibleId);

  if (!item) {
    res.status(400).json({ ok: false, error: "unknown_collectible" });
    return;
  }

  if (side !== "BUY" && side !== "SELL") {
    res.status(400).json({ ok: false, error: "invalid_side" });
    return;
  }

  if (!quantity) {
    res.status(400).json({ ok: false, error: "invalid_quantity" });
    return;
  }

  const trade = createCollectibleTrade(item, side, req.user.id, {
    quantity,
    orderNote,
  });
  req.userState.trades.unshift(trade);
  persistStore();

  res.status(201).json({
    ok: true,
    trade,
    portfolio: req.userState.trades,
  });
});

app.post("/api/trades/:tradeId/close", requireAuth, (req, res) => {
  const trade = findTradeById(req.userState.trades, req.params.tradeId);
  const orderNote = sanitizeOrderNote(req.body?.orderNote);

  if (!trade) {
    res.status(404).json({ ok: false, error: "unknown_trade" });
    return;
  }

  if (trade.status !== "open") {
    res.status(400).json({ ok: false, error: "trade_already_closed" });
    return;
  }

  const signal =
    trade.assetClass === "market"
      ? latestSignals.find((candidate) => candidate.ticker === trade.marketTicker)
      : null;
  const exitReason = orderNote ? `Manual close: ${orderNote}` : "Manual close";
  closeTrade(trade, exitReason, signal);
  persistStore();

  res.json({
    ok: true,
    trade,
    portfolio: req.userState.trades,
  });
});

app.get("/api/settings", requireAuth, (req, res) => {
  res.json({
    ok: true,
    settings: req.userState.settings,
  });
});

app.put("/api/settings", requireAuth, (req, res) => {
  req.userState.settings = sanitizeSettings({
    ...req.userState.settings,
    ...req.body,
  });
  persistStore();

  res.json({
    ok: true,
    settings: req.userState.settings,
  });
});

app.get("/api/news/targets", requireAuth, (req, res) => {
  res.json({
    ok: true,
    items: req.userState.newsTargets,
  });
});

app.post("/api/news/targets", requireAuth, (req, res) => {
  const target = String(req.body?.target || "").trim();

  if (!target) {
    res.status(400).json({ ok: false, error: "target_required" });
    return;
  }

  req.userState.newsTargets = uniqueStrings([target, ...req.userState.newsTargets]).slice(0, 12);
  persistStore();

  res.status(201).json({
    ok: true,
    items: req.userState.newsTargets,
  });
});

engineTick();
refreshMarketDataOnce().catch((error) => {
  marketDataMeta.lastError = error.message;
});
refreshNewsOnce().catch((error) => {
  newsMeta.lastError = error.message;
});

setInterval(engineTick, ENGINE_TICK_MS);
setInterval(() => {
  refreshMarketDataOnce().catch((error) => {
    marketDataMeta.lastError = error.message;
  });
}, MARKET_REFRESH_MS);
setInterval(() => {
  refreshNewsOnce().catch((error) => {
    newsMeta.lastError = error.message;
  });
}, NEWS_REFRESH_MS);

app.listen(PORT, () => {
  console.log(`Collecttrade API listening on ${PORT}`);
});

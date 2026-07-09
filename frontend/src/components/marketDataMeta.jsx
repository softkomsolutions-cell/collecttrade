import { useMemo } from "react";
import { marketDataService, MARKET_DATA_SOURCES } from "../services/marketDataService";
import { createSetMarketData } from "../models/setMarketData";

function sourceLabelFromBadge(badge) {
  if (!badge) {
    return "Demo Data";
  }
  if (badge.id === MARKET_DATA_SOURCES.DEMO) {
    return "Demo Data";
  }
  return badge.label || badge.id || "Demo Data";
}

/**
 * Small, layout-safe market meta labels for price/value fields.
 * Uses existing marketDataService helpers and gracefully falls back to Demo.
 */
export function MarketDataMeta({ setNumber, source, lastUpdated, className = "" }) {
  const resolved = useMemo(() => {
    try {
      const normalized = String(setNumber || "")
        .replace(/[^0-9]/g, "")
        .slice(0, 6);

      const cacheEntry = normalized ? marketDataService.getCacheEntry(normalized) : null;
      let cacheRecord = null;
      if (cacheEntry?.data) {
        try {
          cacheRecord = createSetMarketData(cacheEntry.data);
        } catch {
          cacheRecord = null;
        }
      }

      const record = cacheRecord || (normalized ? marketDataService.getSetSync(normalized) : null);
      const recordSource = source || record?.source || MARKET_DATA_SOURCES.DEMO;
      const recordUpdated = lastUpdated || record?.lastUpdated || null;
      const badge = marketDataService.getSourceBadge(recordSource) || {
        id: MARKET_DATA_SOURCES.DEMO,
        label: "Demo",
        tone: "demo",
      };

      return {
        badge,
        sourceLabel: sourceLabelFromBadge(badge),
        lastUpdatedLabel: marketDataService.formatLastUpdated(recordUpdated),
      };
    } catch {
      return {
        badge: {
          id: MARKET_DATA_SOURCES.DEMO,
          label: "Demo",
          tone: "demo",
        },
        sourceLabel: "Demo Data",
        lastUpdatedLabel: "Last updated: Never",
      };
    }
  }, [lastUpdated, setNumber, source]);

  const badgeTone = resolved?.badge?.tone || "demo";

  return (
    <span className={`marketDataMetaRow ${className}`.trim()}>
      <span className={`signalMiniTag marketDataSourceTag marketDataSourceTag-${badgeTone}`}>
        {resolved?.sourceLabel || "Demo Data"}
      </span>
      <small className="marketDataLastUpdated">
        {resolved?.lastUpdatedLabel || "Last updated: Never"}
      </small>
    </span>
  );
}


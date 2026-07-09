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
    const normalized = String(setNumber || "")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);

    const cacheEntry = normalized ? marketDataService.getCacheEntry(normalized) : null;
    const cacheRecord = cacheEntry?.data ? createSetMarketData(cacheEntry.data) : null;

    const record = cacheRecord || (normalized ? marketDataService.getSetSync(normalized) : null);
    const recordSource = source || record?.source || MARKET_DATA_SOURCES.DEMO;
    const recordUpdated = lastUpdated || record?.lastUpdated || null;
    const badge = marketDataService.getSourceBadge(recordSource);

    return {
      badge,
      sourceLabel: sourceLabelFromBadge(badge),
      lastUpdatedLabel: marketDataService.formatLastUpdated(recordUpdated),
    };
  }, [lastUpdated, setNumber, source]);

  return (
    <span className={`marketDataMetaRow ${className}`.trim()}>
      <span className={`signalMiniTag marketDataSourceTag marketDataSourceTag-${resolved.badge.tone}`}>
        {resolved.sourceLabel}
      </span>
      <small className="marketDataLastUpdated">{resolved.lastUpdatedLabel}</small>
    </span>
  );
}


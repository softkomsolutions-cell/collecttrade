const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Format an ISO timestamp as a human-relative label.
 * Supports: Today, Yesterday, N hours ago, N minutes ago, or absolute date.
 * @param {string|Date|null|undefined} value
 * @param {Date} [now]
 * @returns {string}
 */
export function formatMarketDataTimestamp(value, now = new Date()) {
  if (!value) {
    return "Never";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "Never";
  }

  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) {
    return "Just now";
  }

  if (diffMs < MS_PER_MINUTE) {
    return "Just now";
  }

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.max(1, Math.round(diffMs / MS_PER_MINUTE));
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  if (diffMs < MS_PER_DAY) {
    const hours = Math.max(1, Math.round(diffMs / MS_PER_HOUR));
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const todayStart = startOfLocalDay(now).getTime();
  const valueStart = startOfLocalDay(parsed).getTime();
  const dayDiff = Math.round((todayStart - valueStart) / MS_PER_DAY);

  if (dayDiff === 0) {
    return "Today";
  }
  if (dayDiff === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

/**
 * @param {string|Date|null|undefined} value
 * @param {Date} [now]
 * @returns {string}
 */
export function formatLastUpdatedLabel(value, now = new Date()) {
  if (!value) {
    return "Last updated: Never";
  }
  return `Last updated: ${formatMarketDataTimestamp(value, now)}`;
}

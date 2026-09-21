/**
 * Formats a timestamp into a human-readable relative "time ago" string.
 * Supports: seconds, minutes, hours, days, weeks, months, years.
 *
 * @param {string | number | Date | null | undefined} timestamp - The date to format.
 * @param {Object} [options]
 * @param {"short" | "long"} [options.style="short"] - "short" (e.g., "5m ago") or "long" (e.g., "5 mins ago")
 * @returns {string | null} Formatted relative time string or null if invalid/empty.
 */
export function formatTimeAgo(timestamp, options = { style: "short" }) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = now - date.getTime();

  // If timestamp is slightly in the future (due to slight server-client clock drift)
  if (diffMs < 5000) {
    return "just now";
  }

  const diffSec = Math.floor(diffMs / 1000);
  const isLong = options.style === "long";

  // Seconds (< 60s)
  if (diffSec < 60) {
    return isLong ? `${diffSec} sec${diffSec === 1 ? "" : "s"} ago` : `${diffSec}s ago`;
  }

  // Minutes (< 60m)
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isLong ? `${diffMin} min${diffMin === 1 ? "" : "s"} ago` : `${diffMin}m ago`;
  }

  // Hours (< 24h)
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return isLong ? `${diffHour} hr${diffHour === 1 ? "" : "s"} ago` : `${diffHour}h ago`;
  }

  // Days (< 7d)
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return isLong ? `${diffDay} day${diffDay === 1 ? "" : "s"} ago` : `${diffDay}d ago`;
  }

  // Weeks (< 30d / ~4.3 weeks)
  const diffWeek = Math.floor(diffDay / 7);
  if (diffDay < 30) {
    return isLong ? `${diffWeek} wk${diffWeek === 1 ? "" : "s"} ago` : `${diffWeek}w ago`;
  }

  // Months (< 365d)
  const diffMonth = Math.floor(diffDay / 30.44);
  if (diffDay < 365) {
    return isLong ? `${diffMonth} mo${diffMonth === 1 ? "" : "s"} ago` : `${diffMonth}mo ago`;
  }

  // Years (>= 365d)
  const diffYear = Math.floor(diffDay / 365.25);
  return isLong ? `${diffYear} yr${diffYear === 1 ? "" : "s"} ago` : `${diffYear}y ago`;
}

/**
 * Returns a clean, human-readable full date and time string for tooltips.
 * e.g., "Monday, 21 Sep 2026 at 1:45 PM"
 *
 * @param {string | number | Date | null | undefined} timestamp
 * @returns {string}
 */
export function formatDetailedDateTime(timestamp) {
  if (!timestamp) return "No activity recorded yet";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Invalid date";

  try {
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return date.toLocaleString();
  }
}

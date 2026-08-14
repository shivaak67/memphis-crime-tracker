/**
 * Shared URL filter parsing for /api/incidents and /api/stats.
 */

export type DateRangeFilters = {
  from: Date | null;
  to: Date | null;
  category: string | null;
};

export type BBoxFilters = {
  minLat: number | null;
  maxLat: number | null;
  minLng: number | null;
  maxLng: number | null;
};

function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  // Accept YYYY-MM-DD or full ISO strings.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) {
      d.setUTCHours(23, 59, 59, 999);
    } else {
      d.setUTCHours(0, 0, 0, 0);
    }
  }
  return d;
}

function parseNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseDateRangeFilters(
  searchParams: URLSearchParams,
): DateRangeFilters {
  return {
    from: parseDate(searchParams.get("from"), false),
    to: parseDate(searchParams.get("to"), true),
    category: searchParams.get("category")?.trim() || null,
  };
}

export function parseBBoxFilters(searchParams: URLSearchParams): BBoxFilters {
  return {
    minLat: parseNumber(searchParams.get("minLat")),
    maxLat: parseNumber(searchParams.get("maxLat")),
    minLng: parseNumber(searchParams.get("minLng")),
    maxLng: parseNumber(searchParams.get("maxLng")),
  };
}

export function parseLimit(
  searchParams: URLSearchParams,
  fallback = 2000,
  max = 5000,
): number {
  const n = parseNumber(searchParams.get("limit"));
  if (n === null || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Default window: last 30 days (keeps map queries light). */
export function defaultFromDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

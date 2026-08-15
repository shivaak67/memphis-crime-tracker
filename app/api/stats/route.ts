import { NextRequest, NextResponse } from "next/server";
import {
  getLastSuccessfulSyncAt,
  getStats,
} from "@/lib/incident-queries";
import { parseDateRangeFilters } from "@/lib/query-params";

/**
 * GET /api/stats
 * Returns aggregations for trend charts and summary cards.
 *
 * Query params:
 * - from, to: YYYY-MM-DD (default from = 30 days ago)
 * - category: optional exact category filter
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseDateRangeFilters(request.nextUrl.searchParams);
    const [stats, lastSyncedAt] = await Promise.all([
      getStats(filters),
      getLastSuccessfulSyncAt(),
    ]);

    return NextResponse.json({
      series: stats.series,
      byCategory: stats.byCategory,
      total: stats.total,
      summary: stats.summary,
      lastSyncedAt,
      filters: {
        from: filters.from?.toISOString() ?? null,
        to: filters.to?.toISOString() ?? null,
        category: filters.category,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause ? String(err.cause) : undefined;
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json(
      { error: message, cause },
      { status },
    );
  }
}

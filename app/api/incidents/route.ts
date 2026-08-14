import { NextRequest, NextResponse } from "next/server";
import { listIncidentsForMap } from "@/lib/incident-queries";
import {
  parseBBoxFilters,
  parseDateRangeFilters,
  parseLimit,
} from "@/lib/query-params";

/**
 * GET /api/incidents
 * Returns filtered incident points for the map.
 *
 * Query params:
 * - from, to: YYYY-MM-DD (default from = 30 days ago)
 * - category: exact category match
 * - minLat, maxLat, minLng, maxLng: map bounding box
 * - limit: max points (default 2000, max 5000)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filters = {
      ...parseDateRangeFilters(searchParams),
      ...parseBBoxFilters(searchParams),
    };
    const limit = parseLimit(searchParams);

    const incidents = await listIncidentsForMap(filters, limit);

    return NextResponse.json({
      incidents,
      count: incidents.length,
      limit,
      filters: {
        from: filters.from?.toISOString() ?? null,
        to: filters.to?.toISOString() ?? null,
        category: filters.category,
        bbox: {
          minLat: filters.minLat,
          maxLat: filters.maxLat,
          minLng: filters.minLng,
          maxLng: filters.maxLng,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

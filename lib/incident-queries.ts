/**
 * Database queries used by the public map and charts APIs.
 */

import { and, asc, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { incidents, syncRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { CategoryCount, Incident, StatsSeriesPoint } from "@/lib/types";
import {
  defaultFromDaysAgo,
  type BBoxFilters,
  type DateRangeFilters,
} from "@/lib/query-params";

function buildIncidentConditions(
  filters: DateRangeFilters & BBoxFilters,
  options?: { requireCoordinates?: boolean },
): SQL[] {
  const from = filters.from ?? defaultFromDaysAgo(30);
  const conditions: SQL[] = [gte(incidents.reportedAt, from)];

  if (filters.to) conditions.push(lte(incidents.reportedAt, filters.to));
  if (filters.category) conditions.push(eq(incidents.category, filters.category));

  if (options?.requireCoordinates) {
    conditions.push(isNotNull(incidents.lat), isNotNull(incidents.lng));
  }

  if (filters.minLat !== null) conditions.push(gte(incidents.lat, filters.minLat));
  if (filters.maxLat !== null) conditions.push(lte(incidents.lat, filters.maxLat));
  if (filters.minLng !== null) conditions.push(gte(incidents.lng, filters.minLng));
  if (filters.maxLng !== null) conditions.push(lte(incidents.lng, filters.maxLng));

  return conditions;
}

export async function listIncidentsForMap(
  filters: DateRangeFilters & BBoxFilters,
  limit: number,
): Promise<Incident[]> {
  const db = getDb();
  const conditions = buildIncidentConditions(filters, {
    requireCoordinates: true,
  });

  const rows = await db
    .select({
      id: incidents.id,
      category: incidents.category,
      crimeType: incidents.crimeType,
      reportedAt: incidents.reportedAt,
      lat: incidents.lat,
      lng: incidents.lng,
    })
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.reportedAt))
    .limit(limit);

  return rows
    .filter(
      (row): row is typeof row & { lat: number; lng: number; reportedAt: Date } =>
        row.lat !== null && row.lng !== null && row.reportedAt !== null,
    )
    .map((row) => ({
      id: row.id,
      category: row.category,
      crimeType: row.crimeType,
      reportedAt: row.reportedAt.toISOString(),
      lat: row.lat,
      lng: row.lng,
    }));
}

export async function getStats(
  filters: DateRangeFilters,
): Promise<{
  series: StatsSeriesPoint[];
  byCategory: CategoryCount[];
  total: number;
}> {
  const db = getDb();
  const conditions = buildIncidentConditions({
    ...filters,
    minLat: null,
    maxLat: null,
    minLng: null,
    maxLng: null,
  });
  const whereClause = and(...conditions);

  const seriesRows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${incidents.reportedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(incidents)
    .where(whereClause)
    .groupBy(sql`date_trunc('day', ${incidents.reportedAt})`)
    .orderBy(asc(sql`date_trunc('day', ${incidents.reportedAt})`));

  const categoryRows = await db
    .select({
      category: sql<string>`coalesce(${incidents.category}, 'UNKNOWN')`,
      count: sql<number>`count(*)::int`,
    })
    .from(incidents)
    .where(whereClause)
    .groupBy(sql`coalesce(${incidents.category}, 'UNKNOWN')`)
    .orderBy(desc(sql`count(*)`));

  const total = categoryRows.reduce((sum, row) => sum + Number(row.count), 0);

  return {
    series: seriesRows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    })),
    byCategory: categoryRows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    })),
    total,
  };
}

export async function getLastSuccessfulSyncAt(): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ finishedAt: syncRuns.finishedAt })
    .from(syncRuns)
    .where(eq(syncRuns.status, "success"))
    .orderBy(desc(syncRuns.finishedAt))
    .limit(1);

  const finishedAt = rows[0]?.finishedAt;
  return finishedAt ? finishedAt.toISOString() : null;
}

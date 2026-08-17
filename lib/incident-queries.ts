/**
 * Database queries used by the public map and charts APIs.
 */

import { and, asc, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { incidents, syncRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { memphisAreaName } from "@/lib/memphis-areas";
import type {
  CategoryCount,
  Incident,
  StatsSeriesPoint,
  StatsSummary,
} from "@/lib/types";
import {
  defaultFromDaysAgo,
  type BBoxFilters,
  type DateRangeFilters,
} from "@/lib/query-params";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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
    .map((row) => {
      const reportedAt = toIso(row.reportedAt);
      if (row.lat === null || row.lng === null || !reportedAt) return null;
      return {
        id: row.id,
        category: row.category,
        crimeType: row.crimeType,
        reportedAt,
        lat: row.lat,
        lng: row.lng,
      };
    })
    .filter((row): row is Incident => row !== null);
}


async function topActivityArea(filters: DateRangeFilters): Promise<string | null> {
  const db = getDb();
  const conditions = buildIncidentConditions(
    {
      ...filters,
      minLat: null,
      maxLat: null,
      minLng: null,
      maxLng: null,
    },
    { requireCoordinates: true },
  );

  // Sample recent points with coords; bucket client-side into Memphis areas.
  const rows = await db
    .select({
      lat: incidents.lat,
      lng: incidents.lng,
    })
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.reportedAt))
    .limit(4000);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue;
    const area = memphisAreaName(Number(row.lat), Number(row.lng));
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [area, count] of counts) {
    if (count > bestCount) {
      best = area;
      bestCount = count;
    }
  }
  return best;
}

export async function getStats(
  filters: DateRangeFilters,
): Promise<{
  series: StatsSeriesPoint[];
  byCategory: CategoryCount[];
  total: number;
  summary: StatsSummary;
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
  const topCategory =
    categoryRows.find((row) => row.category && row.category !== "UNKNOWN")
      ?.category ?? categoryRows[0]?.category ?? null;

  const topArea = await topActivityArea(filters);

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
    summary: {
      total,
      topCategory,
      topArea,
    },
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

  return toIso(rows[0]?.finishedAt);
}

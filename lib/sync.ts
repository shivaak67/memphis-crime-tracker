/**
 * Sync orchestration: pull MPD incidents and upsert into Postgres.
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { fetchAllIncidents, type ArcgisIncident } from "@/lib/arcgis";
import { incidents, syncRuns } from "@/drizzle/schema";

const UPSERT_BATCH = 50;

export type SyncResult = {
  syncRunId: number;
  rowsUpserted: number;
  status: "success" | "failed";
  errorMessage?: string;
  sinceDays: number | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function toRow(incident: ArcgisIncident) {
  return {
    id: incident.id,
    objectId: incident.objectId,
    category: incident.category,
    crimeType: incident.crimeType,
    reportedAt: incident.reportedAt,
    lat: incident.lat,
    lng: incident.lng,
    raw: incident.raw,
    updatedAt: new Date(),
  };
}

async function upsertIncidents(rows: ReturnType<typeof toRow>[]) {
  const db = getDb();
  for (const batch of chunk(rows, UPSERT_BATCH)) {
    await db
      .insert(incidents)
      .values(batch)
      .onConflictDoUpdate({
        target: incidents.id,
        set: {
          objectId: sql`excluded.object_id`,
          category: sql`excluded.category`,
          crimeType: sql`excluded.crime_type`,
          reportedAt: sql`excluded.reported_at`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          raw: sql`excluded.raw`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
}

/**
 * Pull incidents from ArcGIS and save them.
 * @param sinceDays how many days back to pull; null = entire feed (heavy).
 */
export async function syncIncidents(options?: {
  sinceDays?: number | null;
}): Promise<SyncResult> {
  const sinceDays =
    options?.sinceDays === undefined ? 365 : options.sinceDays;
  const sinceMs =
    sinceDays === null
      ? undefined
      : Date.now() - sinceDays * 24 * 60 * 60 * 1000;

  const db = getDb();
  const [run] = await db
    .insert(syncRuns)
    .values({
      startedAt: new Date(),
      status: "running",
    })
    .returning({ id: syncRuns.id });

  try {
    const fetched = await fetchAllIncidents({ sinceMs });
    // Postgres rejects one INSERT that updates the same id twice.
    const byId = new Map<string, ReturnType<typeof toRow>>();
    for (const incident of fetched) {
      byId.set(incident.id, toRow(incident));
    }
    const rows = [...byId.values()];
    await upsertIncidents(rows);

    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        rowsUpserted: rows.length,
        status: "success",
      })
      .where(sql`${syncRuns.id} = ${run.id}`);

    return {
      syncRunId: run.id,
      rowsUpserted: rows.length,
      status: "success",
      sinceDays,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        status: "failed",
        errorMessage: message,
      })
      .where(sql`${syncRuns.id} = ${run.id}`);

    return {
      syncRunId: run.id,
      rowsUpserted: 0,
      status: "failed",
      errorMessage: message,
      sinceDays,
    };
  }
}

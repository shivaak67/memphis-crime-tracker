"use client";

import { useEffect, useMemo, useState } from "react";
import { CrimeMap } from "@/components/map/CrimeMap";
import {
  IncidentFilters,
  type FilterState,
} from "@/components/filters/IncidentFilters";
import { TrendsCharts } from "@/components/trends/TrendsCharts";
import { daysAgoInput, todayInput } from "@/lib/dates";
import type {
  CategoryCount,
  Incident,
  StatsSeriesPoint,
} from "@/lib/types";

type IncidentsResponse = {
  incidents: Incident[];
  error?: string;
};

type StatsResponse = {
  series: StatsSeriesPoint[];
  byCategory: CategoryCount[];
  total: number;
  lastSyncedAt: string | null;
  error?: string;
};

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  return params.toString();
}

export function TrackerApp() {
  const [filters, setFilters] = useState<FilterState>({
    from: daysAgoInput(30),
    to: todayInput(),
    category: "",
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [series, setSeries] = useState<StatsSeriesPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const params = new URLSearchParams();
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        const res = await fetch(`/api/stats?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as StatsResponse;
        const names = (json.byCategory ?? [])
          .map((row) => row.category)
          .filter((name) => name && name !== "UNKNOWN");
        setCategories(names);
      } catch {
        // Keep prior category list if this refresh fails.
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, [filters.from, filters.to]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [incidentsRes, statsRes] = await Promise.all([
          fetch(`/api/incidents?${query}`, { signal: controller.signal }),
          fetch(`/api/stats?${query}`, { signal: controller.signal }),
        ]);

        const incidentsJson = (await incidentsRes.json()) as IncidentsResponse;
        const statsJson = (await statsRes.json()) as StatsResponse;

        if (!incidentsRes.ok) {
          throw new Error(
            incidentsJson.error ??
              "Could not load map incidents. Is the database connected?",
          );
        }
        if (!statsRes.ok) {
          throw new Error(
            statsJson.error ??
              "Could not load trend stats. Is the database connected?",
          );
        }

        setIncidents(incidentsJson.incidents ?? []);
        setSeries(statsJson.series ?? []);
        setByCategory(statsJson.byCategory ?? []);
        setTotal(statsJson.total ?? 0);
        setLastSyncedAt(statsJson.lastSyncedAt ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIncidents([]);
        setSeries([]);
        setByCategory([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [query]);

  return (
    <main>
      <header className="brand-lockup">
        <h1>Memphis Crime Tracker</h1>
        <p>
          Public map and trends from Memphis Police Department incident reports.
          No account needed.
        </p>
      </header>

      <p className="meta-row">
        {lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
          : "Waiting for first data sync"}
        {" · "}
        Showing {incidents.length.toLocaleString()} map points
      </p>

      <IncidentFilters
        value={filters}
        categories={categories}
        onChange={setFilters}
      />

      <CrimeMap incidents={incidents} loading={loading} error={error} />

      <TrendsCharts
        series={series}
        byCategory={byCategory}
        total={total}
        loading={loading}
        error={error}
      />

      <p className="disclaimer">
        Data comes from public MPD incident reports. Counts may change as cases
        are updated, and may not match official FBI or TBI index totals. This
        site is for public awareness, not official statistics.
      </p>
    </main>
  );
}

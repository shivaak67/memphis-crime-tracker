"use client";

import { useEffect, useMemo, useState } from "react";
import { CrimeMap, type MapDisplayMode } from "@/components/map/CrimeMap";
import type { FilterState } from "@/components/filters/IncidentFilters";
import {
  TrackerSidebar,
  type SidebarFilters,
} from "@/components/sidebar/TrackerSidebar";
import { SummaryCards } from "@/components/summary/SummaryCards";
import { TrendsCharts } from "@/components/trends/TrendsCharts";
import { CRIME_GROUPS, crimeGroupIdForCategory } from "@/lib/crime-groups";
import { daysAgoInput, todayInput } from "@/lib/dates";
import type {
  CategoryCount,
  Incident,
  StatsSeriesPoint,
  StatsSummary,
} from "@/lib/types";

type IncidentsResponse = {
  incidents: Incident[];
  error?: string;
};

type StatsResponse = {
  series: StatsSeriesPoint[];
  byCategory: CategoryCount[];
  total: number;
  summary?: StatsSummary;
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

const ALL_GROUPS = CRIME_GROUPS.map((group) => group.id);

export function TrackerApp() {
  const [filters, setFilters] = useState<SidebarFilters>({
    from: daysAgoInput(30),
    to: todayInput(),
    category: "",
    groups: ALL_GROUPS,
  });
  const [mapMode, setMapMode] = useState<MapDisplayMode>("incidents");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [series, setSeries] = useState<StatsSeriesPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      buildQuery({
        from: filters.from,
        to: filters.to,
        category: filters.category,
      }),
    [filters.from, filters.to, filters.category],
  );

  const visibleIncidents = useMemo(() => {
    const allowed = new Set(filters.groups);
    return incidents.filter((incident) =>
      allowed.has(crimeGroupIdForCategory(incident.category)),
    );
  }, [incidents, filters.groups]);

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
        setSummary(statsJson.summary ?? null);
        setLastSyncedAt(statsJson.lastSyncedAt ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIncidents([]);
        setSeries([]);
        setByCategory([]);
        setTotal(0);
        setSummary(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [query]);

  return (
    <main className="app-shell">
      <TrackerSidebar
        filters={filters}
        mapMode={mapMode}
        incidentCount={visibleIncidents.length}
        onFiltersChange={setFilters}
        onMapModeChange={setMapMode}
      />

      <div className="app-stage">
        <p className="meta-row stage-meta">
          {lastSyncedAt
            ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
            : "Waiting for first data sync"}
          {" · "}
          Showing {visibleIncidents.length.toLocaleString()} map points
        </p>

        <SummaryCards summary={summary} loading={loading} />

        <CrimeMap
          incidents={visibleIncidents}
          loading={loading}
          error={error}
          mode={mapMode}
          onModeChange={setMapMode}
          showViewToggle={false}
        />

        <TrendsCharts
          series={series}
          byCategory={byCategory}
          total={total}
          loading={loading}
          error={error}
        />

        <p className="disclaimer">
          Data comes from public MPD incident reports. Counts may change as
          cases are updated, and may not match official FBI or TBI index totals.
          This site is for public awareness, not official statistics.
        </p>
      </div>
    </main>
  );
}

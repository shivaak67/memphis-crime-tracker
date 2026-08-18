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
import { findMemphisPlace } from "@/lib/memphis-places";
import {
  filterIncidentsWithinRadius,
  type SearchFocus,
  type SearchRadiusMiles,
} from "@/lib/location-search";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [series, setSeries] = useState<StatsSeriesPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryCount[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRadiusMiles, setSearchRadiusMiles] =
    useState<SearchRadiusMiles>(2);
  const [searchFocus, setSearchFocus] = useState<SearchFocus | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const mapIncidents = useMemo(() => {
    if (!searchFocus) return visibleIncidents;
    return filterIncidentsWithinRadius(visibleIncidents, searchFocus);
  }, [visibleIncidents, searchFocus]);

  const runLocationSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const preset = findMemphisPlace(query);
      if (preset) {
        setSearchFocus({
          lat: preset.lat,
          lng: preset.lng,
          radiusMiles: searchRadiusMiles,
          label: preset.label,
        });
        return;
      }

      const res = await fetch(`/api/geocode?${new URLSearchParams({ q: query })}`);
      const json = (await res.json()) as {
        lat?: number;
        lng?: number;
        label?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? "Could not find that location.");
      }

      if (
        typeof json.lat !== "number" ||
        typeof json.lng !== "number" ||
        !json.label
      ) {
        throw new Error("Could not find that location.");
      }

      setSearchFocus({
        lat: json.lat,
        lng: json.lng,
        radiusMiles: searchRadiusMiles,
        label: json.label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSearchError(message);
      setSearchFocus(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearLocationSearch = () => {
    setSearchQuery("");
    setSearchFocus(null);
    setSearchError(null);
  };

  useEffect(() => {
    if (!searchFocus) return;
    setSearchFocus((current) =>
      current ? { ...current, radiusMiles: searchRadiusMiles } : null,
    );
  }, [searchRadiusMiles]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadIncidents() {
      setIncidentsLoading(true);
      setMapError(null);

      try {
        const res = await fetch(`/api/incidents?${query}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as IncidentsResponse;

        if (!res.ok) {
          throw new Error(
            json.error ??
              "Could not load map incidents. Is the database connected?",
          );
        }

        setIncidents(json.incidents ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setMapError(message);
        setIncidents([]);
      } finally {
        if (!controller.signal.aborted) setIncidentsLoading(false);
      }
    }

    async function loadStats() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const res = await fetch(`/api/stats?${query}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as StatsResponse;

        if (!res.ok) {
          throw new Error(
            json.error ??
              "Could not load trend stats. Is the database connected?",
          );
        }

        setSeries(json.series ?? []);
        setByCategory(json.byCategory ?? []);
        setTotal(json.total ?? 0);
        setSummary(json.summary ?? null);
        setLastSyncedAt(json.lastSyncedAt ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatsError(message);
        setSeries([]);
        setByCategory([]);
        setTotal(0);
        setSummary(null);
      } finally {
        if (!controller.signal.aborted) setStatsLoading(false);
      }
    }

    void loadIncidents();
    void loadStats();
    return () => controller.abort();
  }, [query]);

  return (
    <main className={"app-shell" + (sidebarCollapsed ? " is-sidebar-collapsed" : "")}>
      <TrackerSidebar
        filters={filters}
        mapMode={mapMode}
        incidentCount={mapIncidents.length}
        searchQuery={searchQuery}
        searchRadiusMiles={searchRadiusMiles}
        searchLoading={searchLoading}
        searchError={searchError}
        activeSearchLabel={searchFocus?.label ?? null}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onFiltersChange={setFilters}
        onMapModeChange={setMapMode}
        onSearchQueryChange={setSearchQuery}
        onSearchRadiusChange={setSearchRadiusMiles}
        onSearchSubmit={() => void runLocationSearch()}
        onSearchClear={clearLocationSearch}
      />

      <div className="app-stage">
        <p className="meta-row stage-meta">
          {lastSyncedAt
            ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
            : "Waiting for first data sync"}
          {" · "}
          Showing {mapIncidents.length.toLocaleString()} map points
          {searchFocus
            ? ` within ${searchRadiusMiles} mi of ${searchFocus.label}`
            : ""}
        </p>

        <SummaryCards summary={summary} loading={statsLoading} />

        <CrimeMap
          incidents={mapIncidents}
          loading={incidentsLoading}
          error={mapError}
          mode={mapMode}
          searchFocus={searchFocus}
          onModeChange={setMapMode}
          showViewToggle={false}
        />

        <TrendsCharts
          series={series}
          byCategory={byCategory}
          total={total}
          loading={statsLoading}
          error={statsError}
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

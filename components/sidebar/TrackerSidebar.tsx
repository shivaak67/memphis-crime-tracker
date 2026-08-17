"use client";

import { CRIME_GROUPS, type CrimeGroupId } from "@/lib/crime-groups";
import type { MapDisplayMode } from "@/components/map/CrimeMap";
import type { FilterState } from "@/components/filters/IncidentFilters";
import {
  SEARCH_RADIUS_OPTIONS,
  type SearchRadiusMiles,
} from "@/lib/location-search";

/**
 * App sidebar: filters + map display, so the map can own most of the screen.
 */

export type SidebarFilters = FilterState & {
  groups: CrimeGroupId[];
};

type Props = {
  filters: SidebarFilters;
  mapMode: MapDisplayMode;
  incidentCount: number;
  searchQuery: string;
  searchRadiusMiles: SearchRadiusMiles;
  searchLoading: boolean;
  searchError: string | null;
  activeSearchLabel: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onFiltersChange: (next: SidebarFilters) => void;
  onMapModeChange: (mode: MapDisplayMode) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchRadiusChange: (miles: SearchRadiusMiles) => void;
  onSearchSubmit: () => void;
  onSearchClear: () => void;
};

function formatRangeLabel(from: string, to: string): string {
  const fmt = (value: string) => {
    if (!value) return "—";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  return `${fmt(from)} — ${fmt(to)}`;
}

export function TrackerSidebar({
  filters,
  mapMode,
  incidentCount,
  searchQuery,
  searchRadiusMiles,
  searchLoading,
  searchError,
  activeSearchLabel,
  collapsed,
  onCollapsedChange,
  onFiltersChange,
  onMapModeChange,
  onSearchQueryChange,
  onSearchRadiusChange,
  onSearchSubmit,
  onSearchClear,
}: Props) {
  const toggleGroup = (id: CrimeGroupId) => {
    const selected = new Set(filters.groups);
    if (selected.has(id)) {
      if (selected.size === 1) return; // keep at least one group on
      selected.delete(id);
    } else {
      selected.add(id);
    }
    onFiltersChange({ ...filters, groups: Array.from(selected) });
  };

  return (
    <aside
      className={"app-sidebar" + (collapsed ? " is-collapsed" : "")}
      aria-label="Filters and map controls"
    >
      <div className="sidebar-top">
        {!collapsed ? (
          <div className="sidebar-brand">
            <h1>Memphis Crime Tracker</h1>
          </div>
        ) : (
          <p className="sidebar-collapsed-title" aria-hidden>
            MCT
          </p>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          aria-expanded={!collapsed}
          aria-controls="sidebar-panel"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <span className="sr-only">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
          <span aria-hidden>{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      <div id="sidebar-panel" className="sidebar-panel" hidden={collapsed}>
        <div className="sidebar-section sidebar-search-section">
          <p className="sidebar-section-label">Location</p>
          <form
            className="sidebar-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
          >
            <label className="sidebar-search">
              <span className="sr-only">Search neighborhood, ZIP, or address</span>
              <input
                type="search"
                value={searchQuery}
                placeholder="Neighborhood, ZIP, or address"
                disabled={searchLoading}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
            </label>
            <label className="sidebar-radius">
              Radius
              <select
                value={searchRadiusMiles}
                disabled={searchLoading}
                onChange={(e) =>
                  onSearchRadiusChange(Number(e.target.value) as SearchRadiusMiles)
                }
              >
                {SEARCH_RADIUS_OPTIONS.map((miles) => (
                  <option key={miles} value={miles}>
                    {miles} mi
                  </option>
                ))}
              </select>
            </label>
            <div className="sidebar-search-actions">
              <button type="submit" disabled={searchLoading || !searchQuery.trim()}>
                {searchLoading ? "Searching…" : "Search"}
              </button>
              {activeSearchLabel ? (
                <button type="button" className="sidebar-clear-btn" onClick={onSearchClear}>
                  Clear
                </button>
              ) : null}
            </div>
          </form>
          {activeSearchLabel ? (
            <p className="sidebar-search-active">
              Showing incidents within {searchRadiusMiles} mi of{" "}
              <strong>{activeSearchLabel}</strong>
            </p>
          ) : null}
          {searchError ? (
            <p className="sidebar-search-error" role="alert">
              {searchError}
            </p>
          ) : null}
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">Date range</p>
          <p className="sidebar-range-label">
            {formatRangeLabel(filters.from, filters.to)}
          </p>
          <div className="sidebar-date-inputs">
            <label>
              From
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  onFiltersChange({ ...filters, from: e.target.value })
                }
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  onFiltersChange({ ...filters, to: e.target.value })
                }
              />
            </label>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">Crime type</p>
          <ul className="sidebar-checkboxes">
            {CRIME_GROUPS.map((group) => {
              const checked = filters.groups.includes(group.id);
              return (
                <li key={group.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(group.id)}
                    />
                    <span
                      className="sidebar-swatch"
                      style={{ background: group.color }}
                      aria-hidden
                    />
                    {group.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">Map display</p>
          <div
            className="sidebar-radio"
            role="radiogroup"
            aria-label="Map display"
          >
            <label className={mapMode === "incidents" ? "is-active" : undefined}>
              <input
                type="radio"
                name="map-display"
                checked={mapMode === "incidents"}
                onChange={() => onMapModeChange("incidents")}
              />
              Incidents
            </label>
            <label className={mapMode === "heatmap" ? "is-active" : undefined}>
              <input
                type="radio"
                name="map-display"
                checked={mapMode === "heatmap"}
                onChange={() => onMapModeChange("heatmap")}
              />
              Heatmap
            </label>
          </div>
        </div>

        <p className="sidebar-count">
          {incidentCount.toLocaleString()} incidents found
        </p>
      </div>
    </aside>
  );
}

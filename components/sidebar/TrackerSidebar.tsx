"use client";

import { CRIME_GROUPS, type CrimeGroupId } from "@/lib/crime-groups";
import type { MapDisplayMode } from "@/components/map/CrimeMap";
import type { FilterState } from "@/components/filters/IncidentFilters";

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
  onFiltersChange: (next: SidebarFilters) => void;
  onMapModeChange: (mode: MapDisplayMode) => void;
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
  onFiltersChange,
  onMapModeChange,
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
    <aside className="app-sidebar" aria-label="Filters and map controls">
      <div className="sidebar-brand">
        <h1>Memphis Crime Tracker</h1>
      </div>

      <label className="sidebar-search">
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Search an address or area"
          disabled
          aria-disabled="true"
          title="Location search comes in the next feature"
        />
      </label>

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
        <div className="sidebar-radio" role="radiogroup" aria-label="Map display">
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
    </aside>
  );
}

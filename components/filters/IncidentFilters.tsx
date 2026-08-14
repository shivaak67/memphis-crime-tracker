"use client";

/**
 * Shared filter controls for map + trends (date range, crime category).
 */

export type FilterState = {
  from: string;
  to: string;
  category: string;
};

type Props = {
  value: FilterState;
  categories: string[];
  onChange: (next: FilterState) => void;
};

export function IncidentFilters({ value, categories, onChange }: Props) {
  return (
    <section className="filters" aria-label="Incident filters">
      <label>
        From
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <label>
        To
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>
      <label>
        Category
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

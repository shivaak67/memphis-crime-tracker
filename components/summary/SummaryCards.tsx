"use client";

import { titleCaseCategory } from "@/lib/format";
import type { StatsSummary } from "@/lib/types";

/**
 * High-level summary strip between filters and the map.
 */

type Props = {
  summary: StatsSummary | null;
  loading: boolean;
};

export function SummaryCards({ summary, loading }: Props) {
  const items = [
    {
      label: "Total incidents",
      value: loading ? "…" : (summary?.total ?? 0).toLocaleString(),
    },
    {
      label: "Most common crime",
      value: loading ? "…" : titleCaseCategory(summary?.topCategory ?? null),
    },
    {
      label: "Highest activity area",
      value: loading ? "…" : summary?.topArea ?? "—",
    },
  ] as const;

  return (
    <section className="summary-cards" aria-label="Incident summary">
      {items.map((item) => (
        <div key={item.label} className="summary-card">
          <p className="summary-card-label">{item.label}</p>
          <p className="summary-card-value">{item.value}</p>
        </div>
      ))}
    </section>
  );
}

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

function formatChange(summary: StatsSummary | null): {
  label: string;
  tone: "up" | "down" | "flat" | "muted";
} {
  if (!summary) {
    return { label: "—", tone: "muted" };
  }
  if (summary.changePercent == null) {
    return {
      label: summary.previousTotal === 0 ? "No prior data" : "—",
      tone: "muted",
    };
  }
  const pct = summary.changePercent;
  if (Math.abs(pct) < 0.05) {
    return { label: "No change vs previous period", tone: "flat" };
  }
  if (pct < 0) {
    const n = Math.abs(pct);
    const shown = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
    return {
      label: `↓ ${shown}% vs previous period`,
      tone: "down",
    };
  }
  const shown = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  return {
    label: `↑ ${shown}% vs previous period`,
    tone: "up",
  };
}

export function SummaryCards({ summary, loading }: Props) {
  const change = formatChange(summary);

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
    {
      label: "Change",
      value: loading ? "…" : change.label,
      tone: change.tone,
    },
  ] as const;

  return (
    <section className="summary-cards" aria-label="Incident summary">
      {items.map((item) => (
        <div key={item.label} className="summary-card">
          <p className="summary-card-label">{item.label}</p>
          <p
            className={
              "summary-card-value" +
              ("tone" in item && item.tone ? ` is-${item.tone}` : "")
            }
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryCount, StatsSeriesPoint } from "@/lib/types";

/**
 * Trend charts section (Recharts).
 */

type Props = {
  series: StatsSeriesPoint[];
  byCategory: CategoryCount[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function TrendsCharts({
  series,
  byCategory,
  total,
  loading,
  error,
}: Props) {
  const topCategories = byCategory.slice(0, 10);

  return (
    <section className="trends" aria-label="Crime trends">
      <h2>Trends</h2>
      <p className="lede">
        {loading
          ? "Loading chart data…"
          : error
            ? error
            : `${total.toLocaleString()} incidents in this window.`}
      </p>

      <div className="chart-grid">
        <div className="chart-panel">
          <h3>Daily incidents</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid stroke="rgba(215,224,234,0.12)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8fa0b2", fontSize: 11 }}
                minTickGap={28}
              />
              <YAxis tick={{ fill: "#8fa0b2", fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: "#15202b",
                  border: "1px solid rgba(215,224,234,0.2)",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#e0a045"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <h3>Top categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topCategories} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid stroke="rgba(215,224,234,0.12)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#8fa0b2", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fill: "#8fa0b2", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#15202b",
                  border: "1px solid rgba(215,224,234,0.2)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" fill="#7eb6ff" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

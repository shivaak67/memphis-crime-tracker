/**
 * Shared TypeScript types for API responses and UI props.
 * Plain shapes the website and APIs agree on (separate from DB tables).
 */

export type Incident = {
  id: string;
  category: string | null;
  crimeType: string | null;
  reportedAt: string;
  lat: number;
  lng: number;
};

export type StatsSeriesPoint = {
  date: string;
  count: number;
};

export type CategoryCount = {
  category: string;
  count: number;
};

export type StatsSummary = {
  total: number;
  topCategory: string | null;
  topArea: string | null;
};;

export type SyncStatus = "running" | "success" | "failed";

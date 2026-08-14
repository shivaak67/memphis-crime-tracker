/**
 * MPD ArcGIS FeatureServer client.
 * Downloads Memphis Police public safety incidents in pages (max 1000 each).
 */

export const MPD_INCIDENTS_URL =
  "https://services2.arcgis.com/saWmpKJIUAjyyNVc/arcgis/rest/services/MPD_Public_Safety_Incidents/FeatureServer/0";

const PAGE_SIZE = 1000;

export type ArcgisIncident = {
  id: string;
  objectId: number | null;
  category: string | null;
  crimeType: string | null;
  reportedAt: Date | null;
  lat: number | null;
  lng: number | null;
  raw: Record<string, unknown>;
};

type ArcgisFeature = {
  attributes: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
};

type ArcgisQueryResponse = {
  features?: ArcgisFeature[];
  exceededTransferLimit?: boolean;
  error?: { message?: string };
};

function asString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  const n = asNumber(value);
  if (n === null) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapFeature(feature: ArcgisFeature): ArcgisIncident | null {
  const a = feature.attributes;
  const crimeId = asString(a.Crime_ID);
  const objectId = asNumber(a.ObjectId) ?? asNumber(a.OBJECTID);
  const id = crimeId ?? (objectId !== null ? `object-${objectId}` : null);
  if (!id) return null;

  const lat =
    asNumber(a.Latitude) ??
    asNumber(feature.geometry?.y) ??
    null;
  const lng =
    asNumber(a.Longitude) ??
    asNumber(feature.geometry?.x) ??
    null;

  return {
    id,
    objectId,
    category: asString(a.UCR_Category),
    crimeType: asString(a.NIBRS_Offense_Group) ?? asString(a.UCR_Description),
    reportedAt: asDate(a.Reported_Datetime) ?? asDate(a.Offense_Datetime),
    lat,
    lng,
    raw: a,
  };
}

function toDateLiteral(sinceMs: number): string {
  const d = new Date(sinceMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildWhere(sinceMs?: number): string {
  if (sinceMs === undefined) return "1=1";
  // ArcGIS rejects raw epoch comparisons on this layer; use DATE 'YYYY-MM-DD'.
  return `Reported_Datetime >= DATE '${toDateLiteral(sinceMs)}'`;
}

/** Fetch one page of incidents from the City of Memphis ArcGIS feed. */
export async function fetchIncidentsPage(options: {
  offset: number;
  sinceMs?: number;
  pageSize?: number;
}): Promise<{ incidents: ArcgisIncident[]; gotFullPage: boolean }> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const params = new URLSearchParams({
    where: buildWhere(options.sinceMs),
    outFields: "*",
    f: "json",
    outSR: "4326",
    resultOffset: String(options.offset),
    resultRecordCount: String(pageSize),
    orderByFields: "ObjectId ASC",
  });

  const res = await fetch(`${MPD_INCIDENTS_URL}/query?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`ArcGIS request failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as ArcgisQueryResponse;
  if (data.error?.message) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  const features = data.features ?? [];
  const incidents = features
    .map(mapFeature)
    .filter((row): row is ArcgisIncident => row !== null);

  return {
    incidents,
    gotFullPage: features.length >= pageSize || Boolean(data.exceededTransferLimit),
  };
}

/** Walk every page until the feed is exhausted. */
export async function fetchAllIncidents(options?: {
  sinceMs?: number;
  onPage?: (info: { offset: number; count: number }) => void;
}): Promise<ArcgisIncident[]> {
  const all: ArcgisIncident[] = [];
  let offset = 0;

  for (;;) {
    const { incidents, gotFullPage } = await fetchIncidentsPage({
      offset,
      sinceMs: options?.sinceMs,
    });
    all.push(...incidents);
    options?.onPage?.({ offset, count: incidents.length });

    if (incidents.length === 0 || !gotFullPage) break;
    offset += PAGE_SIZE;
  }

  return all;
}

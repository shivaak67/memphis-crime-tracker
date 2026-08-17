import type { Incident } from "@/lib/types";

/** Map focus after a successful location search. */
export type SearchFocus = {
  lat: number;
  lng: number;
  radiusMiles: number;
  label: string;
};

export const SEARCH_RADIUS_OPTIONS = [1, 2, 5] as const;
export type SearchRadiusMiles = (typeof SEARCH_RADIUS_OPTIONS)[number];

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles between two WGS84 points. */
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export function filterIncidentsWithinRadius(
  incidents: Incident[],
  focus: SearchFocus,
): Incident[] {
  const { lat, lng, radiusMiles } = focus;
  return incidents.filter((incident) => {
    const iLat = Number(incident.lat);
    const iLng = Number(incident.lng);
    if (!Number.isFinite(iLat) || !Number.isFinite(iLng)) return false;
    return distanceMiles(lat, lng, iLat, iLng) <= radiusMiles;
  });
}

/** Approximate on-screen radius in pixels for a mile radius at a given latitude. */
export function radiusPixels(
  project: (lngLat: [number, number]) => { x: number; y: number },
  lat: number,
  lng: number,
  radiusMiles: number,
): number {
  const milesPerDegreeLng =
    69 * Math.cos((lat * Math.PI) / 180) || 69 * 0.75;
  const edgeLng = lng + radiusMiles / milesPerDegreeLng;
  const center = project([lng, lat]);
  const edge = project([edgeLng, lat]);
  return Math.hypot(edge.x - center.x, edge.y - center.y);
}

export function zoomForRadiusMiles(radiusMiles: number): number {
  if (radiusMiles <= 1) return 13.4;
  if (radiusMiles <= 2) return 12.6;
  return 11.4;
}

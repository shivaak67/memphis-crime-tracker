/**
 * Rough Memphis-area labels from lat/lng (no neighborhood table yet).
 * Good enough for a "highest activity area" summary until we sync Ward/Precinct.
 */

export function memphisAreaName(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Unknown";

  // West of the Mississippi
  if (lng < -90.07) return "West Memphis";

  if (lat >= 35.2) {
    if (lng >= -89.9) return "Bartlett / Cordova";
    return "North Memphis / Frayser";
  }

  if (lat <= 35.05) {
    if (lng >= -89.95) return "Southeast Memphis";
    return "South Memphis / Whitehaven";
  }

  if (lng >= -89.85) return "Cordova / East";
  if (lng >= -89.92) return "East Memphis / Germantown";

  if (lng <= -90.04 && lat >= 35.12 && lat <= 35.17) {
    return "Downtown";
  }

  if (lng > -90.04 && lng < -89.97 && lat >= 35.11 && lat <= 35.17) {
    return "Midtown";
  }

  if (lng < -90.02) return "Downtown / Riverside";
  return "Central Memphis";
}

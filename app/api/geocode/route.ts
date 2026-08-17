import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?q=...
 * Proxy Nominatim geocoding scoped to the Memphis metro area.
 */

const MEMPHIS_VIEWBOX = {
  minLng: -90.35,
  minLat: 34.9,
  maxLng: -89.6,
  maxLat: 35.4,
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: `${q}, Memphis, TN`,
    format: "json",
    limit: "5",
    countrycodes: "us",
    viewbox: [
      MEMPHIS_VIEWBOX.minLng,
      MEMPHIS_VIEWBOX.maxLat,
      MEMPHIS_VIEWBOX.maxLng,
      MEMPHIS_VIEWBOX.minLat,
    ].join(","),
    bounded: "1",
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MemphisCrimeTracker/1.0 (community map; contact via GitHub)",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable." },
        { status: 502 },
      );
    }

    const results = (await res.json()) as NominatimResult[];
    const hit = results[0];
    if (!hit) {
      return NextResponse.json(
        { error: "No matching location in the Memphis area." },
        { status: 404 },
      );
    }

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Invalid geocoding response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      lat,
      lng,
      label: hit.display_name.split(",").slice(0, 2).join(",").trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

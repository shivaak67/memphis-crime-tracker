/**
 * Preset Memphis neighborhoods, landmarks, and ZIP centroids for instant search.
 * Geocoding falls back to /api/geocode when nothing matches here.
 */

export type MemphisPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
};

export const MEMPHIS_PLACES: MemphisPlace[] = [
  {
    id: "downtown",
    label: "Downtown Memphis",
    lat: 35.1495,
    lng: -90.049,
    aliases: ["downtown", "beale street", "beale", "fedexforum", "fedex forum"],
  },
  {
    id: "midtown",
    label: "Midtown Memphis",
    lat: 35.138,
    lng: -89.977,
    aliases: ["midtown", "cooper young", "cooper-young", "overton square"],
  },
  {
    id: "uofm",
    label: "University of Memphis",
    lat: 35.118,
    lng: -89.937,
    aliases: ["university of memphis", "uofm", "u of m", "tigers"],
  },
  {
    id: "whitehaven",
    label: "Whitehaven",
    lat: 35.048,
    lng: -90.004,
    aliases: ["whitehaven", "graceland"],
  },
  {
    id: "frayser",
    label: "Frayser",
    lat: 35.214,
    lng: -89.987,
    aliases: ["frayser", "north memphis"],
  },
  {
    id: "germantown",
    label: "Germantown",
    lat: 35.086,
    lng: -89.81,
    aliases: ["germantown"],
  },
  {
    id: "bartlett",
    label: "Bartlett",
    lat: 35.204,
    lng: -89.874,
    aliases: ["bartlett"],
  },
  {
    id: "cordova",
    label: "Cordova",
    lat: 35.156,
    lng: -89.773,
    aliases: ["cordova", "east memphis"],
  },
  {
    id: "south-memphis",
    label: "South Memphis",
    lat: 35.078,
    lng: -90.045,
    aliases: ["south memphis", "orange mound"],
  },
  {
    id: "38103",
    label: "38103 (Downtown)",
    lat: 35.146,
    lng: -90.051,
    aliases: ["38103"],
  },
  {
    id: "38104",
    label: "38104 (Midtown)",
    lat: 35.129,
    lng: -89.977,
    aliases: ["38104"],
  },
  {
    id: "38111",
    label: "38111 (University District)",
    lat: 35.108,
    lng: -89.937,
    aliases: ["38111"],
  },
  {
    id: "38117",
    label: "38117 (East Memphis)",
    lat: 35.108,
    lng: -89.895,
    aliases: ["38117"],
  },
  {
    id: "38122",
    label: "38122 (Berclair)",
    lat: 35.168,
    lng: -89.945,
    aliases: ["38122"],
  },
  {
    id: "38128",
    label: "38128 (Raleigh)",
    lat: 35.212,
    lng: -89.972,
    aliases: ["38128"],
  },
  {
    id: "38134",
    label: "38134 (Bartlett area)",
    lat: 35.196,
    lng: -89.865,
    aliases: ["38134"],
  },
  {
    id: "38138",
    label: "38138 (Germantown area)",
    lat: 35.062,
    lng: -89.794,
    aliases: ["38138"],
  },
];

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match a preset place by name, alias, or ZIP. */
export function findMemphisPlace(query: string): MemphisPlace | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  for (const place of MEMPHIS_PLACES) {
    if (normalizeQuery(place.label) === q) return place;
    if (place.aliases.some((alias) => normalizeQuery(alias) === q)) return place;
  }

  for (const place of MEMPHIS_PLACES) {
    if (normalizeQuery(place.label).includes(q)) return place;
    if (place.aliases.some((alias) => alias.includes(q) || q.includes(alias))) {
      return place;
    }
  }

  return null;
}

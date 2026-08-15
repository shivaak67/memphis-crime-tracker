/**
 * Buckets MPD UCR categories into a few map legend groups.
 */

export type CrimeGroupId =
  | "violent"
  | "theft"
  | "burglary"
  | "vehicle"
  | "other";

export type CrimeGroup = {
  id: CrimeGroupId;
  label: string;
  /** Core fill for markers */
  color: string;
  /** Glow rgba channels */
  rgb: [number, number, number];
};

export const CRIME_GROUPS: CrimeGroup[] = [
  { id: "violent", label: "Violent crime", color: "#ff3b3b", rgb: [255, 59, 59] },
  { id: "theft", label: "Theft", color: "#f08a24", rgb: [240, 138, 36] },
  { id: "burglary", label: "Burglary", color: "#9b6bff", rgb: [155, 107, 255] },
  { id: "vehicle", label: "Vehicle crime", color: "#4da3ff", rgb: [77, 163, 255] },
  { id: "other", label: "Other", color: "#e6c84a", rgb: [230, 200, 74] },
];

const BY_ID = Object.fromEntries(
  CRIME_GROUPS.map((group) => [group.id, group]),
) as Record<CrimeGroupId, CrimeGroup>;

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function crimeGroupIdForCategory(category: string | null | undefined): CrimeGroupId {
  const value = (category ?? "").toUpperCase();

  if (
    includesAny(value, [
      "ASSAULT",
      "HOMICIDE",
      "MURDER",
      "ROBBERY",
      "RAPE",
      "SEX",
      "KIDNAP",
      "HUMAN TRAFFICKING",
    ])
  ) {
    return "violent";
  }

  if (
    includesAny(value, [
      "MOTOR VEHICLE",
      "VEHICLE THEFT",
      "AUTO THEFT",
      "STOLEN VEHICLE",
    ])
  ) {
    return "vehicle";
  }

  if (includesAny(value, ["BURG", "BREAK & ENTER", "BREAK AND ENTER"])) {
    return "burglary";
  }

  if (
    includesAny(value, [
      "LARCENY",
      "THEFT",
      "FRAUD",
      "FORGERY",
      "EMBEZZLE",
      "STOLEN PROPERTY",
      "SHOPLIFT",
    ])
  ) {
    return "theft";
  }

  return "other";
}

export function crimeGroupForCategory(category: string | null | undefined): CrimeGroup {
  return BY_ID[crimeGroupIdForCategory(category)];
}

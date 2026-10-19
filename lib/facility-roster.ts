// Jamii Tekelezi (JTP) facility roster helpers.
//
// Source: "Jamii Tekelezi Facilities.docx" supplied by the client. Parsed into
// data/jamii-tekelezi-facilities.json (200 facilities / 4 counties / 27
// sub-counties). County/Sub-County/Facility dropdowns in forms use these
// helpers so a chosen county (and sub-county) drives the facility list.
import roster from "@/data/jamii-tekelezi-facilities.json";

export interface FacilitySubCounty {
  subCounty: string;
  facilities: string[];
}

export interface FacilityCounty {
  county: string;
  subCounties: FacilitySubCounty[];
}

export interface FacilityRoster {
  name: string;
  counties: FacilityCounty[];
}

const ROSTER = roster as FacilityRoster;

/** All counties in the Jamii Tekelezi roster (sorted). */
export function rosterCounties(): string[] {
  return ROSTER.counties.map((c) => c.county).sort();
}

/** Every facility in the roster across all counties (sorted, unique). */
export function rosterAllFacilities(): string[] {
  return Array.from(
    new Set(
      ROSTER.counties.flatMap((c) =>
        c.subCounties.flatMap((s) => s.facilities),
      ),
    ),
  ).sort();
}

/** Sub-counties for a county (sorted). Empty array if county unknown. */
export function rosterSubCounties(county?: string): string[] {
  if (!county) return [];
  const c = ROSTER.counties.find(
    (c) => c.county.toLowerCase() === county.toLowerCase(),
  );
  if (!c) return [];
  return c.subCounties.map((s) => s.subCounty).sort();
}

/**
 * Facilities for a county. If `subCounty` is given it is restricted to that
 * sub-county; otherwise every facility in the county is returned (sorted).
 */
export function rosterFacilities(
  county?: string,
  subCounty?: string,
): string[] {
  if (!county) return [];
  const c = ROSTER.counties.find(
    (c) => c.county.toLowerCase() === county.toLowerCase(),
  );
  if (!c) return [];
  if (subCounty) {
    const s = c.subCounties.find(
      (s) => s.subCounty.toLowerCase() === subCounty.toLowerCase(),
    );
    return s ? [...s.facilities].sort() : [];
  }
  return c.subCounties.flatMap((s) => s.facilities).sort();
}

/** True when the given county exists in the roster. */
export function rosterHasCounty(county?: string): boolean {
  return ROSTER.counties.some(
    (c) => c.county.toLowerCase() === (county || "").toLowerCase(),
  );
}

/** True when the given sub-county exists under the given county. */
export function rosterHasSubCounty(
  county: string,
  subCounty?: string,
): boolean {
  return rosterSubCounties(county).some(
    (s) => s.toLowerCase() === (subCounty || "").toLowerCase(),
  );
}

export default ROSTER;

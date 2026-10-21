/**
 * Shared HR dropdown option lists.
 *
 * Kept in one place so the Add New Worker form, the Transfers modal and any
 * other HR form always offer exactly the same choices.
 */

// Staff category captured at intake.
export const CATEGORIES = ["CHAK", "HRH", "CBSL"];

/**
 * The master workbook (UJTP HRH Master Database) has no category column, so
 * every record it contains is treated as HRH. Workers captured through this
 * app carry an explicit category; anything untagged therefore falls back to
 * HRH. Change this constant if the source data ever gets a real category.
 */
export const DEFAULT_CATEGORY = "HRH";

/** Coerce any stored value into one of CATEGORIES (falls back to HRH). */
export function normalizeCategory(value?: string | null): string {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();
  return CATEGORIES.includes(v) ? v : DEFAULT_CATEGORY;
}

/**
 * True when `record` belongs to the requested category filter.
 * `filter` of "all"/empty matches everything.
 */
export function matchesCategory(
  record: { category?: string } | null | undefined,
  filter?: string | null,
): boolean {
  if (!filter || filter.toLowerCase() === "all") return true;
  return normalizeCategory(record?.category) === normalizeCategory(filter);
}

// "Contract type" — previously labelled "Employment Type" in the UI.
export const CONTRACT_TYPES = ["Contract", "Casual Laborer", "Internship"];

// Program / donor project the worker is attached to.
export const PROJECTS = [
  "Daraja",
  "Eye Health (ACSP)",
  "GitLab",
  "Gates Foundation MNCH",
  "BFTW RMNCAH",
  "EIS",
  "PEP",
  "IMPACT Project",
  "CDIC / iCARE",
  "Internship Program",
];

// CHAK staff are attached to an office (workstation) instead of the
// county -> sub-county -> facility chain used by HRH / CBSL staff.
export const WORKSTATIONS = [
  "HQ",
  "Meru Office",
  "Kitui Office",
  "Embu Office",
  "Tharaka Nithi Office",
];

// Highest academic level attained.
export const EDUCATION_LEVELS = [
  "PhD",
  "Masters",
  "Postgraduate Diploma",
  "Degree",
  "Higher National Diploma",
  "Diploma",
  "Certificate",
  "Secondary (KCSE)",
  "Primary (KCPE)",
  "Other",
];

// Professional councils / boards seen in the master workbook, plus the common
// Kenyan health-sector regulators that may not yet appear in the data.
export const REGULATORY_BODIES = [
  "Clinical Officers Council (COC)",
  "Health Records and Information Managers Board",
  "Kenya Association of Record Managers & Archivists",
  "Kenya Medical Laboratory Technicians & Technologists Board (KMLTTB)",
  "Kenya Medical Practitioners and Dentists Council (KMPDC)",
  "Kenya Nutritionists and Dieticians Institute (KNDI)",
  "Nursing Council of Kenya (NCK)",
  "Pharmacy & Poisons Board (PPB)",
  "Kenya Counselling and Psychological Association (KCPA)",
  "Public Health Officers and Technicians Council (PHOTC)",
  "None",
  "Other",
];

/**
 * Combine bodies added by HR (via the Reg Bodies page) with the built-in list.
 * Custom entries come first so a newly added council is easy to pick in a
 * dropdown, and duplicates are dropped case-insensitively so a name that
 * already exists in the built-in list is not offered twice.
 */
export function mergeRegulatoryBodies(custom: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...custom, ...REGULATORY_BODIES]) {
    const clean = String(name || "").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

// Disability categories used by the Disabilities register.
export const DISABILITY_TYPES = [
  "Physical Impairment (Mobility)",
  "Physical Impairment (Upper Limb)",
  "Physical Impairment (Lower Limb)",
  "Visual Impairment",
  "Hearing Impairment",
  "Speech Impairment",
  "Albinism",
  "Mental Health Condition",
  "Learning Disability",
  "Chronic Illness",
  "Other",
];

// Commonly requested workplace accommodations (shown as suggestions while the
// HR officer types; free text is still accepted).
export const SUPPORT_SUGGESTIONS = [
  "Wheelchair accessible workspace",
  "Ergonomic workstation setup",
  "Screen reader software",
  "Screen filters / sun protection",
  "Sign language interpreter",
  "Written communication tools",
  "Flexible working hours",
  "Assistive keyboard / mouse",
  "Reserved ground-floor office",
];

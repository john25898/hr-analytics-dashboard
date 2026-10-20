"use client";

/**
 * Recruitment pipeline store.
 *
 * Requisitions are cached in localStorage so the pipeline survives reloads
 * without a backend, and pushed to the shared `hr_requisitions` Supabase table
 * when it is provisioned (see supabase-recruitment-migration.sql). If the
 * table is missing the dashboard keeps working locally — exactly the same
 * graceful-degradation pattern used by the employee store.
 */

const STORAGE_KEY = "hr-requisitions";
const API_URL = "/api/recruitment";
const STORE_VERSION = 1;

// ── Pipeline vocabulary ─────────────────────────────────────────────────────

export const STAGES = [
  "Applications",
  "Shortlisting",
  "Interview",
  "Background check",
  "Offer",
  "Hired",
] as const;

export type Stage = (typeof STAGES)[number];

/** Badge colours for each stage (tailwind classes). */
export const STAGE_CLASSES: Record<Stage, string> = {
  Applications: "border-slate-200 bg-slate-100 text-slate-700",
  Shortlisting: "border-sky-200 bg-sky-100 text-sky-700",
  Interview: "border-violet-200 bg-violet-100 text-violet-700",
  "Background check": "border-amber-200 bg-amber-100 text-amber-800",
  Offer: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hired: "border-green-600 bg-green-600 text-white",
};

/** Solid colours used by the funnel bars, one per stage. */
export const STAGE_BAR_CLASSES: Record<Stage, string> = {
  Applications: "bg-blue-600",
  Shortlisting: "bg-teal-600",
  Interview: "bg-violet-600",
  "Background check": "bg-amber-500",
  Offer: "bg-emerald-600",
  Hired: "bg-green-700",
};

export const DEPARTMENTS = [
  "Finance",
  "Programs",
  "Clinical Services",
  "Procurement",
  "Monitoring & Evaluation",
  "HR & Admin",
  "Operations",
  "IT",
];

export const SOURCES = [
  "LinkedIn",
  "BrighterMonday",
  "Referrals",
  "Website",
  "Career Fair",
  "Internal",
];

export const HIRING_MANAGERS = [
  "J. Omondi",
  "M. Wekesa",
  "A. Wanjiku",
  "R. Kariuki",
  "P. Mutua",
  "S. Njeri",
  "D. Kiptoo",
];

/** Reporting cycles offered when creating a requisition. */
export const CYCLES = ["2026-08", "2026-09", "2026-10"];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ── Types ───────────────────────────────────────────────────────────────────

export interface Requisition {
  id: string; // REQ-001
  position: string;
  department: string;
  hiringManager: string;
  /** HRH | CHAK | CBSL — mirrors the staff category used across the app. */
  category: string;
  /** Reporting cycle, `YYYY-MM`. */
  cycle: string;
  applicants: number;
  shortlisted: number;
  interviewed: number;
  offers: number;
  stage: Stage;
  openingDate: string; // ISO date
  targetDate: string; // ISO date
  sources: string[];
  nextMilestone: string;
  milestoneDate: string; // ISO date
  notes?: string;
  updatedAt?: string;
}

export type NewRequisitionInput = Omit<Requisition, "id" | "updatedAt">;

interface StoredShape {
  version: number;
  items: Requisition[];
}

// ── Seed pipeline (matches the August 2026 operating view) ──────────────────

const SEED: Requisition[] = [
  {
    id: "REQ-001",
    position: "Procurement & Admin Manager",
    department: "Finance",
    hiringManager: "J. Omondi",
    category: "HRH",
    cycle: "2026-08",
    applicants: 292,
    shortlisted: 20,
    interviewed: 6,
    offers: 1,
    stage: "Interview",
    openingDate: "2026-07-01",
    targetDate: "2026-08-30",
    sources: ["LinkedIn", "Referrals"],
    nextMilestone: "Interview report due",
    milestoneDate: "2026-08-18",
    notes:
      "Panel of three completed. Awaiting the chair's report before the offer decision.",
  },
  {
    id: "REQ-002",
    position: "Finance Officer",
    department: "Finance",
    hiringManager: "M. Wekesa",
    category: "HRH",
    cycle: "2026-08",
    applicants: 184,
    shortlisted: 12,
    interviewed: 4,
    offers: 0,
    stage: "Background check",
    openingDate: "2026-06-12",
    targetDate: "2026-08-25",
    sources: ["BrighterMonday"],
    nextMilestone: "Checks in progress",
    milestoneDate: "2026-08-14",
    notes: "Two referees outstanding; certificate verification underway.",
  },
  {
    id: "REQ-003",
    position: "M&E Officer",
    department: "Programs",
    hiringManager: "A. Wanjiku",
    category: "CHAK",
    cycle: "2026-08",
    applicants: 96,
    shortlisted: 8,
    interviewed: 2,
    offers: 0,
    stage: "Shortlisting",
    openingDate: "2026-07-20",
    targetDate: "2026-09-15",
    sources: ["Website", "Referrals"],
    nextMilestone: "Panel review",
    milestoneDate: "2026-08-22",
    notes: "Longlist of 24 screened down to 8; panel review scheduled.",
  },
  {
    id: "REQ-004",
    position: "Grants Coordinator",
    department: "Programs",
    hiringManager: "R. Kariuki",
    category: "CBSL",
    cycle: "2026-08",
    applicants: 64,
    shortlisted: 4,
    interviewed: 1,
    offers: 0,
    stage: "Offer",
    openingDate: "2026-05-05",
    targetDate: "2026-08-20",
    sources: ["Referrals"],
    nextMilestone: "Offer letter pending",
    milestoneDate: "2026-08-12",
    notes:
      "Verbal acceptance received; offer letter with finance for sign-off.",
  },
];

/** Fresh copies so callers can never mutate the module-level seed. */
export function seedRequisitions(): Requisition[] {
  return SEED.map((r) => ({ ...r, sources: [...r.sources] }));
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function cycleLabel(cycle?: string | null): string {
  if (!cycle || cycle === "all") return "All cycles";
  const [year, month] = String(cycle).split("-");
  const idx = Number(month) - 1;
  const monthName = MONTH_SHORT[idx];
  if (!monthName) return String(cycle);
  return `${monthName} ${year}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function stageIndex(stage: Stage | string): number {
  const idx = STAGES.indexOf(stage as Stage);
  return idx === -1 ? 0 : idx;
}

export function nextStage(stage: Stage): Stage {
  return STAGES[Math.min(stageIndex(stage) + 1, STAGES.length - 1)];
}

// ── Totals ──────────────────────────────────────────────────────────────────

export interface RequisitionTotals {
  applicants: number;
  shortlisted: number;
  interviewed: number;
  offers: number;
  requisitions: number;
}

export function requisitionTotals(list: Requisition[]): RequisitionTotals {
  return list.reduce<RequisitionTotals>(
    (acc, r) => ({
      applicants: acc.applicants + (Number(r.applicants) || 0),
      shortlisted: acc.shortlisted + (Number(r.shortlisted) || 0),
      interviewed: acc.interviewed + (Number(r.interviewed) || 0),
      offers: acc.offers + (Number(r.offers) || 0),
      requisitions: acc.requisitions + 1,
    }),
    {
      applicants: 0,
      shortlisted: 0,
      interviewed: 0,
      offers: 0,
      requisitions: 0,
    },
  );
}

// ── Local persistence ───────────────────────────────────────────────────────

function readStore(): StoredShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as StoredShape).items)
    ) {
      return parsed as StoredShape;
    }
  } catch {
    // corrupt storage — fall back to the seed pipeline
  }
  return null;
}

export function loadRequisitions(): Requisition[] {
  const stored = readStore();
  if (stored) return stored.items;
  return seedRequisitions();
}

function saveRequisitions(items: Requisition[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORE_VERSION, items } satisfies StoredShape),
    );
  } catch {
    // storage blocked/full — the in-memory list still works this session
  }
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("requisitions-changed"));
  } catch {
    // event bus unavailable
  }
}

// ── Backend sync (best effort) ──────────────────────────────────────────────

async function pushRequisition(requisition: Requisition): Promise<void> {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [
          {
            id: requisition.id,
            data: requisition,
            updated_at: requisition.updatedAt || new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // offline / table missing — localStorage remains the working copy
  }
}

/**
 * Merge the shared backend into localStorage. DB rows win per id. Returns the
 * merged list, or null when nothing was available (offline / table missing).
 */
export async function syncRequisitions(): Promise<Requisition[] | null> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: any[] = Array.isArray(json?.rows) ? json.rows : [];
    if (rows.length === 0) return null;

    const stored = loadRequisitions();
    const byId = new Map<string, Requisition>();
    stored.forEach((r) => byId.set(r.id, r));
    rows.forEach((row) => {
      const data = row?.data;
      if (data && typeof data === "object" && data.id) {
        byId.set(String(data.id), data as Requisition);
      }
    });

    const merged = Array.from(byId.values()).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    saveRequisitions(merged);
    return merged;
  } catch {
    return null;
  }
}

// ── Mutations ───────────────────────────────────────────────────────────────

function nextId(items: Requisition[]): string {
  const highest = items.reduce((max, r) => {
    const n = Number(String(r.id).replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `REQ-${String(highest + 1).padStart(3, "0")}`;
}

export function addRequisition(input: NewRequisitionInput): Requisition {
  const items = loadRequisitions();
  const requisition: Requisition = {
    ...input,
    id: nextId(items),
    updatedAt: new Date().toISOString(),
  };
  saveRequisitions([...items, requisition]);
  void pushRequisition(requisition);
  notifyChanged();
  return requisition;
}

export function updateRequisition(
  id: string,
  patch: Partial<Requisition>,
): Requisition | null {
  const items = loadRequisitions();
  let updated: Requisition | null = null;
  const next = items.map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, ...patch, id: r.id, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return null;
  saveRequisitions(next);
  void pushRequisition(updated);
  notifyChanged();
  return updated;
}

export function deleteRequisition(id: string): void {
  const items = loadRequisitions().filter((r) => r.id !== id);
  saveRequisitions(items);
  void (async () => {
    try {
      await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      // network error — the record is already gone locally
    }
  })();
  notifyChanged();
}

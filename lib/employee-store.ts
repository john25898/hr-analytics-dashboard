"use client";

export interface ContractExtension {
  from: string; // previous contract end date (ISO)
  to: string; // new contract end date (ISO)
  extendedBy?: string;
  note?: string;
  date: string; // when the extension was made (ISO)
}

/** Statutory provision numbers for an employee (SHA / NHIF / NSSF / KRA). */
export interface StatutoryProvisions {
  sha?: string;
  nhif?: string;
  nssf?: string;
  kra?: string;
}

/** License details that can be renewed/updated by HR. */
export interface LicenseDetails {
  licenceNo?: string;
  validUntil?: string;
}

export interface EmployeeEdit {
  endOfContract?: string;
  exitReason?: "death" | "resignation" | "retirement" | "termination" | "";
  exitDate?: string;
  // Exit documentation dates captured before an employee leaves, so the
  // offboarding paperwork (notice, signing, certificate) is recorded up front.
  noticeDate?: string; // date notice was served / received
  fullySignedDate?: string; // date the exit documents were fully signed
  certificateDate?: string; // date the service certificate was issued
  isDeparted?: boolean;
  contractExtensions?: ContractExtension[];
  provisions?: StatutoryProvisions;
  license?: LicenseDetails;
  // HRH | CHAK | CBSL — used by the dashboard category filter.
  category?: string;
}

export interface DisabilityRecord {
  id: string;
  name: string;
  gender: string;
  disability: string;
  county: string;
  subCounty: string;
  facility: string;
  designation: string;
  phone: string;
  supportNeeded: string;
  // Extended master-DB fields (UJTP master workbook)
  idNo?: string;
  dob?: string;
  dateEmployed?: string;
  contractEnd?: string;
  educationLevel?: string;
  qualification?: string;
  othersCert?: string;
  regulatoryBody?: string;
  licenceNo?: string;
  validUntil?: string;
}

export interface TransferRecord {
  id: string;
  employeeName: string;
  fromCounty: string;
  toCounty: string;
  fromFacility: string;
  toFacility: string;
  fromSubCounty: string;
  toSubCounty: string;
  // Project (programme) transfer — a worker can move between projects without
  // changing county / facility, so these are optional.
  fromProject?: string;
  toProject?: string;
  designation: string;
  transferDate: string;
  reason: string;
}

export interface NewWorkerRecord {
  id: string;
  name: string;
  gender: string;
  phone: string;
  idNo: string;
  // Official (work) and personal email addresses.
  workEmail?: string;
  personalEmail?: string;
  // CHAK | HRH | CBSL
  category?: string;
  // Contract | Casual Laborer | Internship
  employmentType?: string;
  // Program / donor project the worker is attached to
  project?: string;
  // Office workstation (CHAK staff only; replaces county/sub-county/facility)
  workstation?: string;
  county: string;
  subCounty: string;
  facility: string;
  designation: string;
  designationGroup?: string;
  designationOriginal?: string;
  dateEmployed: string;
  contractEnd: string;
  dob: string;
  educationLevel: string;
  qualification: string;
  othersCert: string;
  regulatoryBody: string;
  licenceNo: string;
  validUntil: string;
  // Disability declaration captured at intake (optional).
  disability?: string;
  // Workplace accommodation required when a disability is declared.
  supportNeeded?: string;
}

export interface HRModifications {
  employeeEdits: Record<string, EmployeeEdit>;
  disabilities: DisabilityRecord[];
  transfers: TransferRecord[];
  newWorkers: NewWorkerRecord[];
}

const STORAGE_KEY = "hr-modifications";
const API_URL = "/api/hr-changes";

const EMPTY_MODS: HRModifications = {
  employeeEdits: {},
  disabilities: [],
  transfers: [],
  newWorkers: [],
};

/** Fresh empty mods with NEW array/object instances (never shared refs).
 *  Spreading EMPTY_MODS would share the arrays by reference and let any
 *  mutation (e.g. a pull) pollute the constant for later callers. */
function emptyMods(): HRModifications {
  return {
    employeeEdits: {},
    disabilities: [],
    transfers: [],
    newWorkers: [],
  };
}

/** A single row in the shared `hr_employee_changes` Supabase table. */
export interface HRChangeRow {
  id: string; // `${change_type}:${ref_id}`
  change_type: string; // new_worker | employee_edit | disability | transfer
  ref_id: string; // employee name or record id
  data: unknown;
}

export function getModifications(): HRModifications {
  if (typeof window === "undefined") return emptyMods();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const mods = JSON.parse(raw);
      if (mods && typeof mods === "object") {
        // Dedupe new workers by id on read so a stray double-write (e.g.
        // double-click on Save) can never show an employee twice.
        const seen = new Set<string>();
        const newWorkers = (
          Array.isArray(mods.newWorkers) ? mods.newWorkers : []
        ).filter((w: any) => {
          if (!w || !w.id || seen.has(w.id)) return false;
          seen.add(w.id);
          return true;
        });
        return {
          employeeEdits:
            mods.employeeEdits && typeof mods.employeeEdits === "object"
              ? mods.employeeEdits
              : {},
          disabilities: Array.isArray(mods.disabilities)
            ? mods.disabilities
            : [],
          transfers: Array.isArray(mods.transfers) ? mods.transfers : [],
          newWorkers,
        };
      }
    }
  } catch {
    // corrupt localStorage — start clean rather than crash the page
  }
  return emptyMods();
}

export function saveModifications(mods: HRModifications): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mods));
  } catch {
    // storage full / blocked — mutations still work in memory this session
  }
}

// ---------------------------------------------------------------------------
// Shared Supabase backend (table `hr_employee_changes`).
// localStorage is the fast cache; the DB is the durable source of truth.
// Every mutation is pushed fire-and-forget; pages pull on mount to pick up
// changes made on other browsers/devices.
// ---------------------------------------------------------------------------

/** Convert the full modifications object into DB rows (upsert-friendly ids). */
function toRows(mods: HRModifications): HRChangeRow[] {
  const rows: HRChangeRow[] = [];
  for (const [name, edit] of Object.entries(mods.employeeEdits || {})) {
    rows.push({
      id: `employee_edit:${name}`,
      change_type: "employee_edit",
      ref_id: name,
      data: edit,
    });
  }
  for (const w of mods.newWorkers || []) {
    rows.push({
      id: `new_worker:${w.id}`,
      change_type: "new_worker",
      ref_id: w.id,
      data: w,
    });
  }
  for (const d of mods.disabilities || []) {
    rows.push({
      id: `disability:${d.id}`,
      change_type: "disability",
      ref_id: d.id,
      data: d,
    });
  }
  for (const t of mods.transfers || []) {
    rows.push({
      id: `transfer:${t.id}`,
      change_type: "transfer",
      ref_id: t.id,
      data: t,
    });
  }
  return rows;
}

/** Push the entire current modifications state to the shared backend. */
export async function pushChangesToBackend(): Promise<void> {
  const mods = getModifications();
  const rows = toRows(mods);
  if (rows.length === 0) return;
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: rows }),
    });
  } catch {
    // offline / table missing — local state remains the working copy
  }
  // Tell any open page to re-read /api data so the change shows up without a
  // manual browser refresh.
  notifyDataSynced();
}

/** Delete a single record from the backend (e.g. removed disability/transfer). */
export async function deleteChangeFromBackend(
  change_type: string,
  ref_id: string,
): Promise<void> {
  try {
    await fetch(
      `${API_URL}?change_type=${encodeURIComponent(
        change_type,
      )}&ref_id=${encodeURIComponent(ref_id)}`,
      { method: "DELETE" },
    );
  } catch {
    // ignore network errors — local state was already updated
  }
  notifyDataSynced();
}

/** Broadcast that HR data changed so open pages refresh their SWR data. */
function notifyDataSynced(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("hr-data-synced"));
  } catch {
    // event bus unavailable — ignore
  }
}

/**
 * Pull the shared backend state into localStorage (DB wins when it has data —
 * that means the table exists and has been written to). Returns the merged
 * modifications so callers can trigger a re-render.
 */
export async function pullChangesFromBackend(): Promise<HRModifications | null> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: HRChangeRow[] = Array.isArray(json?.changes)
      ? json.changes
      : [];
    if (rows.length === 0) return null; // table empty / not provisioned yet

    const mods: HRModifications = emptyMods();
    const seenWorkers = new Set<string>();
    for (const row of rows) {
      const data = row?.data;
      if (!data) continue;
      switch (row.change_type) {
        case "employee_edit":
          if (row.ref_id) mods.employeeEdits[row.ref_id] = data as EmployeeEdit;
          break;
        case "new_worker":
          if (row.ref_id && !seenWorkers.has(row.ref_id)) {
            seenWorkers.add(row.ref_id);
            mods.newWorkers.push(data as NewWorkerRecord);
          }
          break;
        case "disability":
          if (row.ref_id) mods.disabilities.push(data as DisabilityRecord);
          break;
        case "transfer":
          if (row.ref_id) mods.transfers.push(data as TransferRecord);
          break;
      }
    }
    saveModifications(mods);
    return mods;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mutation helpers (each updates localStorage AND syncs to the backend)
// ---------------------------------------------------------------------------

export function updateEmployeeEdit(name: string, edit: EmployeeEdit): void {
  const mods = getModifications();
  mods.employeeEdits[name] = { ...mods.employeeEdits[name], ...edit };
  saveModifications(mods);
  pushChangesToBackend();
}

export function getEmployeeEdit(name: string): EmployeeEdit | undefined {
  const mods = getModifications();
  return mods.employeeEdits[name];
}

/**
 * Set the statutory provision numbers (SHA / NHIF / NSSF / KRA) for an
 * employee. Saved to localStorage AND synced to the shared backend so any
 * browser/device sees the same numbers.
 */
export function updateProvisions(
  name: string,
  provisions: StatutoryProvisions,
): void {
  if (!name) return;
  const mods = getModifications();
  mods.employeeEdits[name] = {
    ...mods.employeeEdits[name],
    provisions: {
      ...(mods.employeeEdits[name]?.provisions || {}),
      ...provisions,
    },
  };
  saveModifications(mods);
  pushChangesToBackend();
}

/**
 * Update an employee's license number and/or valid-until date. Merged into
 * the employee edit and synced to the shared backend so the compliance and
 * employees pages reflect the renewal everywhere.
 */
export function updateLicense(name: string, license: LicenseDetails): void {
  if (!name) return;
  const mods = getModifications();
  mods.employeeEdits[name] = {
    ...mods.employeeEdits[name],
    license: {
      ...(mods.employeeEdits[name]?.license || {}),
      ...license,
    },
  };
  saveModifications(mods);
  pushChangesToBackend();
}

/**
 * Set a new contract end date. If the new date is LATER than the current
 * effective end date, this is recorded as a contract extension with history.
 */
export function updateContractEnd(
  name: string,
  newEndDate: string,
  prevEffectiveEndDate?: string,
  options?: { by?: string; note?: string },
): void {
  const mods = getModifications();
  const prev = mods.employeeEdits[name]?.endOfContract || prevEffectiveEndDate;
  const edit = mods.employeeEdits[name] || {};
  const newDate = new Date(newEndDate);
  const prevDate = prev ? new Date(prev) : null;

  if (prevDate && newDate > prevDate) {
    const extension: ContractExtension = {
      from: prevDate.toISOString(),
      to: newDate.toISOString(),
      extendedBy: options?.by,
      note: options?.note,
      date: new Date().toISOString(),
    };
    edit.contractExtensions = [...(edit.contractExtensions || []), extension];
  }
  edit.endOfContract = newEndDate;
  mods.employeeEdits[name] = edit;
  saveModifications(mods);
  pushChangesToBackend();
}

/** Convenience: extend by a number of months from the current end date. */
export function extendContract(
  name: string,
  months: number,
  currentEndDate?: string,
  options?: { by?: string; note?: string },
): void {
  const base = currentEndDate || new Date().toISOString();
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  updateContractEnd(name, d.toISOString(), base, options);
}

export function addDisability(record: DisabilityRecord): void {
  const mods = getModifications();
  mods.disabilities.push(record);
  saveModifications(mods);
  pushChangesToBackend();
}

export function removeDisability(id: string): void {
  const mods = getModifications();
  mods.disabilities = mods.disabilities.filter((d) => d.id !== id);
  saveModifications(mods);
  deleteChangeFromBackend("disability", id);
}

export function getDisabilities(): DisabilityRecord[] {
  return getModifications().disabilities || [];
}

// Transfer functions
export function addTransfer(record: TransferRecord): void {
  const mods = getModifications();
  mods.transfers.push(record);
  saveModifications(mods);
  pushChangesToBackend();
}

export function removeTransfer(id: string): void {
  const mods = getModifications();
  mods.transfers = mods.transfers.filter((t) => t.id !== id);
  saveModifications(mods);
  deleteChangeFromBackend("transfer", id);
}

export function getTransfers(): TransferRecord[] {
  return getModifications().transfers || [];
}

// New Worker functions
export async function addNewWorker(record: NewWorkerRecord): Promise<void> {
  const mods = getModifications();
  // Upsert by id: if this worker already exists locally, replace it instead
  // of appending a second copy (protects against double-submits).
  const existing = mods.newWorkers.findIndex((w) => w.id === record.id);
  if (existing >= 0) {
    mods.newWorkers[existing] = record;
  } else {
    mods.newWorkers.push(record);
  }
  saveModifications(mods);
  // Wait for the backend write before returning so callers can refresh data
  // and the new worker is already in the shared DB.
  await pushChangesToBackend();
}

export function removeNewWorker(id: string): void {
  const mods = getModifications();
  mods.newWorkers = mods.newWorkers.filter((w) => w.id !== id);
  saveModifications(mods);
  deleteChangeFromBackend("new_worker", id);
}

export function getNewWorkers(): NewWorkerRecord[] {
  return getModifications().newWorkers || [];
}

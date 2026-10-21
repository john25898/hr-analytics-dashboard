import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Server-side store for shared HR changes (new workers, employee edits,
 * transfers, disabilities, departures).
 *
 * Two backends, picked automatically:
 *
 *   1. Supabase (`hr_employee_changes`) when NEXT_PUBLIC_SUPABASE_URL +
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY are set. This is the durable, multi-user
 *      option and what local development uses.
 *
 *   2. A JSON file in `.data/hr-changes.json` when Supabase is NOT configured
 *      (e.g. the Render deployment, where the env vars are commented out) or
 *      when a Supabase write fails. Without this fallback, workers added in the
 *      UI lived only in that browser's localStorage: every list and count is
 *      built server-side by lib/hr-merge.ts, so the new hire never showed up
 *      and no KPI changed.
 *
 * Reads always return the UNION of both sources (deduped by id, newest wins),
 * so a change is never lost if one backend is momentarily unavailable.
 *
 * NOTE: the file store is per-instance storage. On an ephemeral host it
 * survives for the life of the instance but not a redeploy — configure the
 * Supabase env vars for durable storage.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "hr_employee_changes";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "hr-changes.json");

export interface HRChangeRow {
  id: string;
  change_type: string;
  ref_id: string | null;
  data: any;
  updated_at?: string;
}

/** "supabase" when a shared backend is configured, otherwise "file". */
export function backendMode(): "supabase" | "file" {
  return SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "file";
}

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

// ---------------------------------------------------------------------------
// File backend
// ---------------------------------------------------------------------------

/** Serialise file writes so two concurrent saves can't clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function readFileRows(): Promise<HRChangeRow[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HRChangeRow[];
    if (Array.isArray(parsed?.changes)) return parsed.changes as HRChangeRow[];
    return [];
  } catch {
    // Missing file / empty / corrupt — treat as "no changes yet".
    return [];
  }
}

async function writeFileRows(rows: HRChangeRow[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ changes: rows }, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

// ---------------------------------------------------------------------------
// Supabase backend
// ---------------------------------------------------------------------------

async function readSupabaseRows(): Promise<HRChangeRow[] | null> {
  if (backendMode() !== "supabase") return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=id,change_type,ref_id,data,updated_at&order=updated_at.desc`,
      { headers: supabaseHeaders(), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return null;
  }
}

async function upsertSupabase(rows: HRChangeRow[]): Promise<boolean> {
  if (backendMode() !== "supabase") return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteSupabase(
  change_type: string,
  ref_id: string,
): Promise<boolean> {
  if (backendMode() !== "supabase") return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?change_type=eq.${encodeURIComponent(
        change_type,
      )}&ref_id=eq.${encodeURIComponent(ref_id)}`,
      {
        method: "DELETE",
        headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
        cache: "no-store",
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API (union reads, mirrored writes)
// ---------------------------------------------------------------------------

/** Every stored change row, newest first, from whichever backends answer. */
export async function readAllChanges(): Promise<HRChangeRow[]> {
  const [remote, local] = await Promise.all([
    readSupabaseRows(),
    readFileRows(),
  ]);

  const byId = new Map<string, HRChangeRow>();
  const stamp = (row: HRChangeRow) =>
    row.updated_at ? Date.parse(row.updated_at) || 0 : 0;

  // File rows first, then Supabase rows override them when newer.
  for (const row of [...local, ...(remote || [])]) {
    if (!row?.id) continue;
    const existing = byId.get(row.id);
    if (!existing || stamp(row) >= stamp(existing)) byId.set(row.id, row);
  }

  return [...byId.values()].sort((a, b) => stamp(b) - stamp(a));
}

/** Upsert rows (by id) into the configured backend, mirrored to the file. */
export async function saveChanges(changes: HRChangeRow[]): Promise<{
  ok: boolean;
  stored: number;
  backend: "supabase" | "file";
}> {
  const now = new Date().toISOString();
  const rows: HRChangeRow[] = changes.map((c) => ({
    id: String(
      c.id ?? `${c.change_type ?? "change"}:${c.ref_id ?? Date.now()}`,
    ),
    change_type: c.change_type ?? "change",
    ref_id: c.ref_id ?? null,
    data: c.data ?? {},
    updated_at: c.updated_at ?? now,
  }));
  if (rows.length === 0) return { ok: true, stored: 0, backend: backendMode() };

  const remoteOk = await upsertSupabase(rows);

  // Mirror to the file store when there is no Supabase project configured, so
  // single-instance deployments (Render) still keep the change. When Supabase
  // is configured we only touch the file if that write failed, to avoid two
  // sources of truth drifting apart.
  let localOk = true;
  if (!remoteOk) {
    localOk = await enqueue(async () => {
      try {
        const current = await readFileRows();
        const byId = new Map(current.map((r) => [r.id, r]));
        for (const row of rows) byId.set(row.id, row);
        await writeFileRows([...byId.values()]);
        return true;
      } catch (err) {
        console.warn("hr-store: could not write local change file:", err);
        return false;
      }
    });
  }

  return {
    ok: remoteOk || localOk,
    stored: rows.length,
    backend: remoteOk ? "supabase" : "file",
  };
}

/** Delete one change row from every backend (best effort). */
export async function removeChange(
  change_type: string,
  ref_id: string,
): Promise<{ ok: boolean; backend: "supabase" | "file" }> {
  const remoteOk = await deleteSupabase(change_type, ref_id);

  await enqueue(async () => {
    try {
      const current = await readFileRows();
      const next = current.filter(
        (r) => !(r.change_type === change_type && r.ref_id === ref_id),
      );
      if (next.length !== current.length) await writeFileRows(next);
    } catch (err) {
      console.warn("hr-store: could not update local change file:", err);
    }
  });

  return { ok: true, backend: remoteOk ? "supabase" : "file" };
}

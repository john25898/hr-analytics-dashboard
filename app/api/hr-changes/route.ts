import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "hr_employee_changes";

// GET: pull all HR changes (new workers, edits, contract extensions,
// disabilities, transfers) from the shared backend. Each row stores the full
// record in `data` (JSONB) so both apps keep their own shape. If the table
// hasn't been created yet (run supabase-hr-migration.sql) we return empty
// gracefully — the dashboard keeps working from localStorage.
export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured", changes: [], total: 0 },
        { status: 500 },
      );
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=id,change_type,ref_id,data&order=updated_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      // 404 = table not created yet (run supabase-hr-migration.sql) — not fatal
      if (res.status === 404) {
        return NextResponse.json({ changes: [], total: 0, tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}`, changes: [], total: 0 },
        { status: 502 },
      );
    }

    const rows = await res.json();
    const changes = Array.isArray(rows) ? rows : [];
    return NextResponse.json({ changes, total: changes.length });
  } catch (err) {
    // Backend unreachable (offline / project not provisioned) — the dashboard
    // still works from localStorage. Return empty gracefully.
    console.warn("hr-changes: backend unavailable, using local data:", err);
    return NextResponse.json({ changes: [], total: 0, offline: true });
  }
}

// POST: upsert HR changes (new workers, edits, contract extensions,
// disabilities, transfers) to the shared backend so any browser/device sees
// the same state. Ids are `${change_type}:${ref_id}` — re-pushing the same
// record updates it instead of duplicating.
export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured" },
        { status: 500 },
      );
    }
    const body = await request.json();
    const changes: any[] = Array.isArray(body?.changes) ? body.changes : [];
    if (changes.length === 0) {
      return NextResponse.json({ ok: true, pushed: 0 });
    }

    const rows = changes.map((c) => ({
      id: String(
        c.id ?? `${c.change_type ?? "change"}:${c.ref_id ?? Date.now()}`,
      ),
      change_type: c.change_type ?? "change",
      ref_id: c.ref_id ?? null,
      data: c.data ?? {},
      updated_at: new Date().toISOString(),
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
    });

    if (!res.ok) {
      // 404 = table not created yet (run supabase-hr-migration.sql) — not
      // fatal, the dashboard keeps working from localStorage.
      if (res.status === 404) {
        return NextResponse.json({ ok: false, pushed: 0, tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, pushed: rows.length });
  } catch (err) {
    // Backend unreachable — local data still saved; push is best-effort.
    console.warn("hr-changes POST: backend unavailable, kept locally:", err);
    return NextResponse.json({ ok: true, pushed: 0, offline: true });
  }
}

// DELETE: remove a single change from the backend (e.g. a removed disability,
// transfer or new worker record).
export async function DELETE(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured" },
        { status: 500 },
      );
    }
    const { searchParams } = new URL(request.url);
    const change_type = searchParams.get("change_type");
    const ref_id = searchParams.get("ref_id");
    if (!change_type || !ref_id) {
      return NextResponse.json(
        { error: "change_type and ref_id required" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?change_type=eq.${encodeURIComponent(
        change_type,
      )}&ref_id=eq.${encodeURIComponent(ref_id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        cache: "no-store",
      },
    );

    if (!res.ok && res.status !== 404) {
      return NextResponse.json(
        { error: `Supabase error ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("hr-changes DELETE: backend unavailable:", err);
    return NextResponse.json({ ok: true, deleted: 0, offline: true });
  }
}

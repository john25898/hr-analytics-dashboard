import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "timesheets";

// GET: pull all timesheets from the shared backend (same table the
// CMaT Enterprise app writes to) so the dashboard is always in sync.
export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured", entries: [] },
        { status: 500 },
      );
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=data&order=updated_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      // 404 = table not created yet (run supabase-timesheets-migration.sql) — not fatal
      if (res.status === 404) {
        return NextResponse.json({ entries: [], tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}`, entries: [] },
        { status: 502 },
      );
    }

    const rows = await res.json();
    const entries = (Array.isArray(rows) ? rows : [])
      .map((r: any) => r?.data)
      .filter(Boolean);
    return NextResponse.json({ entries, total: entries.length });
  } catch (err) {
    // Backend unreachable (offline / project not provisioned) — return an
    // empty sync gracefully instead of a 500 that spams the console.
    console.warn("timesheet-sync: backend unavailable, using local data:", err);
    return NextResponse.json({ entries: [], total: 0, offline: true });
  }
}

// POST: push timesheet entries (e.g. added/approved in the HR dashboard) to
// the shared backend so the CMaT app sees them too.
export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured" },
        { status: 500 },
      );
    }
    const body = await request.json();
    const entries: any[] = Array.isArray(body?.entries) ? body.entries : [];
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, pushed: 0 });
    }

    const rows = entries.map((e) => ({
      id: String(
        e.id ?? `dash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ),
      staff_email: e.staffEmail ?? e.staff_email ?? null,
      staff_name: e.staffName ?? e.staff_name ?? null,
      facility: e.facility ?? null,
      year: e.year ?? null,
      month: e.month ?? null,
      status: e.status ?? "pending",
      data: e,
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
      return NextResponse.json(
        { error: `Supabase error ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, pushed: rows.length });
  } catch (err) {
    // Backend unreachable — local data still saved; push is best-effort.
    console.warn(
      "timesheet-sync POST: backend unavailable, kept locally:",
      err,
    );
    return NextResponse.json({ ok: true, pushed: 0, offline: true });
  }
}

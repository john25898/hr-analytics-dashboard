import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "employees";

// GET: pull the CMaT staff roster mirror from the shared backend.
// The CMaT app mirrors its staff logins here on login (lib/staffBackend.ts),
// so the HR dashboard sees the same 181 employees and filters work across the
// full roster. Returns { staff, total, tableMissing? }.
export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase env not configured", staff: [], total: 0 },
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
      // 404 = table not created yet (run supabase-migration.sql section 7)
      if (res.status === 404) {
        return NextResponse.json({ staff: [], total: 0, tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}`, staff: [], total: 0 },
        { status: 502 },
      );
    }

    const rows = await res.json();
    const staff = (Array.isArray(rows) ? rows : [])
      .map((r: any) => r?.data)
      .filter(Boolean);
    return NextResponse.json({ staff, total: staff.length });
  } catch (err) {
    // Backend unreachable (offline / project not provisioned) — the dashboard
    // still works from the local roster + leave planner data. Return an empty
    // sync gracefully instead of a 500 that spams the console every poll.
    console.warn("staff-sync: backend unavailable, using local roster:", err);
    return NextResponse.json({ staff: [], total: 0, offline: true });
  }
}

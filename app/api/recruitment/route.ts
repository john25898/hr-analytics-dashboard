import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "hr_requisitions";

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
});

// GET: pull every requisition from the shared backend. Each row stores the
// full record in `data` (JSONB). If the table has not been created yet (run
// supabase-recruitment-migration.sql) we return an empty list gracefully so
// the pipeline keeps working from localStorage.
export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ rows: [], total: 0, offline: true });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=id,data,updated_at&order=updated_at.desc`,
      { headers: headers(), cache: "no-store" },
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ rows: [], total: 0, tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}`, rows: [], total: 0 },
        { status: 502 },
      );
    }

    const rows = await res.json();
    const list = Array.isArray(rows) ? rows : [];
    return NextResponse.json({ rows: list, total: list.length });
  } catch (err) {
    console.warn("recruitment GET: backend unavailable:", err);
    return NextResponse.json({ rows: [], total: 0, offline: true });
  }
}

// POST: upsert requisitions (create / edit / advance stage). Id is the
// requisition id, so re-pushing updates instead of duplicating.
export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: false, offline: true, pushed: 0 });
    }

    const body = await request.json();
    const incoming: any[] = Array.isArray(body?.rows) ? body.rows : [];
    if (incoming.length === 0) {
      return NextResponse.json({ ok: true, pushed: 0 });
    }

    const rows = incoming
      .filter((r) => r && r.id)
      .map((r) => ({
        id: String(r.id),
        data: r.data ?? {},
        updated_at: r.updated_at ?? new Date().toISOString(),
      }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
    });

    if (!res.ok) {
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
    console.warn("recruitment POST: backend unavailable, kept locally:", err);
    return NextResponse.json({ ok: true, pushed: 0, offline: true });
  }
}

// DELETE: remove a requisition from the shared backend.
export async function DELETE(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ ok: false, offline: true, deleted: 0 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { ...headers(), Prefer: "return=minimal" },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ ok: false, deleted: 0, tableMissing: true });
      }
      return NextResponse.json(
        { error: `Supabase error ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, deleted: 1 });
  } catch (err) {
    console.warn("recruitment DELETE: backend unavailable:", err);
    return NextResponse.json({ ok: false, deleted: 0, offline: true });
  }
}

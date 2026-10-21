import { NextRequest, NextResponse } from "next/server";
import {
  backendMode,
  readAllChanges,
  removeChange,
  saveChanges,
} from "@/lib/server/hr-store";

// The change store may touch the filesystem (fallback backend) — always run on
// the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: all HR changes (new workers, edits, contract extensions, disabilities,
// transfers). Served from Supabase when configured, otherwise from the local
// server-side change file — either way the payload is the same shape, so the
// client can merge it into localStorage.
export async function GET() {
  try {
    const changes = await readAllChanges();
    return NextResponse.json({
      changes,
      total: changes.length,
      backend: backendMode(),
    });
  } catch (err) {
    console.warn("hr-changes GET: store unavailable:", err);
    return NextResponse.json({ changes: [], total: 0, offline: true });
  }
}

// POST: upsert changes by id (`${change_type}:${ref_id}`) so re-pushing the
// same record updates it instead of duplicating.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const changes: any[] = Array.isArray(body?.changes) ? body.changes : [];
    if (changes.length === 0) {
      return NextResponse.json({ ok: true, pushed: 0 });
    }
    const result = await saveChanges(changes);
    return NextResponse.json({
      ok: result.ok,
      pushed: result.ok ? result.stored : 0,
      backend: result.backend,
    });
  } catch (err) {
    console.warn("hr-changes POST: could not parse/store payload:", err);
    return NextResponse.json(
      { ok: false, pushed: 0, error: "bad request" },
      { status: 400 },
    );
  }
}

// DELETE: remove a single change (e.g. a removed disability, transfer or new
// worker record).
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const change_type = searchParams.get("change_type");
    const ref_id = searchParams.get("ref_id");
    if (!change_type || !ref_id) {
      return NextResponse.json(
        { error: "change_type and ref_id required" },
        { status: 400 },
      );
    }
    const result = await removeChange(change_type, ref_id);
    return NextResponse.json({ ok: result.ok, backend: result.backend });
  } catch (err) {
    console.warn("hr-changes DELETE: store unavailable:", err);
    return NextResponse.json({ ok: false, deleted: 0, offline: true });
  }
}

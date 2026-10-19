"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Upload,
  Download,
  ExternalLink,
  Database,
  CheckCircle2,
} from "lucide-react";

// Map cm-a-t leave types to canonical planner types
const CMAT_TYPE_MAP: Record<string, string> = {
  annual: "Annual Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  sick: "Sick Leave",
  compassionate: "Compassionate Leave",
  public_holiday: "Public Holiday",
};

function mapStatus(status?: string): string {
  if (!status) return "Pending";
  const s = status.toLowerCase();
  if (s === "approved" || s === "pending" || s === "returned") {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (s === "rejected") return "Rejected";
  if (s === "cancelled") return "Cancelled";
  return "Pending";
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Convert a raw cm-a-t LeaveRequest (or dashboard entry) into the dashboard's
// leave entry shape used by balances / calendar / KPIs.
export function convertCmatEntry(raw: any): any {
  const leaveType =
    CMAT_TYPE_MAP[raw.leaveType] || raw.leaveType || "Other Leave";
  const days = raw.leaveDays || raw.days || 1;
  const startDate = (raw.startDate || "").slice(0, 10);
  const reportingDate = (raw.reportingDate || raw.endDate || "").slice(0, 10);
  const endDate =
    reportingDate && reportingDate >= startDate
      ? reportingDate
      : startDate
        ? addDays(startDate, Math.max(0, days - 1))
        : "";
  return {
    id: raw.id || `cmat_${Date.now()}`,
    employee:
      raw.staffName ||
      raw.staff_email ||
      raw.employee ||
      raw.staffEmail ||
      "Unknown",
    leaveType,
    startDate,
    endDate,
    days,
    status: mapStatus(raw.status),
    source: raw.source || "CMaT",
  };
}

interface LeaveSyncPanelProps {
  onImport: (entries: any[]) => void;
}

export function LeaveSyncPanel({ onImport }: LeaveSyncPanelProps) {
  const [detected, setDetected] = React.useState<any[]>([]);
  const [backendEntries, setBackendEntries] = React.useState<any[]>([]);
  const [synced, setSynced] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [tableMissing, setTableMissing] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Auto-sync from the shared backend on mount, every 2 minutes, and whenever
  // the tab regains focus — leave entered in the CMaT app appears here without
  // manual steps, but without re-rendering the page every 30 seconds.
  React.useEffect(() => {
    pullFromBackend();
    const interval = setInterval(pullFromBackend, 120000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void pullFromBackend();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pullFromBackend = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/leave-sync", { cache: "no-store" });
      const json = await res.json();
      const entries = (json.entries || []).map(convertCmatEntry);
      setBackendEntries(entries);
      if (json.tableMissing) setTableMissing(true);
      if (entries.length > 0) {
        onImport(entries);
        setSynced(true);
      }
    } catch {
      // offline / backend down — keep working with local data
    } finally {
      setSyncing(false);
    }
  };

  const detectFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem("chak-leave-requests");
      if (!raw) {
        setDetected([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const entries = (Array.isArray(parsed) ? parsed : []).map(
        convertCmatEntry,
      );
      setDetected(entries);
    } catch {
      setDetected([]);
    }
  };

  const importDetected = () => {
    if (detected.length === 0) return;
    onImport(detected);
    setImportedCount((c) => c + detected.length);
    setDetected([]);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const entries = arr
          .map(convertCmatEntry)
          .filter((x: any) => x.startDate);
        onImport(entries);
        setImportedCount((c) => c + entries.length);
      } catch {
        alert(
          "Could not parse JSON file — expected an array of leave requests.",
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportTemplate = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          [
            {
              id: 1,
              staffName: "Jane Doe",
              staffEmail: "jane@example.com",
              facility: "Meru",
              leaveType: "annual",
              leaveDays: 5,
              startDate: "2026-03-02",
              reportingDate: "2026-03-06",
              status: "approved",
            },
          ],
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cmat-leave-export-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalEntries = backendEntries.length + detected.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Shared Leave Backend (CMaT Sync)
          </CardTitle>
          <CardDescription className="mt-1">
            Both apps read/write the same Supabase <code>leave_requests</code>{" "}
            table — leave entered in the CMaT Enterprise app appears here
            automatically (and vice-versa).
          </CardDescription>
        </div>
        {synced && (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Auto-synced
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={pullFromBackend}
            disabled={syncing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
          <Button variant="outline" size="sm" onClick={detectFromLocalStorage}>
            <Upload className="mr-2 h-4 w-4" /> Detect Local Storage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Download className="mr-2 h-4 w-4" /> Import JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportTemplate}>
            <Download className="mr-2 h-4 w-4" /> Export Template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileImport}
          />
        </div>

        {tableMissing && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Backend table not created yet.</strong> Run the{" "}
            <code>leave_requests</code> section of{" "}
            <code>cm-a-t-enterprise-web-app/supabase-migration.sql</code> in the
            Supabase SQL Editor (project <code>aarqmoujwdhpfdlylyzp</code>
            ), then click Sync Now.
          </div>
        )}

        {synced && (
          <div className="mt-4">
            <Badge className="bg-green-100 text-green-800 border-green-300">
              {totalEntries} entr{totalEntries === 1 ? "y" : "ies"} from the
              shared backend — balances, calendar &amp; availability updated
              automatically
            </Badge>
          </div>
        )}

        {detected.length > 0 && (
          <div className="mt-4 rounded-lg border bg-blue-50/50 p-3">
            <p className="text-sm font-medium text-blue-800">
              {detected.length} CMaT leave request(s) detected in this browser
            </p>
            <div className="mt-2 max-h-32 space-y-1 overflow-auto">
              {detected.map((d, i) => (
                <p key={i} className="text-xs text-blue-700">
                  {d.employee} — {d.leaveType} ({d.startDate} → {d.endDate},{" "}
                  {d.days}d, {d.status})
                </p>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={importDetected}>
              Import into Dashboard
            </Button>
          </div>
        )}

        {importedCount > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {importedCount} manually imported entr
            {importedCount === 1 ? "y" : "ies"}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          <ExternalLink className="mr-1 inline h-3 w-3" />
          How it works: staff enter leave in the CMaT app →{" "}
          <code>saveAllLeaves</code> upserts to Supabase{" "}
          <code>leave_requests</code> → this dashboard pulls on load / Sync Now.
          Approvals and new entries made here are pushed back to the same table,
          so both apps always agree. localStorage remains an offline fallback.
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import React from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Database,
  Send,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Status badge colors matching the CMaT approval flow
// (pending → facility → county → program HR → approved)
const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  pending: {
    label: "Pending",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  facility_approved: {
    label: "Facility Approved",
    className: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  county_approved: {
    label: "County Approved",
    className: "bg-teal-100 text-teal-800 border-teal-300",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  returned: {
    label: "Returned",
    className: "bg-red-100 text-red-800 border-red-300",
  },
};

function statusInfo(status?: string) {
  const s = status?.toLowerCase() || "draft";
  return STATUS_BADGES[s] || STATUS_BADGES.draft;
}

function monthKey(year?: number, month?: number): string {
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth();
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthLabel(year?: number, month?: number): string {
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth();
  return `${MONTH_NAMES[m] ?? m + 1} ${y}`;
}

export default function TimesheetsPage() {
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<string>("");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  // Refresh when the tab regains focus, plus a slow 2-minute poll, so
  // timesheets submitted / approved in the CMaT app still appear without a
  // manual step — without re-rendering this page every 30 seconds.
  const { data, isLoading, mutate } = useSWR("/api/timesheet-sync", fetcher, {
    refreshInterval: 120000,
    revalidateOnFocus: false,
  });

  const entries: any[] = data?.entries || [];
  const tableMissing = !!data?.tableMissing;
  const offline = !!data?.offline;

  const pull = React.useCallback(async () => {
    setSyncing(true);
    await mutate();
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  }, [mutate]);

  React.useEffect(() => {
    if (data) setLastSync(new Date().toLocaleTimeString());
  }, [data]);

  // ── Months available in the data ──
  const months = React.useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e: any) => set.add(monthKey(e.year, e.month)));
    return Array.from(set).sort().reverse();
  }, [entries]);

  // ── KPIs ──
  const kpis = React.useMemo(() => {
    const total = entries.length;
    const byStatus = (s: string) =>
      entries.filter((e: any) => (e.status || "draft").toLowerCase() === s);
    const pending = byStatus("pending").length;
    const facility = byStatus("facility_approved").length;
    const county = byStatus("county_approved").length;
    const approved = byStatus("approved").length;
    const returned = byStatus("returned").length;
    const totalHours = entries.reduce(
      (sum: number, e: any) => sum + (Number(e.totalHoursWorked) || 0),
      0,
    );
    return { total, pending, facility, county, approved, returned, totalHours };
  }, [entries]);

  // ── Filters ──
  const filtered = React.useMemo(() => {
    return entries
      .filter((e: any) => {
        if (monthFilter !== "all" && monthKey(e.year, e.month) !== monthFilter)
          return false;
        if (
          statusFilter !== "all" &&
          (e.status || "draft").toLowerCase() !== statusFilter
        )
          return false;
        if (search) {
          const q = search.toLowerCase();
          const name = (
            e.staffName ||
            e.staffFullName ||
            e.staffEmail ||
            ""
          ).toLowerCase();
          const facility = (e.facility || "").toLowerCase();
          if (!name.includes(q) && !facility.includes(q)) return false;
        }
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.submittedAt || b.createdAt || "").getTime() -
          new Date(a.submittedAt || a.createdAt || "").getTime(),
      );
  }, [entries, monthFilter, statusFilter, search]);

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map((e: any) => ({
      STAFF: e.staffName || e.staffFullName || e.staffEmail || "Unknown",
      EMAIL: e.staffEmail || "",
      FACILITY: e.facility || "",
      MONTH: monthLabel(e.year, e.month),
      "TOTAL HOURS": Number(e.totalHoursWorked) || 0,
      STATUS: statusInfo(e.status).label,
      SUBMITTED: (e.submittedAt || e.createdAt || "").slice(0, 10),
      REVIEWED_BY:
        e.reviewedBy || e.hrName || e.countyRepName || e.supervisorName || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheets");
    XLSX.writeFile(
      wb,
      `timesheets_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const filterSelect =
    "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timesheets</h2>
          <p className="text-muted-foreground mt-1">
            Live staff timesheet submissions from the CMaT Enterprise app —
            auto-syncs every 30 seconds
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={pull} disabled={syncing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            Sync Now
          </Button>
        </div>
      </div>

      {tableMissing && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <Database className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Timesheets table not created yet
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Run the SQL in{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5">
                  supabase-timesheets-migration.sql
                </code>{" "}
                (project aarqmoujwdhpfdlylyzp → SQL Editor) once, then press
                “Sync Now”. Until then timesheets stay in the CMaT app locally.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {offline && !tableMissing && (
        <Card className="border-gray-300 bg-gray-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">
              Backend unreachable — showing the last synced data. The CMaT app
              keeps working offline and will re-sync when connectivity returns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-7 w-10" /> : kpis.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.totalHours.toLocaleString()} total hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Send className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {kpis.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting facility in-charge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facility Approved
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {kpis.facility}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting county rep
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              County Approved
            </CardTitle>
            <ShieldCheck className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {kpis.county}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting program HR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {kpis.approved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">fully approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {kpis.returned}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              sent back to staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Submissions</CardTitle>
          <CardDescription>
            {filtered.length} of {entries.length} submissions
            {lastSync && (
              <span className="ml-2 text-muted-foreground">
                · last synced {lastSync}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <select
              className={filterSelect}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {months.map((m) => {
                const [y, mm] = m.split("-").map(Number);
                return (
                  <option key={m} value={m}>
                    {monthLabel(y, mm - 1)}
                  </option>
                );
              })}
            </select>
            <select
              className={filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_BADGES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
            <input
              className={filterSelect}
              placeholder="Search staff or facility…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2 md:justify-end">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {lastSync || "…"}
              </Badge>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approval Trail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && entries.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {entries.length === 0
                        ? "No timesheet submissions yet — staff submit monthly timesheets in the CMaT app and they appear here automatically."
                        : "No submissions match the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e: any, idx: number) => {
                    const s = statusInfo(e.status);
                    const trail = [
                      e.supervisorName,
                      e.countyRepName,
                      e.hrName,
                    ].filter(Boolean);
                    return (
                      <TableRow key={e.id || idx}>
                        <TableCell className="font-medium">
                          {e.staffName ||
                            e.staffFullName ||
                            e.staffEmail ||
                            "Unknown"}
                          <div className="text-xs text-muted-foreground font-normal">
                            {e.staffEmail || ""}
                          </div>
                        </TableCell>
                        <TableCell>{e.facility || "—"}</TableCell>
                        <TableCell>{monthLabel(e.year, e.month)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(e.totalHoursWorked) || 0}
                        </TableCell>
                        <TableCell>
                          <Badge className={s.className}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {(e.submittedAt || e.createdAt || "").slice(0, 10) ||
                            "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {trail.length > 0 ? trail.join(" → ") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

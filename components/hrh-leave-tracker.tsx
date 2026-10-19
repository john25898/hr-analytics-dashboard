"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CalendarDays,
  TrendingUp,
  MapPin,
  Briefcase,
  Search,
  Sun,
  Phone,
  Mail,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  UserRound,
  X,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Static HRH Tracker data (extracted from the Excel workbook) ─────────────
import trackerData from "@/data/hrh-leave-tracker-data.json";

const summary: any = (trackerData as any).summary;
const staffMaster: any[] = (trackerData as any).staff;
const leaveRecords: any[] = (trackerData as any).records;
const utilization: any[] = (trackerData as any).utilization;
const holidays: string[] = (trackerData as any).holidays;
const masterList: any[] = (trackerData as any).masterList;

const MONTH_NAMES = [
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

const STATUS_COLORS: Record<string, string> = {
  Approved: "bg-green-100 text-green-800 border-green-300",
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  Rejected: "bg-red-100 text-red-800 border-red-300",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-300",
};

const TYPE_COLORS: Record<string, string> = {
  "Annual Leave": "#3b82f6",
  "Sick Leave": "#10b981",
  "Maternity/Paternity Leave": "#ec4899",
  "Maternity Leave": "#ec4899",
  "Paternity Leave": "#8b5cf6",
  "Study Leave": "#f59e0b",
  "Compassionate Leave": "#14b8a6",
};

const getTypeColor = (t: string) => TYPE_COLORS[t] || "#64748b";

const fmtDate = (d: string) => {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
};

const monthLabel = (d: string) => {
  const p = d.split("-");
  if (p.length !== 3) return "";
  const m = parseInt(p[1], 10) - 1;
  return MONTH_NAMES[m] || "";
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Summary Dashboard (mirrors the Excel "Summary Dashboard" sheet)
// ─────────────────────────────────────────────────────────────────────────────
function SummaryTab({ kpiExtra }: { kpiExtra?: React.ReactNode }) {
  const countyData = (summary?.leaveByCounty || []).map((c: any) => ({
    ...c,
    label: c.county.replace(" County", ""),
  }));
  const cadreData = (summary?.leaveByCadre || []).slice(0, 12);

  const totalTaken = countyData.reduce((s: number, c: any) => s + c.taken, 0);
  const totalPending = countyData.reduce(
    (s: number, c: any) => s + (c.pending || 0),
    0,
  );
  const totalAllocated = countyData.reduce(
    (s: number, c: any) => s + (c.totalLeaveDays || 0),
    0,
  );
  const utilizationPct =
    totalAllocated > 0 ? Math.round((totalTaken / totalAllocated) * 100) : 0;

  // Staff headcount by county / cadre — the Leave by County and Leave by
  // Department cards count STAFF (from the 181 master list), not leave days.
  const countyStaffData = React.useMemo(() => {
    const map = new Map<string, number>();
    staffMaster.forEach((s: any) => {
      const c = (s.county || "Unknown").replace(/\s*County$/i, "");
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([county, staff]) => ({ county, label: county, staff }))
      .sort((a, b) => b.staff - a.staff);
  }, []);

  const cadreStaffData = React.useMemo(() => {
    const map = new Map<string, number>();
    staffMaster.forEach((s: any) => {
      const c = s.cadre || "Unknown";
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cadre, staff]) => ({ cadre, staff }))
      .sort((a, b) => b.staff - a.staff);
  }, []);

  return (
    <div className="space-y-4">
      {/* KPI cards — same numbers as the workbook */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.totalStaff ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              across {countyData.length} counties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Leave Days
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {totalPending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting approval across counties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Leave Utilization
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{utilizationPct}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              of allocated leave days used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executive KPI cards — rendered just above Leave by County */}
      {kpiExtra}

      {/* Leave by County */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" /> Leave by County
            </CardTitle>
            <CardDescription>
              Staff headcount per county (from the 181 HRH master list)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>County</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="w-40">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countyStaffData.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.county}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {c.staff}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-teal-500"
                              style={{
                                width: `${Math.round(
                                  (c.staff / (summary?.totalStaff || 181)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(
                              (c.staff / (summary?.totalStaff || 181)) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countyStaffData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar
                    dataKey="staff"
                    name="Staff"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leave by Department / Cadre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet-600" /> Leave by
              Department
            </CardTitle>
            <CardDescription>Staff headcount by cadre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadre</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="w-32">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cadreStaffData.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.cadre}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {c.staff}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{
                                width: `${Math.round(
                                  (c.staff / (summary?.totalStaff || 181)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {Math.round(
                              (c.staff / (summary?.totalStaff || 181)) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.totalStaff ?? 181} staff across {cadreStaffData.length}{" "}
              cadres
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editable days-taken number + Staff leave detail modal
// ─────────────────────────────────────────────────────────────────────────────
const EDITS_KEY = "hrh-tracker-edits";
const LOCAL_RECORDS_KEY = "hrh-tracker-records";

// Inclusive count of weekdays between two YYYY-MM-DD dates
const countWorkdays = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// Leave records = static workbook records + records added in the browser + any
// records synced live from the CMaT app (passed down by the parent page).
function useLeaveRecords(external?: any[]) {
  const [local, setLocal] = React.useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_RECORDS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

  const addRecord = React.useCallback((rec: any) => {
    setLocal((prev) => {
      const next = [
        ...prev,
        {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...rec,
        },
      ];
      try {
        localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const records = React.useMemo(() => {
    const all = [...leaveRecords, ...local, ...(external || [])];
    const seen = new Map<string, any>();
    for (const r of all) {
      // Dedup by id when available; otherwise by a composite key so synced
      // records don't double-count against the static workbook.
      const key = r.id
        ? String(r.id)
        : `${r.name}|${r.leaveType}|${r.startDate}|${r.endDate}`;
      seen.set(key, r);
    }
    return Array.from(seen.values());
  }, [local, external]);

  return { records, addRecord };
}

// Used-days edits persisted in the browser
function useEdits() {
  const [edits, setEdits] = React.useState<
    Record<string, Record<string, number>>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(EDITS_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const saveEdit = React.useCallback(
    (
      staffName: string,
      key: "annual" | "sick" | "maternity",
      value: number,
    ) => {
      setEdits((prev) => {
        const next = {
          ...prev,
          [staffName]: { ...(prev[staffName] || {}), [key]: value },
        };
        try {
          localStorage.setItem(EDITS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [],
  );

  return { edits, saveEdit };
}

function EditableUsed({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) onSave(n);
    else setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        className="h-7 w-16 rounded-md border border-input bg-background px-1 text-center text-sm tabular-nums"
        value={draft}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      title="Click to edit days taken"
      className="inline-flex h-7 min-w-10 items-center justify-center rounded-md px-1.5 text-sm font-semibold tabular-nums hover:bg-muted hover:ring-1 hover:ring-ring"
      onClick={(e) => {
        e.stopPropagation();
        setDraft(String(value));
        setEditing(true);
      }}
    >
      {value}
    </button>
  );
}

const LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Study Leave",
  "Compassionate Leave",
  "Unpaid Leave",
];

function RegisterLeaveForm({
  county,
  cadre,
  onAdd,
}: {
  county?: string;
  cadre?: string;
  onAdd: (rec: any) => void;
}) {
  const [leaveType, setLeaveType] = React.useState("Annual Leave");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [days, setDays] = React.useState(0);
  const [daysTouched, setDaysTouched] = React.useState(false);
  const [status, setStatus] = React.useState("Approved");
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    if (startDate && endDate && !daysTouched) {
      setDays(countWorkdays(startDate, endDate));
    }
  }, [startDate, endDate, daysTouched]);

  const valid = !!(startDate && endDate && days > 0);

  const submit = () => {
    if (!valid) return;
    onAdd({ leaveType, startDate, endDate, days, status });
    setAdded(true);
    setLeaveType("Annual Leave");
    setStartDate("");
    setEndDate("");
    setDays(0);
    setDaysTouched(false);
    setStatus("Approved");
    window.setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Leave type
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            From
          </label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            To
          </label>
          <input
            type="date"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Days
          </label>
          <input
            type="number"
            min={1}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={days || ""}
            onChange={(e) => {
              setDaysTouched(true);
              setDays(parseInt(e.target.value, 10) || 0);
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!valid}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
          onClick={submit}
        >
          Add Leave Record
        </button>
        {added && (
          <span className="text-sm font-medium text-emerald-600">
            ✓ Leave added
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {(county || "—") + (cadre ? ` · ${cadre}` : "")}
        </span>
      </div>
    </div>
  );
}

function StaffDetailModal({
  name,
  edits,
  onSaveEdit,
  records,
  onAddLeave,
  onManualAdd,
  onClose,
}: {
  name: string;
  edits: Record<string, Record<string, number>>;
  onSaveEdit: (
    staffName: string,
    key: "annual" | "sick" | "maternity",
    value: number,
  ) => void;
  records: any[];
  onAddLeave: (rec: any) => void;
  onManualAdd?: (rec: any) => void;
  onClose: () => void;
}) {
  const util = utilization.find((u) => u.name === name);
  const recs = records.filter((r) => r.name === name);
  const master =
    DIRECTORY.find((s) => s.name === name) ||
    staffMaster.find((s) => s.name === name);

  const handleAddLeave = (rec: any) => {
    onAddLeave({ ...rec, name });
    // Also surface to the parent page so the Leave Log / Automatic Leave
    // Balances / KPIs update AND the entry syncs to the shared backend.
    onManualAdd?.({
      employee: name,
      leaveType: rec.leaveType,
      startDate: rec.startDate,
      endDate: rec.endDate,
      days: rec.days,
      status: rec.status,
    });
    const t = rec.leaveType.toLowerCase();
    if (t.includes("annual")) {
      const cur = edits[name]?.annual ?? util?.annual?.used ?? 0;
      onSaveEdit(name, "annual", cur + (rec.days || 0));
    } else if (t.includes("sick")) {
      const cur = edits[name]?.sick ?? util?.sick?.used ?? 0;
      onSaveEdit(name, "sick", cur + (rec.days || 0));
    } else if (t.includes("maternity") || t.includes("paternity")) {
      const cur = edits[name]?.maternity ?? util?.maternity?.used ?? 0;
      onSaveEdit(name, "maternity", cur + (rec.days || 0));
    }
  };

  const types = [
    {
      key: "annual" as const,
      label: "Annual Leave",
      ent: util?.annual?.entitlement ?? 0,
      used: edits[name]?.annual ?? util?.annual?.used ?? 0,
      color: "#3b82f6",
    },
    {
      key: "sick" as const,
      label: "Sick Leave",
      ent: util?.sick?.entitlement ?? 0,
      used: edits[name]?.sick ?? util?.sick?.used ?? 0,
      color: "#10b981",
    },
    {
      key: "maternity" as const,
      label: "Maternity/Paternity",
      ent: util?.maternity?.entitlement ?? 0,
      used: edits[name]?.maternity ?? util?.maternity?.used ?? 0,
      color: "#ec4899",
    },
  ];

  const distMap: Record<string, number> = {};
  recs.forEach((r) => {
    distMap[r.leaveType] = (distMap[r.leaveType] || 0) + (r.days || 0);
  });
  const distData = Object.entries(distMap).map(([t, days]) => ({
    type: t,
    days,
    fill: getTypeColor(t),
  }));
  const totalDays = recs.reduce((s, r) => s + (r.days || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <UserRound className="h-5 w-5 text-teal-600" />
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {master?.county || util?.county || "—"}
              {master?.cadre || util?.cadre
                ? ` · ${master?.cadre || util?.cadre}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick facts */}
        {master && (
          <>
            <div className="mb-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="truncate">
                <span className="text-muted-foreground">Sex: </span>
                {master.sex}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">ID No: </span>
                {master.idNo}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Phone: </span>
                {master.phone}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Email: </span>
                {master.email}
              </div>
            </div>
            <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="truncate">
                <span className="text-muted-foreground">Station: </span>
                {master.station}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Sub County: </span>
                {master.subCounty}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Employed: </span>
                {master.dateEmployed}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Education: </span>
                {master.education}
              </div>
            </div>
          </>
        )}

        {/* Utilization cards with inline edit + remaining */}
        <div className="grid gap-3 sm:grid-cols-3">
          {types.map((t) => {
            const rem = Math.max(0, t.ent - t.used);
            const pct = t.ent > 0 ? Math.round((t.used / t.ent) * 100) : 0;
            return (
              <div key={t.key} className="rounded-lg border p-3">
                <div className="text-xs font-medium text-muted-foreground">
                  {t.label}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <EditableUsed
                    value={t.used}
                    onSave={(v) => onSaveEdit(name, t.key, v)}
                  />
                  <span className="text-xs text-muted-foreground">
                    / {t.ent} days
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: t.color,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">{pct}% used</span>
                  <span className="font-semibold" style={{ color: t.color }}>
                    {rem} remaining
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Distribution + records */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-semibold">Leave Distribution</h4>
            {distData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No leave records for this staff member
              </p>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distData}
                        dataKey="days"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {distData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1">
                  {distData.map((d) => (
                    <div
                      key={d.type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.fill }}
                        />
                        {d.type}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {d.days} days
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums">
                      {totalDays} days
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-semibold">
              Leave Records ({recs.length})
            </h4>
            {recs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No records
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recs.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.leaveType}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {fmtDate(r.startDate)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {fmtDate(r.endDate)}
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          {r.days}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[r.status] || "bg-gray-100"}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Register leave */}
        <div className="mt-5 rounded-lg border p-4">
          <h4 className="mb-3 text-sm font-semibold">Register Leave</h4>
          <RegisterLeaveForm
            county={master?.county || util?.county}
            cadre={master?.cadre || util?.cadre}
            onAdd={handleAddLeave}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Staff Utilization (mirrors the "Staff Utilization" sheet)
// ─────────────────────────────────────────────────────────────────────────────
function UtilizationTab({ onManualAdd }: { onManualAdd?: (rec: any) => void }) {
  const [countyFilter, setCountyFilter] = React.useState("all");
  const [cadreFilter, setCadreFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [showZero, setShowZero] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);
  const { edits, saveEdit } = useEdits();
  const { records, addRecord } = useLeaveRecords();

  const counties = React.useMemo(
    () => [...new Set(utilization.map((u) => u.county).filter(Boolean))].sort(),
    [],
  );
  const cadres = React.useMemo(
    () => [...new Set(utilization.map((u) => u.cadre).filter(Boolean))].sort(),
    [],
  );

  const rows = React.useMemo(
    () =>
      utilization.filter((u) => {
        if (countyFilter !== "all" && u.county !== countyFilter) return false;
        if (cadreFilter !== "all" && u.cadre !== cadreFilter) return false;
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (!showZero) {
          const annualUsed = edits[u.name]?.annual ?? u.annual?.used ?? 0;
          const sickUsed = edits[u.name]?.sick ?? u.sick?.used ?? 0;
          const matUsed = edits[u.name]?.maternity ?? u.maternity?.used ?? 0;
          if (annualUsed + sickUsed + matUsed === 0) return false;
        }
        return true;
      }),
    [utilization, countyFilter, cadreFilter, search, showZero, edits],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Leave Utilization</CardTitle>
          <CardDescription>
            Click any row to view a staff member's leave distribution. Click any
            used-days number to edit — remaining days recalculate automatically.
            Edits are saved in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
            >
              <option value="all">All Counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={cadreFilter}
              onChange={(e) => setCadreFilter(e.target.value)}
            >
              <option value="all">All Cadres</option>
              {cadres.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="h-9 w-56 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm"
                placeholder="Search staff…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showZero}
                onChange={(e) => setShowZero(e.target.checked)}
              />
              Show staff with 0 days used
            </label>
            <span className="text-xs text-muted-foreground ml-auto">
              {rows.length} of {utilization.length} staff
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>County</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Cadre</TableHead>
                  <TableHead className="text-center">Annual Used</TableHead>
                  <TableHead className="text-center">
                    Annual Remaining
                  </TableHead>
                  <TableHead className="text-center">Sick Used</TableHead>
                  <TableHead className="text-center">Sick Remaining</TableHead>
                  <TableHead className="text-center">Mat/Pat Used</TableHead>
                  <TableHead className="text-center">
                    Mat/Pat Remaining
                  </TableHead>
                  <TableHead className="text-center">Total Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No staff match the current filters
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((u: any, i: number) => {
                  const annualUsed =
                    edits[u.name]?.annual ?? u.annual?.used ?? 0;
                  const annualEnt = u.annual?.entitlement ?? 0;
                  const annualRem = Math.max(0, annualEnt - annualUsed);
                  const sickUsed = edits[u.name]?.sick ?? u.sick?.used ?? 0;
                  const sickEnt = u.sick?.entitlement ?? 0;
                  const sickRem = Math.max(0, sickEnt - sickUsed);
                  const matUsed =
                    edits[u.name]?.maternity ?? u.maternity?.used ?? 0;
                  const matEnt = u.maternity?.entitlement ?? 0;
                  const matRem = Math.max(0, matEnt - matUsed);
                  const totalUsed = annualUsed + sickUsed + matUsed;
                  return (
                    <TableRow
                      key={i}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(u.name)}
                    >
                      <TableCell className="text-xs">{u.county}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap hover:text-teal-600 hover:underline"
                          onClick={() => setSelected(u.name)}
                          title="Click to view leave distribution"
                        >
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {u.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs">{u.cadre}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <EditableUsed
                              value={annualUsed}
                              onSave={(v) => saveEdit(u.name, "annual", v)}
                            />
                            <span className="text-xs text-muted-foreground">
                              /{annualEnt}
                            </span>
                          </div>
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{
                                width: `${
                                  annualEnt > 0
                                    ? Math.min(
                                        100,
                                        (annualUsed / annualEnt) * 100,
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-emerald-600 tabular-nums">
                          {annualRem}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <EditableUsed
                              value={sickUsed}
                              onSave={(v) => saveEdit(u.name, "sick", v)}
                            />
                            <span className="text-xs text-muted-foreground">
                              /{sickEnt}
                            </span>
                          </div>
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{
                                width: `${
                                  sickEnt > 0
                                    ? Math.min(100, (sickUsed / sickEnt) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-emerald-600 tabular-nums">
                          {sickRem}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <EditableUsed
                              value={matUsed}
                              onSave={(v) => saveEdit(u.name, "maternity", v)}
                            />
                            <span className="text-xs text-muted-foreground">
                              /{matEnt}
                            </span>
                          </div>
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-pink-500"
                              style={{
                                width: `${
                                  matEnt > 0
                                    ? Math.min(100, (matUsed / matEnt) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-emerald-600 tabular-nums">
                          {matRem}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {totalUsed}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <StaffDetailModal
          name={selected}
          edits={edits}
          onSaveEdit={saveEdit}
          records={records}
          onAddLeave={addRecord}
          onManualAdd={onManualAdd}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Leave Records (mirrors the "Leave Records" sheet)
// ─────────────────────────────────────────────────────────────────────────────
function RecordsTab({ externalRecords }: { externalRecords?: any[] }) {
  const { records } = useLeaveRecords(externalRecords);
  const [countyFilter, setCountyFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const PAGE_SIZE = 25;

  const counties = React.useMemo(
    () => [...new Set(records.map((r) => r.county).filter(Boolean))].sort(),
    [records],
  );
  const types = React.useMemo(
    () => [...new Set(records.map((r) => r.leaveType).filter(Boolean))].sort(),
    [records],
  );

  React.useEffect(
    () => setPage(0),
    [countyFilter, typeFilter, statusFilter, monthFilter, search],
  );

  const filtered = React.useMemo(
    () =>
      records.filter((r) => {
        if (countyFilter !== "all" && r.county !== countyFilter) return false;
        if (typeFilter !== "all" && r.leaveType !== typeFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (monthFilter !== "all" && monthLabel(r.startDate) !== monthFilter)
          return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !r.name.toLowerCase().includes(q) &&
            !r.leaveType.toLowerCase().includes(q) &&
            !r.cadre.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [records, countyFilter, typeFilter, statusFilter, monthFilter, search],
  );

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Leave Records</CardTitle>
          <CardDescription>
            {records.length} leave entries (workbook + locally added) — filter
            by county, type, status, month, or search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
            >
              <option value="all">All Counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Leave Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm"
                placeholder="Search name / type / cadre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>County</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Cadre</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No leave records match the current filters
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.county}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.name}
                    </TableCell>
                    <TableCell className="text-xs">{r.cadre}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: getTypeColor(r.leaveType) }}
                        />
                        {r.leaveType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtDate(r.startDate)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtDate(r.endDate)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {r.days}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[r.status] || "bg-gray-100"}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                {page + 1} / {totalPages}
              </span>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-40"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — Staff Directory (Staff Master Data + Master List combined)
// ─────────────────────────────────────────────────────────────────────────────
const DIRECTORY: any[] = staffMaster.map((s: any) => {
  const m = masterList.find((x: any) => x["EMPLOYEE NAME"] === s.name);
  return {
    ...s,
    designation: m?.["DESIGNATION"] || s.cadre || "—",
    subCounty: m?.["SUB COUNTY"] || "—",
    station: m?.["STATION"] || "—",
    dateEmployed: m?.["DATE EMPLOYED"] || "—",
    education: m?.["EDUCATION LEVEL"] || "—",
  };
});

function StaffDirectoryTab({
  onManualAdd,
}: {
  onManualAdd?: (rec: any) => void;
}) {
  const [countyFilter, setCountyFilter] = React.useState("all");
  const [designationFilter, setDesignationFilter] = React.useState("all");
  const [sexFilter, setSexFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const { edits, saveEdit } = useEdits();
  const { records, addRecord } = useLeaveRecords();
  const PAGE_SIZE = 15;

  const counties = React.useMemo(
    () => [...new Set(DIRECTORY.map((s) => s.county).filter(Boolean))].sort(),
    [],
  );
  const designations = React.useMemo(
    () =>
      [...new Set(DIRECTORY.map((s) => s.designation).filter(Boolean))].sort(),
    [],
  );

  React.useEffect(
    () => setPage(0),
    [countyFilter, designationFilter, sexFilter, search],
  );

  const filtered = React.useMemo(
    () =>
      DIRECTORY.filter((s) => {
        if (countyFilter !== "all" && s.county !== countyFilter) return false;
        if (designationFilter !== "all" && s.designation !== designationFilter)
          return false;
        if (sexFilter !== "all" && s.sex !== sexFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !s.name.toLowerCase().includes(q) &&
            !s.designation.toLowerCase().includes(q) &&
            !s.station.toLowerCase().includes(q) &&
            !s.phone.toLowerCase().includes(q) &&
            !s.email.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [countyFilter, designationFilter, sexFilter, search],
  );

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            {DIRECTORY.length} staff — master data plus employment and station
            details. Click a name to view their leave distribution and register
            leave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
            >
              <option value="all">All Counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
            >
              <option value="all">All Designations</option>
              {designations.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
            >
              <option value="all">All Genders</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
            <div className="relative md:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm"
                placeholder="Search name / designation / station…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>County</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-center">Sex</TableHead>
                  <TableHead>Sub County</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date Employed</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead className="text-center">Annual</TableHead>
                  <TableHead className="text-center">Sick</TableHead>
                  <TableHead className="text-center">Maternity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No staff match the current filters
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{s.county}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap hover:text-teal-600 hover:underline"
                        onClick={() => setSelected(s.name)}
                        title="View leave distribution / register leave"
                      >
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">{s.designation}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          s.sex === "F"
                            ? "bg-pink-50 text-pink-700 border-pink-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {s.sex === "F" ? "F" : "M"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.subCounty}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {s.station}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {s.phone}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {s.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {s.dateEmployed}
                    </TableCell>
                    <TableCell className="text-xs">{s.education}</TableCell>
                    <TableCell className="text-center">
                      {s.annualEntitlement}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.sickEntitlement}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.maternityEntitlement}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} staff
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                {page + 1} / {totalPages}
              </span>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-40"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <StaffDetailModal
          name={selected}
          edits={edits}
          onSaveEdit={saveEdit}
          records={records}
          onAddLeave={addRecord}
          onManualAdd={onManualAdd}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5 — Holidays
// ─────────────────────────────────────────────────────────────────────────────
function HolidaysTab() {
  const holidayObjs = holidays.map((d) => {
    const p = d.split("-");
    return {
      date: d,
      day: p[2] || "",
      month: p[1] ? MONTH_NAMES[parseInt(p[1], 10) - 1] : "",
      year: p[0] || "",
    };
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Public Holidays</CardTitle>
          <CardDescription>
            Tracked public holidays — leave does not consume entitlement on
            these days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holidayObjs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No holidays recorded
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {holidayObjs.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <Sun className="h-4 w-4" />
                    <span className="text-xs font-bold">{h.month}</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold leading-none">
                      {h.day}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {h.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HRH Tracker — tabbed component mirroring the Excel workbook
// ─────────────────────────────────────────────────────────────────────────────
export function HrhLeaveTracker({
  summaryExtra,
  kpiExtra,
  externalRecords,
  onManualAdd,
}: {
  summaryExtra?: React.ReactNode;
  kpiExtra?: React.ReactNode;
  externalRecords?: any[];
  onManualAdd?: (rec: any) => void;
}) {
  return (
    <Tabs defaultValue="summary" className="gap-4">
      <TabsList variant="line" className="h-10 gap-1">
        <TabsTrigger value="summary" className="px-4 py-2">
          <TrendingUp className="mr-2 h-4 w-4 text-teal-600" /> Summary
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="utilization" className="px-4 py-2">
          <CalendarDays className="mr-2 h-4 w-4 text-blue-600" /> Staff
          Utilization
        </TabsTrigger>
        <TabsTrigger value="records" className="px-4 py-2">
          <Fingerprint className="mr-2 h-4 w-4 text-violet-600" /> Leave Records
        </TabsTrigger>
        <TabsTrigger value="directory" className="px-4 py-2">
          <Users className="mr-2 h-4 w-4 text-emerald-600" /> Staff Directory
        </TabsTrigger>
        <TabsTrigger value="holidays" className="px-4 py-2">
          <Sun className="mr-2 h-4 w-4 text-amber-600" /> Holidays
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-0">
        <SummaryTab kpiExtra={kpiExtra} />
        {summaryExtra}
      </TabsContent>
      <TabsContent value="utilization" className="mt-0">
        <UtilizationTab onManualAdd={onManualAdd} />
      </TabsContent>
      <TabsContent value="records" className="mt-0">
        <RecordsTab externalRecords={externalRecords} />
      </TabsContent>
      <TabsContent value="directory" className="mt-0">
        <StaffDirectoryTab onManualAdd={onManualAdd} />
      </TabsContent>
      <TabsContent value="holidays" className="mt-0">
        <HolidaysTab />
      </TabsContent>
    </Tabs>
  );
}

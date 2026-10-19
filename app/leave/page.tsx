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
import { EmployeeEditModal } from "@/components/employee-edit-modal";
import { LeaveSyncPanel } from "@/components/leave-sync-panel";
import { HrhLeaveTracker } from "@/components/hrh-leave-tracker";
import trackerData from "@/data/hrh-leave-tracker-data.json";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Printer,
  Plane,
  Sun,
  Download,
  Users,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const STATUS_COLORS: Record<string, string> = {
  Approved: "bg-green-100 text-green-800 border-green-300",
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  Rejected: "bg-red-100 text-red-800 border-red-300",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-300",
};

// Inclusive count of weekdays between two YYYY-MM-DD dates (same rule as the
// HRH tracker: weekends don't count as leave days).
const countWorkdays = (start: string, end: string): number => {
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

export default function LeavePage() {
  const { data, isLoading } = useSWR("/api/leave", fetcher);
  // Central HR roster (181 active employees — the same people as the CMaT logins)
  const { data: rosterData } = useSWR("/api/employees?limit=1000", fetcher);
  // Mirror of the CMaT staff roster (pushed on login in the CMaT app)
  const { data: syncData } = useSWR("/api/staff-sync", fetcher, {
    refreshInterval: 180000,
    revalidateOnFocus: true,
  });

  const leaveTypes: any[] = data?.leaveTypes || [];
  const rosterEmployees: any[] = rosterData?.data || [];
  const syncedStaff: any[] = syncData?.staff || [];

  // Full staff list for filters / Gantt / balances / availability:
  // the central HR roster (181) from employees-enriched.json is the single
  // system of record — the same list the Dashboard and Employees tabs use.
  // The tracker workbook staff list only appears as a fallback if the roster
  // API is ever unavailable, keeping every tab harmonized at 181.
  const employees = React.useMemo(() => {
    const seen = new Map<string, any>();
    const add = (name: string, extra: any = {}) => {
      if (!name) return;
      const key = name.trim().toLowerCase();
      const existing = seen.get(key);
      if (existing) {
        // Enrich with any new info — e.g. the CMaT synced roster carries
        // real emails/facilities that the master DB rows may lack.
        for (const [k, v] of Object.entries(extra)) {
          if (v && !existing[k]) existing[k] = v;
        }
        return;
      }
      seen.set(key, { name: name.trim(), ...extra });
    };
    const trackerStaff: any[] = (trackerData as any).staff || [];
    if (rosterEmployees.length > 0) {
      rosterEmployees.forEach((e: any) =>
        add(e.name, {
          facility: e.station || e.facility || "",
          county: (e.county || "").replace(/\s*County$/i, ""),
          cadre: e.designation || e.designationOriginal || "",
          designation: e.designation || "",
          email: e.email || "",
          phone: e.phone || "",
          idNo: e.idNo || "",
          sex: e.gender || "",
        }),
      );
    } else if (trackerStaff.length > 0) {
      trackerStaff.forEach((s: any) =>
        add(s.name, {
          county: (s.county || "").replace(/\s*County$/i, ""),
          cadre: s.cadre || "",
          email: s.email || "",
          phone: s.phone || "",
          idNo: s.idNo || "",
          sex: s.sex || "",
        }),
      );
    }
    syncedStaff.forEach((s: any) =>
      add(s.name || s.staffName || s.email, {
        facility: s.facility || "",
        county: s.county || "",
        email: s.email || s.staffEmail || "",
        designation: s.jobTitle || "",
        isSynced: true,
      }),
    );
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rosterEmployees, syncedStaff]);
  const excelLog: any[] = data?.leaveLog || [];
  const holidays: any[] = data?.kenyaHolidays || [];
  const balances: any[] = data?.balances || [];

  // Real HRH tracker records (the system of record mirroring the Excel
  // workbook) — merged below so the executive dashboard reflects actual leave.
  const trackerLog = React.useMemo(() => {
    const records: any[] = (trackerData as any).records || [];
    return records.map((r: any, idx: number) => ({
      id: `hrh-${idx}`,
      employee: r.name,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      status: r.status,
    }));
  }, []);

  // Per-staff entitlements from the HRH tracker (annual / sick / maternity)
  const trackerUtil: any[] = (trackerData as any).utilization || [];

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // Entries synced from the CMaT Enterprise app
  const [cmatEntries, setCmatEntries] = React.useState<any[]>([]);

  // Live approved leave days from CMaT sync + manual HR additions. These are
  // NOT in the static workbook, so they must be subtracted from each staff
  // member's remaining balance (used + remaining recalc automatically).
  const liveUsedByStaffType = React.useMemo(() => {
    const map = new Map<string, number>();
    cmatEntries.forEach((l: any) => {
      if (l.status !== "Approved") return;
      const key = `${l.employee}|${l.leaveType}`;
      map.set(key, (map.get(key) || 0) + (l.days || 0));
    });
    return map;
  }, [cmatEntries]);

  // Unified leave log: HRH tracker records + Excel planner + CMaT sync.
  // Deduped by id (last wins) so an entry that lives in both local storage and
  // the shared backend isn't double-counted, and CMaT approval status wins.
  const leaveLog = React.useMemo(() => {
    const all = [...excelLog, ...trackerLog, ...cmatEntries];
    const seen = new Map<string, any>();
    for (const e of all) {
      seen.set(String(e.id), e);
    }
    return Array.from(seen.values());
  }, [excelLog, trackerLog, cmatEntries]);

  // Live CMaT-synced leave, mapped into the HRH tracker record shape so the
  // tracker's "Leave Records" tab shows new requests / status updates from the
  // CMaT app as they happen (deduped inside the tracker by id/composite key).
  const trackerExternalRecords = React.useMemo(() => {
    return leaveLog
      .filter((l: any) => l.startDate)
      .map((l: any) => ({
        id: l.id,
        name: l.employee,
        county: l.county || "",
        cadre: l.cadre || "",
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        status: l.status,
        source:
          l.source || (l.id && String(l.id).startsWith("ts_") ? "CMaT" : ""),
      }));
  }, [leaveLog]);

  // ── Filters ──
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [selectedMonth, setSelectedMonth] = React.useState(
    new Date().getMonth(),
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  // Roster search — narrows the Gantt calendar rows and balances table to a
  // single staff member when managing the full 181-employee roster.
  const [ganttSearch, setGanttSearch] = React.useState("");
  const [balanceSearch, setBalanceSearch] = React.useState("");

  // Employee details drawer — opened by clicking any row that names a worker.
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  // Resolve a staff member's full record (roster has the complete profile:
  // contract dates, license, provisions…) so the drawer opens with their data.
  const openEmployeeDetails = React.useCallback(
    (name: string) => {
      if (!name) return;
      const full =
        rosterEmployees.find(
          (e: any) => (e.name || "").toLowerCase() === name.toLowerCase(),
        ) ||
        employees.find(
          (e: any) => (e.name || "").toLowerCase() === name.toLowerCase(),
        );
      if (!full) return;
      setSelectedEmployee(full);
      setEditModalOpen(true);
    },
    [rosterEmployees, employees],
  );

  // ── Derived: filtered log ──
  const filteredLog = React.useMemo(() => {
    return leaveLog.filter((l: any) => {
      if (employeeFilter !== "all" && l.employee !== employeeFilter)
        return false;
      if (typeFilter !== "all" && l.leaveType !== typeFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (monthFilter !== "all") {
        const d = new Date(l.startDate);
        if (d.getMonth() + 1 !== parseInt(monthFilter)) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !l.employee.toLowerCase().includes(q) &&
          !l.leaveType.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [
    leaveLog,
    employeeFilter,
    typeFilter,
    statusFilter,
    monthFilter,
    searchTerm,
  ]);

  // ── KPIs ──
  const kpis = React.useMemo(() => {
    const onLeaveNow = leaveLog.filter(
      (l: any) =>
        l.status === "Approved" &&
        l.startDate <= todayISO &&
        l.endDate >= todayISO,
    );
    const pending = leaveLog.filter((l: any) => l.status === "Pending");
    const totalDaysUsed = leaveLog
      .filter((l: any) => l.status === "Approved")
      .reduce((sum: number, l: any) => sum + (l.days || 0), 0);
    const totalEntitlement = trackerUtil.reduce(
      (sum: number, u: any) => sum + (u.annual?.entitlement || 0),
      0,
    );
    const totalBalance =
      trackerUtil.reduce(
        (sum: number, u: any) => sum + (u.annual?.remaining || 0),
        0,
      ) -
      Array.from(liveUsedByStaffType.entries())
        .filter(([k]) => k.endsWith("|Annual Leave"))
        .reduce((s: number, [, v]) => s + v, 0);
    const onLeaveNames = onLeaveNow.map((l: any) => l.employee);
    // Approved leave overlapping the current calendar month
    const [curY, curM] = todayISO.split("-").map(Number);
    const monthStart = `${curY}-${String(curM).padStart(2, "0")}-01`;
    const lastDay = new Date(curY, curM, 0).getDate();
    const monthEnd = `${curY}-${String(curM).padStart(2, "0")}-${String(
      lastDay,
    ).padStart(2, "0")}`;
    const onLeaveThisMonth = leaveLog.filter(
      (l: any) =>
        l.status === "Approved" &&
        l.startDate <= monthEnd &&
        l.endDate >= monthStart,
    );
    return {
      onLeaveNow: onLeaveNow.length,
      onLeaveNames: [...new Set(onLeaveNames)],
      pending: pending.length,
      totalDaysUsed,
      totalEntitlement,
      totalBalance,
      availableNow: employees.length - onLeaveNow.length,
      onLeaveThisMonth: [
        ...new Set(onLeaveThisMonth.map((l: any) => l.employee)),
      ].length,
      onLeaveThisMonthNames: [
        ...new Set(onLeaveThisMonth.map((l: any) => l.employee)),
      ],
      monthLabel: MONTH_NAMES[curM - 1],
    };
  }, [
    leaveLog,
    employees,
    balances,
    todayISO,
    trackerUtil,
    liveUsedByStaffType,
  ]);

  // ── Charts data ──
  const typeDistribution = React.useMemo(() => {
    const map: Record<string, number> = {};
    leaveLog
      .filter((l: any) => l.status === "Approved")
      .forEach((l: any) => {
        map[l.leaveType] = (map[l.leaveType] || 0) + (l.days || 0);
      });
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        color: leaveTypes.find((t) => t.name === name)?.color || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [leaveLog, leaveTypes]);

  const monthlyUsage = React.useMemo(() => {
    const map: Record<number, number> = {};
    leaveLog
      .filter((l: any) => l.status === "Approved")
      .forEach((l: any) => {
        const d = new Date(l.startDate);
        const m = d.getMonth();
        map[m] = (map[m] || 0) + (l.days || 0);
      });
    return MONTH_NAMES.map((name, i) => ({
      month: name.slice(0, 3),
      days: map[i] || 0,
    }));
  }, [leaveLog]);

  // ── Overlap detection ──
  const overlaps = React.useMemo(() => {
    const result: any[] = [];
    const byEmployee: Record<string, any[]> = {};
    leaveLog.forEach((l: any) => {
      if (!byEmployee[l.employee]) byEmployee[l.employee] = [];
      byEmployee[l.employee].push(l);
    });
    Object.entries(byEmployee).forEach(([emp, entries]) => {
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i];
          const b = entries[j];
          if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
            result.push({ employee: emp, a, b });
          }
        }
      }
    });
    return result;
  }, [leaveLog]);

  // ── Monthly staffing availability (synced with the HRH tracker) ──
  const availability = React.useMemo(() => {
    const year = 2026;
    const rosterNames = new Set(employees.map((e: any) => e.name));
    return MONTH_NAMES.map((month, mi) => {
      const onLeave = new Set<string>();
      leaveLog
        .filter((l: any) => l.status === "Approved" || l.status === "Pending")
        .forEach((l: any) => {
          if (!rosterNames.has(l.employee)) return;
          const sStr = l.startDate;
          const eStr = l.endDate;
          const monthStart = `${year}-${String(mi + 1).padStart(2, "0")}-01`;
          const monthEnd = `${year}-${String(mi + 1).padStart(2, "0")}-${String(new Date(year, mi + 1, 0).getDate()).padStart(2, "0")}`;
          if (sStr <= monthEnd && eStr >= monthStart) {
            onLeave.add(l.employee);
          }
        });
      const total = employees.length;
      const available = total - onLeave.size;
      return {
        month: month.slice(0, 3),
        onLeave: onLeave.size,
        available,
        total,
        pct: total > 0 ? Math.round((available / total) * 100) : 0,
      };
    });
  }, [leaveLog, employees]);

  // ── Staff on leave for the selected month (day-level detail) ──
  const monthLeaveDetail = React.useMemo(() => {
    const year = 2026;
    const mi = selectedMonth;
    const monthStart = `${year}-${String(mi + 1).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(mi + 1).padStart(2, "0")}-${String(new Date(year, mi + 1, 0).getDate()).padStart(2, "0")}`;
    const detail = leaveLog.filter(
      (l: any) =>
        (l.status === "Approved" || l.status === "Pending") &&
        l.startDate <= monthEnd &&
        l.endDate >= monthStart,
    );
    return detail.sort(
      (a: any, b: any) =>
        a.startDate.localeCompare(b.startDate) ||
        a.employee.localeCompare(b.employee),
    );
  }, [leaveLog, selectedMonth]);

  // ── Gantt data for selected month ──
  const ganttData = React.useMemo(() => {
    const year = 2026;
    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const holidayMap: Record<string, string> = {};
    holidays.forEach((h: any) => {
      const d = new Date(h.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === year) {
        holidayMap[d.getDate()] = h.name;
      }
    });

    const rows = employees.map((e: any) => {
      const cells: (string | null)[] = Array(daysInMonth).fill(null);
      leaveLog
        .filter(
          (l: any) =>
            l.employee === e.name &&
            (l.status === "Approved" || l.status === "Pending"),
        )
        .forEach((l: any) => {
          const sStr = l.startDate;
          const eStr = l.endDate;
          for (let d = 1; d <= daysInMonth; d++) {
            const curStr = `${year}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            if (curStr >= sStr && curStr <= eStr) {
              cells[d - 1] = l.leaveType;
            }
          }
        });
      return { employee: e.name, cells };
    });

    return { rows, daysInMonth, holidayMap };
  }, [employees, leaveLog, selectedMonth, holidays]);

  // ── Handlers ──
  // Backend (latest) wins by id — so a leave approved/returned in the CMaT
  // app updates its status here on the next auto-sync instead of being
  // skipped as a duplicate. New ids are appended.
  const handleSyncImport = (entries: any[]) => {
    setCmatEntries((prev) => {
      const byId = new Map(prev.map((p: any) => [String(p.id), p]));
      entries.forEach((e: any) => {
        if (e && e.id != null) byId.set(String(e.id), e);
      });
      return Array.from(byId.values());
    });
  };

  // ── Quick Add Leave (manual HR entry) ──────────────────────────────────
  const [addStaff, setAddStaff] = React.useState("");
  const [addType, setAddType] = React.useState("Annual Leave");
  const [addStart, setAddStart] = React.useState("");
  const [addEnd, setAddEnd] = React.useState("");
  const [addDays, setAddDays] = React.useState(0);
  const [addDaysTouched, setAddDaysTouched] = React.useState(false);
  const [addStatus, setAddStatus] = React.useState("Approved");
  const [addAdded, setAddAdded] = React.useState(false);

  // Auto-compute days from the date range (working days only) until the user
  // overrides the Days field manually.
  React.useEffect(() => {
    if (addStart && addEnd && !addDaysTouched) {
      setAddDays(countWorkdays(addStart, addEnd));
    }
  }, [addStart, addEnd, addDaysTouched]);

  const addValid = !!(addStaff && addStart && addEnd && addDays > 0);

  // Core: add a manual leave entry to the unified log AND push it to the
  // shared backend so the CMaT app sees it too (two-way sync). Used by both
  // the Quick Add form here and the tracker's staff modal (onManualAdd).
  const addManualEntry = async (entry: any) => {
    const e = {
      ...entry,
      id: entry.id || `manual-${Date.now()}`,
      source: "Manual",
    };
    // Local update first — leave log, balances, KPIs, calendar & Records tab
    // all react immediately because they derive from `leaveLog`.
    setCmatEntries((prev) => [...prev, e]);
    try {
      const staff =
        employees.find((em: any) => em.name === e.employee) ||
        syncedStaff.find(
          (s: any) =>
            s.name === e.employee ||
            s.staffName === e.employee ||
            s.email === e.employee,
        );
      await fetch("/api/leave-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [
            {
              id: e.id,
              staffEmail: staff?.email || "",
              staffName: e.employee,
              facility: staff?.facility || "",
              leaveType: e.leaveType,
              leaveDays: e.days,
              days: e.days,
              startDate: e.startDate,
              endDate: e.endDate,
              reportingDate: e.endDate,
              status: (e.status || "approved").toLowerCase(),
            },
          ],
        }),
      });
    } catch {
      // Offline / backend unavailable — local entry still works.
    }
  };

  const handleAddLeave = async () => {
    if (!addValid) return;
    await addManualEntry({
      employee: addStaff,
      leaveType: addType,
      startDate: addStart,
      endDate: addEnd,
      days: addDays,
      status: addStatus,
    });
    setAddAdded(true);
    window.setTimeout(() => setAddAdded(false), 2500);
    setAddStaff("");
    setAddStart("");
    setAddEnd("");
    setAddDays(0);
    setAddDaysTouched(false);
  };

  const balanceFor = (name: string) => {
    const b = computedBalances.find((x: any) => x.employee === name);
    const annual = b?.breakdown?.find((x: any) => x.type === "Annual Leave");
    return annual?.balance ?? 0;
  };

  // Export the UJTP master database as an Excel file — same columns as the
  // master workbook (NAME, GENDER, DOB, ID NO, qualification, licence, …).
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    // Master DB rows: central roster (includes all UJTP master fields). If the
    // roster is empty (e.g. data not loaded yet) fall back to tracker staff.
    const rows: any[] =
      rosterEmployees.length > 0
        ? rosterEmployees
        : (trackerData as any).staff || [];
    const headers = [
      "NAME",
      "GENDER",
      "PHONE",
      "ID NO",
      "DESIGNATION",
      "DESIGNATION GROUP",
      "DESIGNATION (FULL)",
      "COUNTY",
      "SUB COUNTY",
      "STATION/FACILITY",
      "DATE EMPLOYED",
      "CONTRACT END",
      "DOB",
      "EDUCATION LEVEL",
      "QUALIFICATION",
      "OTHER CERTIFICATIONS",
      "REGULATORY BODY",
      "PRACTICE LICENCE NO",
      "LICENCE VALID UNTIL",
      "AGE",
      "STATUS",
    ];
    const data = rows.map((e: any) => ({
      NAME: e.name,
      GENDER: e.gender || e.sex || "",
      PHONE: e.phone || "",
      "ID NO": e.idNo || "",
      DESIGNATION: e.designation || e.cadre || "",
      "DESIGNATION GROUP": e.designationGroup || "",
      "DESIGNATION (FULL)": e.designationOriginal || "",
      COUNTY: e.county || "",
      "SUB COUNTY": e.subCounty || "",
      "STATION/FACILITY": e.station || e.facility || "",
      "DATE EMPLOYED": e.dateEmployed || "",
      "CONTRACT END": e.contractEnd || "",
      DOB: e.dob || "",
      "EDUCATION LEVEL": e.educationLevel || "",
      QUALIFICATION: e.qualification || "",
      "OTHER CERTIFICATIONS": e.othersCert || "",
      "REGULATORY BODY": e.regulatoryBody || "",
      "PRACTICE LICENCE NO": e.practiseeLicence || e.licenceNo || "",
      "LICENCE VALID UNTIL": e.validUntil || "",
      AGE: e.age ?? "",
      STATUS: e.isDeparted ? "Departed" : "Active",
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    ws["!cols"] = headers.map((h) => ({
      wch: Math.max(h.length + 2, 12),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UJTP Master DB");
    XLSX.writeFile(wb, "ujtp-master-db.xlsx");
  };

  // Client-side balances: harmonized over the 181 active roster — the same
  // list as the Dashboard/Employees tabs. Each staff member gets entitlements
  // from the HRH tracker workbook (annual / sick / maternity); the 3 roster
  // staff hired in 2026 (Millicent, Erica, Hosea) default to the standard
  // buckets. Departed staff are no longer part of the leave roster (they live
  // in the Departed tab), so they drop out of the balances table.
  const computedBalances = React.useMemo(() => {
    const utilByName = new Map<string, any>();
    (trackerUtil as any[]).forEach((u: any) =>
      utilByName.set(
        String(u.name || "")
          .trim()
          .toLowerCase(),
        u,
      ),
    );
    return employees.map((e: any) => {
      const u = utilByName.get(
        String(e.name || "")
          .trim()
          .toLowerCase(),
      );
      const buckets = {
        annual: u?.annual || {
          entitlement: 30,
          used: 0,
          remaining: 30,
          pct: 0,
        },
        sick: u?.sick || { entitlement: 14, used: 0, remaining: 14, pct: 0 },
        maternity: u?.maternity || {
          entitlement: 90,
          used: 0,
          remaining: 90,
          pct: 0,
        },
      };
      const breakdown = leaveTypes.map((t: any) => {
        // Map the tracker's entitlement buckets to the matching columns.
        const src =
          t.name === "Annual Leave"
            ? buckets.annual
            : t.name === "Sick Leave"
              ? buckets.sick
              : t.name === "Maternity Leave"
                ? buckets.maternity
                : null;
        const ent = src?.entitlement;
        const hasEntitlement = ent !== undefined && ent !== null;
        const live = liveUsedByStaffType.get(`${e.name}|${t.name}`) || 0;
        return {
          type: t.name,
          entitlement: hasEntitlement ? ent : null,
          used: hasEntitlement ? (src.used ?? 0) + live : 0,
          balance: hasEntitlement ? (src.remaining ?? 0) - live : 0,
          hasEntitlement,
        };
      });
      return {
        employee: e.name,
        cadre: e.cadre || "",
        county: e.county || "",
        breakdown,
      };
    });
  }, [employees, trackerUtil, leaveTypes, liveUsedByStaffType]);

  const getTypeColor = (name: string) =>
    leaveTypes.find((t) => t.name === name)?.color || "#64748b";

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 print:p-0">
      <BackButton />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Leave Management
          </h2>
          <p className="text-muted-foreground mt-1">
            HRH leave tracker (mirrors Updated_HRH_Leave_Tracker_2025) plus the
            executive planning dashboard for 2026
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel (Master DB)
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Executive dashboard merged into the Summary Dashboard tab */}
      <HrhLeaveTracker
        externalRecords={trackerExternalRecords}
        onManualAdd={addManualEntry}
        kpiExtra={
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  On Leave Now
                </CardTitle>
                <Plane className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {kpis.onLeaveNow}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.onLeaveNames.length > 0
                    ? kpis.onLeaveNames.slice(0, 2).join(", ") +
                      (kpis.onLeaveNames.length > 2 ? "…" : "")
                    : "everyone available"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Requests
                </CardTitle>
                <Clock className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {kpis.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Available Now
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {kpis.availableNow}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {employees.length} staff available today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  On Leave This Month
                </CardTitle>
                <CalendarDays className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {kpis.onLeaveThisMonth}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.onLeaveThisMonthNames.length > 0
                    ? kpis.onLeaveThisMonthNames.slice(0, 2).join(", ") +
                      (kpis.onLeaveThisMonthNames.length > 2 ? "…" : "")
                    : "no one on leave"}{" "}
                  · {kpis.monthLabel}
                </p>
              </CardContent>
            </Card>
          </div>
        }
        summaryExtra={
          <>
            {overlaps.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium text-red-800">
                      Overlapping Leave Detected ({overlaps.length})
                    </CardTitle>
                    <CardDescription className="text-red-600/70">
                      Staff members with two leave periods that conflict —
                      review and adjust the affected requests.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto rounded-lg border border-red-200">
                    <Table>
                      <TableHeader className="sticky top-0 bg-red-50 z-10">
                        <TableRow>
                          <TableHead className="font-semibold text-red-800">
                            Staff Member
                          </TableHead>
                          <TableHead className="font-semibold text-red-800">
                            Leave Period A
                          </TableHead>
                          <TableHead className="font-semibold text-red-800">
                            Leave Period B
                          </TableHead>
                          <TableHead className="font-semibold text-red-800 text-right">
                            Total Days
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overlaps.map((o: any, i: number) => (
                          <TableRow
                            key={i}
                            className="bg-white/60 hover:bg-red-50"
                          >
                            <TableCell className="font-medium text-red-900">
                              {o.employee}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className="w-fit border-blue-300 bg-blue-50 text-blue-800"
                                >
                                  {o.a.leaveType}
                                </Badge>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {o.a.startDate} → {o.a.endDate}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className="w-fit border-red-300 bg-red-50 text-red-800"
                                >
                                  {o.b.leaveType}
                                </Badge>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {o.b.startDate} → {o.b.endDate}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-red-800">
                              {o.a.days} + {o.b.days}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Type Distribution</CardTitle>
                  <CardDescription>Approved days by leave type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {typeDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  {typeDistribution.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No approved leave recorded yet
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Leave Usage</CardTitle>
                  <CardDescription>
                    Approved leave days per month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyUsage}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Bar
                        dataKey="days"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            {/* Monthly Staffing Availability */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Staffing Availability</CardTitle>
                <CardDescription>
                  Synced with the HRH tracker — staff on leave vs available per
                  month, plus the exact days each staff member is away
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-center">On Leave</TableHead>
                        <TableHead className="text-center">Available</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Availability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availability.map((a: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {a.month}
                          </TableCell>
                          <TableCell className="text-center text-amber-600 font-semibold">
                            {a.onLeave}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {a.available}
                          </TableCell>
                          <TableCell className="text-center">
                            {a.total}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${a.pct}%`,
                                    backgroundColor:
                                      a.pct >= 80
                                        ? "#10b981"
                                        : a.pct >= 60
                                          ? "#f59e0b"
                                          : "#ef4444",
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {a.pct}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Day-level detail for the selected month */}
                <div className="no-print mt-4 flex flex-wrap gap-2">
                  {MONTH_NAMES.map((m, i) => (
                    <Button
                      key={m}
                      variant={selectedMonth === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMonth(i)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">
                    Staff on Leave — {MONTH_NAMES[selectedMonth]} 2026 (
                    {monthLeaveDetail.length})
                  </h4>
                  {monthLeaveDetail.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No leave recorded this month — all {employees.length}{" "}
                      staff are available
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead className="text-center">Days</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthLeaveDetail.map((l: any, i: number) => (
                            <TableRow
                              key={i}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openEmployeeDetails(l.employee)}
                            >
                              <TableCell className="font-medium">
                                {l.employee}
                              </TableCell>
                              <TableCell>{l.leaveType}</TableCell>
                              <TableCell>{l.startDate}</TableCell>
                              <TableCell>{l.endDate}</TableCell>
                              <TableCell className="text-center">
                                {l.days}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    STATUS_COLORS[l.status] || "bg-gray-100"
                                  }
                                >
                                  {l.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Gantt Calendar */}
            <Card>
              <CardHeader className="no-print">
                <CardTitle>Department Leave Calendar</CardTitle>
                <CardDescription>
                  Gantt-style view — color-coded by leave type, weekends shaded,
                  holidays marked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="no-print mb-4 flex flex-wrap gap-2">
                  {MONTH_NAMES.map((m, i) => (
                    <Button
                      key={m}
                      variant={selectedMonth === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMonth(i)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>

                <div className="no-print mb-4 flex flex-wrap items-center gap-3">
                  <input
                    className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
                    placeholder="Search staff in calendar…"
                    value={ganttSearch}
                    onChange={(e) => setGanttSearch(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {ganttSearch
                      ? `${ganttData.rows.filter((r: any) => r.employee.toLowerCase().includes(ganttSearch.toLowerCase())).length} of ${ganttData.rows.length} staff shown`
                      : `${ganttData.rows.length} staff`}
                  </span>
                </div>

                {/* Legend */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {leaveTypes.map((t) => (
                    <span
                      key={t.name}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 text-xs">
                    <span className="inline-block h-3 w-3 rounded-sm bg-yellow-100 border border-yellow-400" />
                    Public Holiday
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* Month title */}
                    <div className="text-center font-semibold text-sm mb-2">
                      {MONTH_NAMES[selectedMonth]} 2026 —{" "}
                      {ganttData.daysInMonth} days
                    </div>

                    {/* Holiday row */}
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `140px repeat(${ganttData.daysInMonth}, minmax(22px, 1fr))`,
                      }}
                    >
                      <div className="border p-1 text-xs font-medium bg-muted">
                        Holidays
                      </div>
                      {Array.from(
                        { length: ganttData.daysInMonth },
                        (_, i) => i + 1,
                      ).map((d) => {
                        const holiday = ganttData.holidayMap[d];
                        return (
                          <div
                            key={d}
                            title={holiday || ""}
                            className={`border text-center text-[10px] p-1 flex items-center justify-center ${
                              holiday
                                ? "bg-yellow-100 text-yellow-800 font-semibold border-yellow-300"
                                : "bg-muted/30"
                            }`}
                          >
                            {holiday ? <Sun className="h-3 w-3" /> : ""}
                          </div>
                        );
                      })}
                    </div>

                    {/* Day number row */}
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `140px repeat(${ganttData.daysInMonth}, minmax(22px, 1fr))`,
                      }}
                    >
                      <div className="border p-1 text-xs font-medium bg-muted">
                        Employee
                      </div>
                      {Array.from(
                        { length: ganttData.daysInMonth },
                        (_, i) => i + 1,
                      ).map((d) => {
                        const dow = new Date(2026, selectedMonth, d).getDay();
                        const isHoliday = ganttData.holidayMap[d];
                        return (
                          <div
                            key={d}
                            className={`border text-center text-[10px] p-1 font-medium ${
                              dow === 0 || dow === 6
                                ? "bg-gray-100 text-gray-400"
                                : isHoliday
                                  ? "bg-yellow-50"
                                  : ""
                            }`}
                          >
                            {d}
                          </div>
                        );
                      })}
                    </div>

                    {/* Employee rows */}
                    {ganttData.rows
                      .filter((row: any) =>
                        row.employee
                          .toLowerCase()
                          .includes(ganttSearch.toLowerCase()),
                      )
                      .map((row: any) => (
                        <div
                          key={row.employee}
                          className="grid"
                          style={{
                            gridTemplateColumns: `140px repeat(${ganttData.daysInMonth}, minmax(22px, 1fr))`,
                          }}
                        >
                          <div
                            className="border p-1 text-xs font-medium truncate"
                            title={row.employee}
                          >
                            {row.employee}
                          </div>
                          {row.cells.map((cell: string | null, ci: number) => {
                            const dow = new Date(
                              2026,
                              selectedMonth,
                              ci + 1,
                            ).getDay();
                            const isHoliday = ganttData.holidayMap[ci + 1];
                            const isToday =
                              new Date().getFullYear() === 2026 &&
                              new Date().getMonth() === selectedMonth &&
                              new Date().getDate() === ci + 1;
                            return (
                              <div
                                key={ci}
                                title={cell ? `${row.employee}: ${cell}` : ""}
                                className="border text-center text-[10px]"
                                style={{
                                  backgroundColor: cell
                                    ? getTypeColor(cell)
                                    : dow === 0 || dow === 6
                                      ? "#f9fafb"
                                      : isHoliday
                                        ? "#fefce8"
                                        : "white",
                                  outline: isToday
                                    ? "2px solid #3b82f6"
                                    : undefined,
                                  outlineOffset: "-1px",
                                }}
                              >
                                {cell ? (
                                  <span className="text-white text-[8px] font-bold">
                                    {cell
                                      .split(" ")[0]
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                ) : (
                                  ""
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Quick Add Leave (manual HR entry) */}
            <Card className="no-print">
              <CardHeader>
                <CardTitle>Add Leave Manually</CardTitle>
                <CardDescription>
                  Register leave for any staff member — remaining balances
                  update automatically and it syncs to the CMaT app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Staff member
                    </label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={addStaff}
                      onChange={(e) => setAddStaff(e.target.value)}
                    >
                      <option value="">Select staff…</option>
                      {employees.map((em: any) => (
                        <option key={em.name} value={em.name}>
                          {em.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Leave type
                    </label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={addType}
                      onChange={(e) => setAddType(e.target.value)}
                    >
                      {leaveTypes.map((t: any) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
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
                      value={addStart}
                      onChange={(e) => {
                        setAddStart(e.target.value);
                        setAddDaysTouched(false);
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      To
                    </label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={addEnd}
                      onChange={(e) => {
                        setAddEnd(e.target.value);
                        setAddDaysTouched(false);
                      }}
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
                      value={addDays || ""}
                      onChange={(e) => {
                        setAddDaysTouched(true);
                        setAddDays(parseInt(e.target.value, 10) || 0);
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={addStatus}
                      onChange={(e) => setAddStatus(e.target.value)}
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    disabled={!addValid}
                    onClick={handleAddLeave}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Leave
                  </Button>
                  {addAdded && (
                    <span className="text-sm font-medium text-emerald-600">
                      ✓ Leave added — balances updated
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {addStaff
                      ? `${addStaff} · Annual balance: ${balanceFor(addStaff)} days`
                      : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
            {/* Leave Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Automatic Leave Balances</CardTitle>
                <CardDescription>
                  HRH tracker entitlements minus approved usage per staff member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="no-print mb-4 flex flex-wrap items-center gap-3">
                  <input
                    className="h-9 max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
                    placeholder="Search staff…"
                    value={balanceSearch}
                    onChange={(e) => setBalanceSearch(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {balanceSearch
                      ? `${computedBalances.filter((b: any) => b.employee.toLowerCase().includes(balanceSearch.toLowerCase())).length} of ${computedBalances.length} staff shown`
                      : `${computedBalances.length} staff`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        {leaveTypes.map((t) => (
                          <TableHead key={t.name} className="text-center">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              {t.name}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedBalances
                        .filter((b: any) =>
                          b.employee
                            .toLowerCase()
                            .includes(balanceSearch.toLowerCase()),
                        )
                        .map((b: any, idx: number) => (
                          <TableRow
                            key={idx}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openEmployeeDetails(b.employee)}
                          >
                            <TableCell className="font-medium">
                              {b.employee}
                            </TableCell>
                            {b.breakdown.map((item: any, i: number) => (
                              <TableCell key={i} className="text-center">
                                {!item.hasEntitlement ? (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                ) : item.balance < 0 ? (
                                  <span className="font-semibold text-red-600">
                                    {item.balance}
                                  </span>
                                ) : (
                                  <span
                                    className={
                                      item.balance <= item.entitlement * 0.25 &&
                                      item.entitlement > 0
                                        ? "font-semibold text-amber-600"
                                        : ""
                                    }
                                  >
                                    {item.balance}
                                  </span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {/* CMaT Sync Panel */}
            <LeaveSyncPanel onImport={handleSyncImport} />
            {/* Leave Log Table */}{" "}
            <Card>
              <CardHeader className="no-print">
                <CardTitle>Leave Log</CardTitle>
                <CardDescription>
                  All leave entries — filter by employee, type, status, or month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="no-print mb-4 grid gap-3 md:grid-cols-5">
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  >
                    <option value="all">All Employees</option>
                    {employees.map((e: any) => (
                      <option key={e.name} value={e.name}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Leave Types</option>
                    {leaveTypes.map((t: any) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
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
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  >
                    <option value="all">All Months</option>
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead className="text-center">Days</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveLog.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No leave entries yet — register one from a staff
                            member&apos;s profile in the Staff Directory
                          </TableCell>
                        </TableRow>
                      )}
                      {leaveLog.map((l: any, idx: number) => (
                        <TableRow
                          key={idx}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openEmployeeDetails(l.employee)}
                        >
                          <TableCell className="font-medium">
                            {l.employee}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: getTypeColor(l.leaveType),
                                }}
                              />
                              {l.leaveType}
                            </span>
                          </TableCell>
                          <TableCell>{l.startDate}</TableCell>
                          <TableCell>{l.endDate}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {l.days}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                STATUS_COLORS[l.status] || "bg-gray-100"
                              }
                            >
                              {l.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        }
      />

      {/* Employee details drawer — opens when you click any worker row */}
      <EmployeeEditModal
        employee={selectedEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}

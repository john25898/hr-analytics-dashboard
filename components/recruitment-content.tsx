"use client";

import React from "react";
import {
  ArrowDownRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Columns3,
  Filter,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { NewRequisitionModal } from "@/components/new-requisition-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  STAGES,
  STAGE_BAR_CLASSES,
  STAGE_CLASSES,
  cycleLabel,
  deleteRequisition,
  formatDate,
  loadRequisitions,
  nextStage,
  requisitionTotals,
  stageIndex,
  syncRequisitions,
  updateRequisition,
  type Requisition,
} from "@/lib/recruitment-store";

// ─── Small building blocks ──────────────────────────────────────────────────

interface PopoverState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

function PopoverPanel({
  trigger,
  children,
  width = "w-72",
  align = "left",
}: {
  trigger: (state: PopoverState) => React.ReactNode;
  children: (state: PopoverState) => React.ReactNode;
  width?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // Close on the click *after* the target has handled it, so buttons that sit
    // outside the panel (e.g. "Clear filters") still run their own handler.
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const state: PopoverState = {
    open,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
  };

  return (
    <div ref={ref} className="relative">
      {trigger(state)}
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 rounded-xl border border-border bg-popover p-3 shadow-xl",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(state)}
        </div>
      )}
    </div>
  );
}

const CATEGORY_CLASSES: Record<string, string> = {
  HRH: "border-blue-200 bg-blue-50 text-blue-700",
  CHAK: "border-violet-200 bg-violet-50 text-violet-700",
  CBSL: "border-teal-200 bg-teal-50 text-teal-700",
};

function CategoryChip({ category }: { category?: string }) {
  const value = category || "HRH";
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        CATEGORY_CLASSES[value] || CATEGORY_CLASSES.HRH,
      )}
    >
      {value}
    </span>
  );
}

function StageBadge({ stage }: { stage: Requisition["stage"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STAGE_CLASSES[stage] || STAGE_CLASSES.Applications,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          stage === "Hired" ? "bg-white" : "bg-current opacity-70",
        )}
      />
      {stage}
    </span>
  );
}

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ─── Column configuration ───────────────────────────────────────────────────

const OPTIONAL_COLUMNS = [
  { key: "department", label: "Department" },
  { key: "hiringManager", label: "Hiring manager" },
  { key: "applicants", label: "Applicants" },
  { key: "shortlisted", label: "Shortlist" },
  { key: "interviewed", label: "Interviewed" },
  { key: "stage", label: "Stage" },
  { key: "openingDate", label: "Opening date" },
  { key: "targetDate", label: "Target date" },
  { key: "sources", label: "Source" },
  { key: "nextMilestone", label: "Next milestone" },
] as const;

type ColumnKey = (typeof OPTIONAL_COLUMNS)[number]["key"];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  department: true,
  hiringManager: true,
  applicants: true,
  shortlisted: true,
  interviewed: true,
  stage: true,
  openingDate: true,
  targetDate: true,
  sources: true,
  nextMilestone: true,
};

// ─── Page ───────────────────────────────────────────────────────────────────

export function RecruitmentContent() {
  const [requisitions, setRequisitions] = React.useState<Requisition[]>(() =>
    loadRequisitions(),
  );
  const [cycle, setCycle] = React.useState<string>("2026-08");
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("all");
  const [stage, setStage] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [source, setSource] = React.useState("all");

  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Requisition | null>(null);

  const [syncing, setSyncing] = React.useState(false);
  const [syncedAt, setSyncedAt] = React.useState<Date | null>(null);
  const [columns, setColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

  const searchRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => {
    setRequisitions(loadRequisitions());
  }, []);

  // Load cached requisitions, then merge the shared backend (if reachable).
  React.useEffect(() => {
    reload();
    syncRequisitions().then((merged) => {
      if (merged) {
        setRequisitions(merged);
        setSyncedAt(new Date());
      }
    });

    const onChanged = () => reload();
    window.addEventListener("requisitions-changed", onChanged);
    return () => window.removeEventListener("requisitions-changed", onChanged);
  }, [reload]);

  // ⌘K / Ctrl+K focuses the global search — Escape clears and blurs it.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === "k";
      if (isK && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setSearch("");
          searchRef.current?.blur();
        }
        setDrawerId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep the selected cycle valid when requisitions change.
  const cycles = React.useMemo(
    () =>
      Array.from(new Set(requisitions.map((r) => r.cycle)))
        .filter(Boolean)
        .sort()
        .reverse(),
    [requisitions],
  );

  React.useEffect(() => {
    if (cycle === "all") return;
    if (cycles.length > 0 && !cycles.includes(cycle)) {
      setCycle(cycles[0]);
    }
  }, [cycles, cycle]);

  // ── Derived lists ──
  const inCycle = React.useMemo(
    () =>
      cycle === "all"
        ? requisitions
        : requisitions.filter((r) => r.cycle === cycle),
    [requisitions, cycle],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return inCycle.filter((r) => {
      if (department !== "all" && r.department !== department) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (category !== "all" && (r.category || "HRH") !== category)
        return false;
      if (source !== "all" && !(r.sources || []).includes(source)) return false;
      if (!q) return true;
      const haystack = [
        r.id,
        r.position,
        r.department,
        r.hiringManager,
        r.category,
        r.stage,
        r.nextMilestone,
        ...(r.sources || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [inCycle, department, stage, category, source, search]);

  const totals = React.useMemo(() => requisitionTotals(filtered), [filtered]);

  // ── Departments / sources present (for the filter dropdowns) ──
  const departments = React.useMemo(
    () => Array.from(new Set(inCycle.map((r) => r.department))).sort(),
    [inCycle],
  );
  const sourcesInUse = React.useMemo(
    () => Array.from(new Set(inCycle.flatMap((r) => r.sources || []))).sort(),
    [inCycle],
  );

  const activeFilterCount = [department, stage, category, source].filter(
    (v) => v !== "all",
  ).length;

  const clearFilters = () => {
    setDepartment("all");
    setStage("all");
    setCategory("all");
    setSource("all");
  };

  const refresh = async () => {
    setSyncing(true);
    const merged = await syncRequisitions();
    setRequisitions(merged || loadRequisitions());
    setSyncedAt(new Date());
    setSyncing(false);
  };

  // ── KPI figures ──
  const shortlistRate =
    totals.applicants > 0 ? (totals.shortlisted / totals.applicants) * 100 : 0;
  const interviewedRate =
    totals.applicants > 0 ? (totals.interviewed / totals.applicants) * 100 : 0;

  const selected = drawerId
    ? requisitions.find((r) => r.id === drawerId) || null
    : null;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (req: Requisition) => {
    setEditing(req);
    setModalOpen(true);
  };

  const handleDelete = (req: Requisition) => {
    const ok =
      typeof window === "undefined" ||
      window.confirm(
        `Delete ${req.id} · ${req.position}? This cannot be undone.`,
      );
    if (!ok) return;
    deleteRequisition(req.id);
    setDrawerId(null);
    reload();
  };

  const handleAdvanceStage = (req: Requisition) => {
    updateRequisition(req.id, { stage: nextStage(req.stage) });
    reload();
  };

  const handleStageSelect = (req: Requisition, next: Requisition["stage"]) => {
    updateRequisition(req.id, { stage: next });
    reload();
  };

  const syncLabel = syncedAt
    ? `Last synced ${syncedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Last synced just now";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>HR Operations</span>
            <span className="text-border">/</span>
            <span className="text-primary">Recruitment</span>
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Recruitment pipeline
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Every requisition, stage, source and milestone in one operating
            view.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything"
              aria-label="Search anything"
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
          <Button onClick={openCreate} className="h-9 shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            New requisition
          </Button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Applicants",
            value: totals.applicants,
            hint: "Across all sources",
            icon: Users,
            tile: "bg-blue-50 text-blue-600",
            accent: "from-blue-600 to-blue-500",
            width: 100,
          },
          {
            label: "Shortlisted",
            value: totals.shortlisted,
            hint: `${shortlistRate.toFixed(1)}% of applicants`,
            icon: Filter,
            tile: "bg-teal-50 text-teal-600",
            accent: "from-teal-600 to-teal-500",
            width: Math.max(shortlistRate, 3),
          },
          {
            label: "Interviewed",
            value: totals.interviewed,
            hint: "Ready for decision",
            icon: MessageSquare,
            tile: "bg-violet-50 text-violet-600",
            accent: "from-violet-600 to-violet-500",
            width: Math.max(interviewedRate, 3),
          },
          {
            label: "Offers",
            value: totals.offers,
            hint:
              totals.offers === 1
                ? "1 accepted pending"
                : `${totals.offers} accepted pending`,
            icon: BadgeCheck,
            tile: "bg-emerald-50 text-emerald-600",
            accent: "from-emerald-600 to-emerald-500",
            width: Math.max(
              totals.applicants > 0
                ? (totals.offers / totals.applicants) * 100
                : 0,
              3,
            ),
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="mt-1.5 text-3xl font-bold tabular-nums leading-none">
                      {kpi.value.toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {kpi.hint}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      kpi.tile,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                      kpi.accent,
                    )}
                    style={{ width: `${Math.min(kpi.width, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Funnel + sourcing mix ──────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Hiring funnel
              </CardTitle>
              <CardDescription>Current candidate movement</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                aria-label="Reporting cycle"
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {cycles.map((c) => (
                  <option key={c} value={c}>
                    {cycleLabel(c)}
                  </option>
                ))}
                <option value="all">All cycles</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                label: "Applicants",
                count: totals.applicants,
                stage: "Applications" as const,
              },
              {
                label: "Shortlisted",
                count: totals.shortlisted,
                stage: "Shortlisting" as const,
              },
              {
                label: "Interviewed",
                count: totals.interviewed,
                stage: "Interview" as const,
              },
              {
                label: "Offers",
                count: totals.offers,
                stage: "Offer" as const,
              },
            ].map((row, index, all) => {
              const share =
                totals.applicants > 0
                  ? (row.count / totals.applicants) * 100
                  : 0;
              const width = row.count > 0 ? Math.max(share, 2.5) : 0;
              const nextCount =
                index < all.length - 1 ? all[index + 1].count : 0;
              const conversion =
                row.count > 0 && index < all.length - 1
                  ? (nextCount / row.count) * 100
                  : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center gap-3 py-1">
                    <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      {row.label}
                    </span>
                    <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-muted/70">
                      <div
                        className={cn(
                          "h-full rounded-md transition-all duration-500",
                          STAGE_BAR_CLASSES[row.stage],
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                      {row.count.toLocaleString()}
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  {index < all.length - 1 && (
                    <div className="flex items-center gap-1.5 pl-24 text-[11px] text-muted-foreground">
                      <ArrowDownRight className="h-3 w-3" />
                      {conversion > 0
                        ? `${conversion.toFixed(1)}% advance to ${all[index + 1].label.toLowerCase()}`
                        : `No candidates at the ${all[index + 1].label.toLowerCase()} stage yet`}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">
                  {totals.requisitions}
                </span>{" "}
                requisitions
              </span>
              <span>·</span>
              <span>
                <span className="font-semibold text-foreground">
                  {shortlistRate.toFixed(1)}%
                </span>{" "}
                shortlist rate
              </span>
              <span>·</span>
              <span>
                <span className="font-semibold text-foreground">
                  {interviewedRate.toFixed(1)}%
                </span>{" "}
                interviewed
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Sourcing mix
            </CardTitle>
            <CardDescription>Where the candidates come from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const mix = new Map<
                string,
                { reqs: number; applicants: number }
              >();
              filtered.forEach((r) => {
                (r.sources || []).forEach((s) => {
                  const entry = mix.get(s) || { reqs: 0, applicants: 0 };
                  entry.reqs += 1;
                  entry.applicants += Number(r.applicants) || 0;
                  mix.set(s, entry);
                });
              });
              const rows = Array.from(mix.entries()).sort(
                (a, b) => b[1].applicants - a[1].applicants,
              );
              if (rows.length === 0) {
                return (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No sourcing data for this view.
                  </p>
                );
              }
              const max = rows[0][1].applicants || 1;
              return rows.map(([name, entry]) => (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {entry.applicants.toLocaleString()} · {entry.reqs}{" "}
                      {entry.reqs === 1 ? "role" : "roles"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
                      style={{
                        width: `${Math.max((entry.applicants / max) * 100, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              ));
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PopoverPanel
            width="w-80"
            trigger={({ toggle, open }) => (
              <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                aria-expanded={open}
                className="gap-2"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
          >
            {({ close }) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All stages</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Category
                  </label>
                  <div
                    role="group"
                    aria-label="Filter category"
                    className="inline-flex w-full items-center gap-1 rounded-full bg-muted p-1"
                  >
                    {["all", "HRH", "CHAK", "CBSL"].map((cat) => {
                      const active = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          aria-pressed={active}
                          className={cn(
                            "flex-1 rounded-full px-2 py-1 text-[11px] transition-colors",
                            active
                              ? "bg-blue-600 font-medium text-white shadow-sm"
                              : "text-foreground/70 hover:bg-background/60 hover:text-foreground",
                          )}
                        >
                          {cat === "all" ? "All" : cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All sources</option>
                    {sourcesInUse.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <Button size="sm" className="w-full" onClick={close}>
                  Done
                </Button>
              </div>
            )}
          </PopoverPanel>

          <PopoverPanel
            width="w-64"
            trigger={({ toggle, open }) => (
              <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                aria-expanded={open}
                className="gap-2"
              >
                <Columns3 className="h-3.5 w-3.5" />
                Customize
              </Button>
            )}
          >
            {() => (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visible columns
                </p>
                {OPTIONAL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={columns[col.key]}
                      onChange={(e) =>
                        setColumns((prev) => ({
                          ...prev,
                          [col.key]: e.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    {col.label}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setColumns(DEFAULT_COLUMNS)}
                  className="pt-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Reset columns
                </button>
              </div>
            )}
          </PopoverPanel>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "record" : "records"}
          </span>
          <span className="text-border">·</span>
          <span>{syncLabel}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            aria-label="Refresh requisitions"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-[230px] font-semibold">
                  Position
                </TableHead>
                {columns.department && (
                  <TableHead className="font-semibold">Department</TableHead>
                )}
                {columns.hiringManager && (
                  <TableHead className="font-semibold">
                    Hiring manager
                  </TableHead>
                )}
                {columns.applicants && (
                  <TableHead className="text-right font-semibold">
                    Applicants
                  </TableHead>
                )}
                {columns.shortlisted && (
                  <TableHead className="text-right font-semibold">
                    Shortlist
                  </TableHead>
                )}
                {columns.interviewed && (
                  <TableHead className="text-right font-semibold">
                    Interviewed
                  </TableHead>
                )}
                {columns.stage && (
                  <TableHead className="font-semibold">Stage</TableHead>
                )}
                {columns.openingDate && (
                  <TableHead className="font-semibold">Opening date</TableHead>
                )}
                {columns.targetDate && (
                  <TableHead className="font-semibold">Target date</TableHead>
                )}
                {columns.sources && (
                  <TableHead className="font-semibold">Source</TableHead>
                )}
                {columns.nextMilestone && (
                  <TableHead className="min-w-[180px] font-semibold">
                    Next milestone
                  </TableHead>
                )}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No requisitions match this view. Try clearing a filter or
                    creating a new requisition.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => (
                  <TableRow
                    key={req.id}
                    onClick={() => setDrawerId(req.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="py-3">
                      <p className="font-medium leading-tight">
                        {req.position}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {req.id}
                        </span>
                        <CategoryChip category={req.category} />
                      </div>
                    </TableCell>
                    {columns.department && (
                      <TableCell className="text-sm">
                        {req.department}
                      </TableCell>
                    )}
                    {columns.hiringManager && (
                      <TableCell className="text-sm text-muted-foreground">
                        {req.hiringManager}
                      </TableCell>
                    )}
                    {columns.applicants && (
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {req.applicants.toLocaleString()}
                      </TableCell>
                    )}
                    {columns.shortlisted && (
                      <TableCell className="text-right text-sm tabular-nums">
                        {req.shortlisted.toLocaleString()}
                      </TableCell>
                    )}
                    {columns.interviewed && (
                      <TableCell className="text-right text-sm tabular-nums">
                        {req.interviewed.toLocaleString()}
                      </TableCell>
                    )}
                    {columns.stage && (
                      <TableCell>
                        <StageBadge stage={req.stage} />
                      </TableCell>
                    )}
                    {columns.openingDate && (
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(req.openingDate)}
                      </TableCell>
                    )}
                    {columns.targetDate && (
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(req.targetDate)}
                      </TableCell>
                    )}
                    {columns.sources && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(req.sources || []).slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                          {(req.sources || []).length > 2 && (
                            <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              +{req.sources.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columns.nextMilestone && (
                      <TableCell>
                        <p className="text-xs font-medium">
                          {req.nextMilestone}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(req.milestoneDate)}
                        </p>
                      </TableCell>
                    )}
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Requisition drawer ─────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerId(null)}
          />
          <aside
            role="dialog"
            aria-label={`${selected.id} ${selected.position}`}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {selected.id} · {cycleLabel(selected.cycle)}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-tight">
                  {selected.position}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {selected.department} · {selected.hiringManager}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerId(null)}
                className="h-8 w-8 shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip category={selected.category} />
                <StageBadge stage={selected.stage} />
                <span className="text-[11px] text-muted-foreground">
                  Opened {formatDate(selected.openingDate)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Applicants", value: selected.applicants },
                  { label: "Shortlisted", value: selected.shortlisted },
                  { label: "Interviewed", value: selected.interviewed },
                  { label: "Offers", value: selected.offers },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pipeline progression
                </p>
                <div className="space-y-0.5">
                  {STAGES.map((s, index) => {
                    const current = selected.stage === s;
                    const done = index < stageIndex(selected.stage);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStageSelect(selected, s)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted",
                          current && "bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                            done
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : current
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="h-3 w-3" /> : index + 1}
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            current
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {s}
                        </span>
                        {current && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Next milestone
                </p>
                <p className="mt-1 text-sm font-medium">
                  {selected.nextMilestone}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due {formatDate(selected.milestoneDate)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Target hire date {formatDate(selected.targetDate)}
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sourcing
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.sources || []).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <p className="rounded-lg border border-border bg-background p-2.5 text-xs leading-relaxed text-muted-foreground">
                    {selected.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(selected)}
                className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(selected)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              {selected.stage !== "Hired" && (
                <Button
                  size="sm"
                  onClick={() => handleAdvanceStage(selected)}
                  className="gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Advance stage
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}

      <NewRequisitionModal
        open={modalOpen}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) setEditing(null);
        }}
        defaultCycle={cycle === "all" ? (cycles[0] ?? "2026-08") : cycle}
        editing={editing}
        onSaved={() => reload()}
      />
    </div>
  );
}

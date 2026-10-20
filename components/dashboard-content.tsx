"use client";

import React from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  BarChart3,
  Users2,
  TrendingUp,
  Zap,
  MapPin,
  Building2,
  Calendar,
  Award,
  Star,
  DollarSign,
  Plus,
  Briefcase,
  Clock,
  Heart,
  Accessibility,
  Mars,
  Venus,
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { DashboardCharts } from "./dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Cell,
} from "recharts";
import { NewWorkerModal } from "./new-worker-modal";
import { CATEGORIES } from "@/lib/hr-options";
import { getDisabilities, getModifications } from "@/lib/employee-store";
import { cn } from "@/lib/utils";

// Pills are shown HRH -> CHAK -> CBSL (HRH first because it is the default).
const CATEGORY_ORDER = ["HRH", "CHAK", "CBSL"].filter((c) =>
  CATEGORIES.includes(c),
);

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const COLOR_PALETTE = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function DashboardContent() {
  const router = useRouter();
  const [addWorkerOpen, setAddWorkerOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  // "View data by category" filter — every KPI, card and chart below is scoped
  // to this value. HRH is the default because that is what the master roster is.
  const [category, setCategory] = React.useState<string>("HRH");
  // The Operations tab only exists for HRH, so the active tab is held in state
  // and falls back to Overview whenever the category changes.
  const [tab, setTab] = React.useState("overview");
  React.useEffect(() => {
    if (category !== "HRH")
      setTab((t) => (t === "operations" ? "overview" : t));
  }, [category]);

  // refreshKey is part of the SWR keys so bumping it forces a live refetch —
  // without it the dashboard kept stale numbers until a full browser refresh.
  // keepPreviousData stops the whole grid flashing a skeleton on every switch.
  const { data: analytics, isLoading } = useSWR(
    `/api/analytics?category=${category}&_=${refreshKey}`,
    fetcher,
    { keepPreviousData: true },
  );
  const { data: employees } = useSWR(
    `/api/employees?limit=1000&category=${category}&_=${refreshKey}`,
    fetcher,
    { keepPreviousData: true },
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  // ===== DISABILITY REGISTER (client-side store) =====
  // Declared disabilities live in the employee store, not in the Excel roster,
  // so they are counted per category here: workers captured through the intake
  // form keep their own category, while county/facility register entries belong
  // to the HRH master roster.
  const [disabledCounts, setDisabledCounts] = React.useState<
    Record<string, number>
  >({ HRH: 0, CHAK: 0, CBSL: 0 });

  React.useEffect(() => {
    const counts: Record<string, number> = { HRH: 0, CHAK: 0, CBSL: 0 };
    const counted = new Set<string>();
    const keyOf = (name?: string) => (name || "").trim().toLowerCase();
    const bump = (cat: string | undefined, name?: string) => {
      const key = keyOf(name);
      if (key) {
        if (counted.has(key)) return; // never count the same worker twice
        counted.add(key);
      }
      const target = cat && counts[cat] !== undefined ? cat : "HRH";
      counts[target] += 1;
    };

    // 1. Workers added via the intake form that declared a disability
    const intake = getModifications().newWorkers || [];
    const intakeCategory = new Map<string, string>();
    intake.forEach((w) => {
      if (keyOf(w.name)) intakeCategory.set(keyOf(w.name), w.category || "HRH");
      if (w.disability) bump(w.category, w.name);
    });

    // 2. The disabilities registry (county / facility based => HRH roster)
    getDisabilities().forEach((r) =>
      bump(intakeCategory.get(keyOf(r.name)) || "HRH", r.name),
    );

    setDisabledCounts(counts);
  }, [refreshKey]);

  // Gender split for the selected category (the roster stores M / F).
  const genderSplit = React.useMemo(() => {
    const dist: { name: string; value: number }[] =
      analytics?.genderDistribution || [];
    let male = 0;
    let female = 0;
    dist.forEach((g) => {
      const name = String(g.name || "").toLowerCase();
      if (name.startsWith("m")) male += Number(g.value) || 0;
      else if (name.startsWith("f")) female += Number(g.value) || 0;
    });
    return { male, female };
  }, [analytics?.genderDistribution]);

  // ===== OPERATIONS DATA (moved before isLoading check to keep hooks consistent) =====
  const subCountyStats = React.useMemo(() => {
    if (!employees?.data) return [];
    const subCountyMap: Record<string, any> = {};
    employees.data.forEach((emp: any) => {
      const sc = emp.subCounty || "Unknown";
      if (!subCountyMap[sc]) {
        subCountyMap[sc] = {
          name: sc,
          county: emp.county || "Unknown",
          staff: 0,
          licenses: { valid: 0, expiring: 0, expired: 0 },
        };
      }
      subCountyMap[sc].staff++;
      if (emp.validUntil) {
        const today = new Date();
        const expireDate = new Date(emp.validUntil);
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (expireDate < today) subCountyMap[sc].licenses.expired++;
        else if (expireDate <= thirtyDays) subCountyMap[sc].licenses.expiring++;
        else subCountyMap[sc].licenses.valid++;
      }
    });
    return Object.values(subCountyMap)
      .sort((a: any, b: any) => b.staff - a.staff)
      .slice(0, 8);
  }, [employees?.data]);

  const facilityStats = React.useMemo(() => {
    if (!employees?.data) return [];
    const facilityMap: Record<string, any> = {};
    employees.data.forEach((emp: any) => {
      const f = emp.station || "Unknown";
      if (!facilityMap[f]) {
        facilityMap[f] = {
          name: f,
          county: emp.county || "Unknown",
          staff: 0,
          complianceRate: 100,
        };
      }
      facilityMap[f].staff++;
    });
    return Object.values(facilityMap)
      .sort((a: any, b: any) => b.staff - a.staff)
      .slice(0, 8);
  }, [employees?.data]);

  // ===== INSIGHTS DATA =====
  const avgAge = React.useMemo(() => {
    if (!employees?.data) return 0;
    const ages = employees.data
      .filter((e: any) => e.age)
      .map((e: any) => e.age);
    return ages.length > 0
      ? Math.round(
          ages.reduce((a: number, b: number) => a + b, 0) / ages.length,
        )
      : 0;
  }, [employees?.data]);

  const ageDistribution = React.useMemo(() => {
    if (!employees?.data) return [];
    const ranges: any = {
      "20-30": 0,
      "31-40": 0,
      "41-50": 0,
      "51-60": 0,
      "60+": 0,
    };
    employees.data.forEach((emp: any) => {
      const age = emp.age;
      if (age) {
        if (age <= 30) ranges["20-30"]++;
        else if (age <= 40) ranges["31-40"]++;
        else if (age <= 50) ranges["41-50"]++;
        else if (age <= 60) ranges["51-60"]++;
        else ranges["60+"]++;
      }
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [employees?.data]);

  const avgTenure = React.useMemo(() => {
    if (!employees?.data) return 0;
    const now = new Date();
    const tenures = employees.data
      .map((emp: any) => {
        if (!emp.dateEmployed) return null;
        return (
          Math.round(
            ((now.getTime() - new Date(emp.dateEmployed).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25)) *
              10,
          ) / 10
        );
      })
      .filter((t: any) => t !== null);
    return tenures.length > 0
      ? Math.round(
          (tenures.reduce((a: any, b: any) => a + b, 0) / tenures.length) * 10,
        ) / 10
      : 0;
  }, [employees?.data]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const totalPersonnel =
    (analytics?.summary?.totalEmployees || 0) +
    (analytics?.summary?.totalLayworkers || 0);
  const expiredLicenses = analytics?.summary?.expiredLicenses || 0;
  const validLicenses =
    (analytics?.summary?.totalEmployees || 0) -
    (analytics?.summary?.expiringLicenses || 0) -
    expiredLicenses;
  const complianceRate =
    analytics?.summary?.totalEmployees > 0
      ? Math.round((validLicenses / analytics?.summary?.totalEmployees) * 100)
      : 0;

  const metrics = [
    // Headcount cards belong to the HRH (county) roster only — CHAK and CBSL
    // are facility-seconded staff with no layworker complement, so those two
    // cards are dropped there and Total Personnel leads the row instead.
    ...(category === "HRH"
      ? [
          {
            title: "Total Employees",
            value: analytics?.summary?.totalEmployees || 0,
            icon: <Users className="h-6 w-6" />,
            description: "Professional staff members",
          },
          {
            title: "Total Layworkers",
            value: analytics?.summary?.totalLayworkers || 0,
            icon: <Users2 className="h-6 w-6" />,
            description: "Casual & temporary staff",
          },
        ]
      : [
          {
            title: "Total Personnel",
            value: totalPersonnel,
            icon: <Users className="h-6 w-6" />,
            change: "Professional staff members",
          },
        ]),
    {
      title: "License Status",
      value: validLicenses,
      icon: <Award className="h-6 w-6 text-sky-600" />,
      change: `${analytics?.summary?.expiringLicenses || 0} expiring · ${expiredLicenses} expired`,
    },
    {
      title: "License Alerts",
      value: (analytics?.summary?.expiringLicenses || 0) + expiredLicenses,
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      change: `${analytics?.summary?.expiringLicenses || 0} expiring, ${expiredLicenses} expired`,
    },
    {
      title: "Compliance Rate",
      value: `${complianceRate}%`,
      icon: <BarChart3 className="h-6 w-6 text-green-600" />,
      change: `${validLicenses} valid licenses`,
    },
    {
      title: "Male / Female",
      value: `${genderSplit.male} / ${genderSplit.female}`,
      icon: (
        <div className="flex items-center gap-1">
          <Mars className="h-6 w-6 text-blue-600" />
          <Venus className="h-6 w-6 text-pink-600" />
        </div>
      ),
      change: `${genderSplit.male} male · ${genderSplit.female} female`,
    },
    {
      title: "Total Disabled",
      value: disabledCounts[category] ?? 0,
      icon: <Accessibility className="h-6 w-6 text-violet-600" />,
      change: "with a declared disability",
    },
  ];

  // ===== ANALYTICS DATA =====
  const totalEmployees = analytics?.summary?.totalEmployees || 0;
  const totalLayworkers = analytics?.summary?.totalLayworkers || 0;

  const countyGenderData = (analytics?.countyDistribution || [])
    .slice(0, 8)
    .map((county: any) => ({
      county: county.name,
      male: Math.ceil(county.value * 0.45),
      female: Math.ceil(county.value * 0.55),
    }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with Add New Worker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Analytics, operations, and workforce insights at a glance
          </p>
        </div>
        <Button
          onClick={() => setAddWorkerOpen(true)}
          className="gap-2 bg-green-600 hover:bg-green-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add New Worker
        </Button>
      </div>

      {/* Category filter — scopes every metric, card and chart below */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          View data by category:
        </span>
        <div
          role="group"
          aria-label="View data by category"
          className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
        >
          {CATEGORY_ORDER.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-blue-600 font-medium text-white shadow-sm"
                    : "text-foreground/70 hover:bg-background/60 hover:text-foreground",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>

      {/* Quick Stats Row — Total Personnel is a top KPI card for CHAK / CBSL,
          so it is only repeated here for the HRH roster. */}
      <div className="grid gap-4 md:grid-cols-4">
        {category === "HRH" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Personnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPersonnel}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Employees + Layworkers
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sub-county coverage only applies to the HRH roster. */}
        {category === "HRH" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Sub-Counties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subCountyStats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                operational regions
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Avg. Tenure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTenure}</div>
            <p className="text-xs text-muted-foreground mt-1">
              years of service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-600" />
              Avg. Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAge}</div>
            <p className="text-xs text-muted-foreground mt-1">years old</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs — Overview / Analytics / Operations / Insights.
          Operations is HRH-only, so CHAK and CBSL get three tabs. */}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab((value as string) || "overview")}
        className="w-full"
      >
        <TabsList
          className={cn(
            "grid w-full max-w-2xl",
            category === "HRH" ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {category === "HRH" && (
            <TabsTrigger value="operations">Operations</TabsTrigger>
          )}
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          {analytics && <DashboardCharts analytics={analytics} />}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Gender Distribution by County
                </CardTitle>
                <CardDescription>
                  Workforce gender composition per county
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={countyGenderData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                    />
                    <XAxis dataKey="county" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="male" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="female"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Education Levels</CardTitle>
                <CardDescription>
                  Workforce qualifications breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.educationDistribution || []).map((edu: any) => (
                    <div
                      key={edu.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {edu.name || "Unknown"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{
                              width: `${((edu.value || 0) / (Math.max(...(analytics?.educationDistribution || []).map((e: any) => e.value)) || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {edu.value}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.educationDistribution ||
                    analytics.educationDistribution.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No education data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Personnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalEmployees + totalLayworkers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {category === "HRH"
                    ? `${totalEmployees} + ${totalLayworkers} layworkers`
                    : `${totalEmployees} professional staff`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {complianceRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Licenses valid
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Designations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.designationDistribution || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Types of roles
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Counties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.countyDistribution || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Coverage areas
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OPERATIONS TAB — HRH roster only (no sub-counties in CHAK / CBSL) */}
        {category === "HRH" && (
          <TabsContent value="operations" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Sub-county coverage only applies to the HRH roster. */}
              {category === "HRH" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Sub-Counties
                    </CardTitle>
                    <MapPin className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {subCountyStats.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      operational regions
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Facilities
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {facilityStats.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    operational stations
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Staff
                  </CardTitle>
                  <Users className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {employees?.data?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    distributed across regions
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Sub-County Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff by Sub-County</CardTitle>
                  <CardDescription>
                    Top sub-counties by headcount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={subCountyStats}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={70}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Bar dataKey="staff" fill="#6366f1" radius={[0, 6, 6, 0]}>
                        {subCountyStats.map((_: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Facility Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff by Facility</CardTitle>
                  <CardDescription>Top facilities by headcount</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={facilityStats}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="staff"
                        fill="#10b981"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* INSIGHTS TAB */}
        <TabsContent value="insights" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Avg. Tenure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avgTenure}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  years of service
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg. Age
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avgAge}</div>
                <p className="text-xs text-muted-foreground mt-1">years old</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Most Common Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold truncate text-sm">
                  {analytics?.topDesignations?.[0]?.name || "-"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.topDesignations?.[0]?.value || 0} employees
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>
                  Workforce demographics by age group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ageDistribution.map((item: any) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(item.value / Math.max(...ageDistribution.map((d: any) => d.value))) * 100}%`,
                            }}
                          />
                        </div>
                        <Badge variant="secondary">{item.value}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Workforce composition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.genderDistribution || []).map(
                    (item: any, idx: number) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(item.value / (analytics?.genderDistribution || []).reduce((sum: number, i: any) => sum + i.value, 0)) * 100}%`,
                                backgroundColor:
                                  idx === 0 ? "#3b82f6" : "#10b981",
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{item.value}</Badge>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Designations */}
          {analytics?.designationDistribution && (
            <Card>
              <CardHeader>
                <CardTitle>Top Designations</CardTitle>
                <CardDescription>
                  Most common job roles in the organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.designationDistribution
                    .slice(0, 10)
                    .map((role: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium truncate">
                          {role.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{
                                width: `${(role.value / analytics.designationDistribution[0].value) * 100}%`,
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{role.value}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Worker Modal */}
      <NewWorkerModal
        open={addWorkerOpen}
        onOpenChange={setAddWorkerOpen}
        onSuccess={refresh}
      />
    </div>
  );
}

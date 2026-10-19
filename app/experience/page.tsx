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
import { Badge } from "@/components/ui/badge";
import { TenureChart } from "@/components/better-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import { Calendar, TrendingUp, Award, Users, Clock, Star } from "lucide-react";
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
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExperiencePage() {
  const { data: employees, isLoading: employeesLoading } = useSWR(
    "/api/employees?limit=1000",
    fetcher,
  );
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    "/api/analytics",
    fetcher,
  );

  const isLoading = employeesLoading || analyticsLoading;

  const tenureStats = React.useMemo(() => {
    if (!employees?.data) return { avg: 0, ranges: [] };

    const now = new Date();
    const tenures = employees.data
      .map((emp: any) => {
        if (!emp.dateEmployed) return null;
        const employed = new Date(emp.dateEmployed);
        return (
          Math.round(
            ((now.getTime() - employed.getTime()) /
              (1000 * 60 * 60 * 24 * 365.25)) *
              10,
          ) / 10
        );
      })
      .filter((t: any) => t !== null && t >= 0);

    const avg =
      tenures.length > 0
        ? Math.round(
            (tenures.reduce((a: any, b: any) => a + b, 0) / tenures.length) *
              10,
          ) / 10
        : 0;
    const min = tenures.length > 0 ? Math.min(...tenures) : 0;
    const max = tenures.length > 0 ? Math.max(...tenures) : 0;

    return { avg, min, max, ranges: tenures, count: tenures.length };
  }, [employees?.data]);

  const careerProgressionData = React.useMemo(() => {
    if (!employees?.data) return [];

    const designationTenure: Record<string, number[]> = {};

    employees.data.forEach((emp: any) => {
      const designation = emp.designation || "Unknown";
      const tenure = emp.dateEmployed
        ? Math.round(
            ((new Date().getTime() - new Date(emp.dateEmployed).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25)) *
              10,
          ) / 10
        : 0;

      if (!designationTenure[designation]) {
        designationTenure[designation] = [];
      }
      designationTenure[designation].push(tenure);
    });

    return Object.entries(designationTenure)
      .map(([designation, tenures]) => ({
        designation,
        avgTenure:
          Math.round(
            (tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10,
          ) / 10,
        count: tenures.length,
        maxTenure: Math.max(...tenures),
      }))
      .sort((a, b) => b.avgTenure - a.avgTenure)
      .slice(0, 10);
  }, [employees?.data]);

  const seniorStaff = React.useMemo(() => {
    if (!employees?.data) return [];

    return employees.data
      .map((emp: any) => ({
        ...emp,
        tenure: emp.dateEmployed
          ? Math.floor(
              (new Date().getTime() - new Date(emp.dateEmployed).getTime()) /
                (1000 * 60 * 60 * 24 * 365),
            )
          : 0,
      }))
      .filter((emp: any) => emp.tenure >= 10)
      .sort((a: any, b: any) => b.tenure - a.tenure)
      .slice(0, 20);
  }, [employees?.data]);

  // All employees with computed tenure, sorted by tenure descending
  const allEmployeeTenures = React.useMemo(() => {
    if (!employees?.data) return [];
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return employees.data
      .map((emp: any) => {
        const tenure = emp.dateEmployed
          ? Math.round(
              ((new Date().getTime() - new Date(emp.dateEmployed).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25)) *
                10,
            ) / 10
          : 0;
        return {
          name: emp.name || "-",
          designation: emp.designation || "-",
          county: emp.county || "-",
          dateEmployed: emp.dateEmployed,
          tenure,
          todayStr,
        };
      })
      .sort((a: any, b: any) => b.tenure - a.tenure);
  }, [employees?.data]);

  const experienceByDesignation = React.useMemo(() => {
    if (!analytics?.designationDistribution) return [];
    return analytics.designationDistribution
      .slice(0, 10)
      .map((d: any, idx: number) => ({
        name: d.name,
        value: d.value,
        color: `hsl(${idx * 36}, 70%, 50%)`,
      }));
  }, [analytics]);

  // Extra insights: new hires, long-serving staff, tenure range buckets,
  // and the single most senior employee.
  const tenureInsights = React.useMemo(() => {
    if (!employees?.data)
      return {
        newHires: 0,
        longServing: 0,
        mostSenior: null,
        ranges: [],
      };
    const now = new Date();
    const ranges: Record<string, number> = {
      "0-2 years": 0,
      "2-5 years": 0,
      "5-10 years": 0,
      "10-15 years": 0,
      "15+ years": 0,
    };
    let newHires = 0;
    let longServing = 0;
    let mostSenior: any = null;
    employees.data.forEach((emp: any) => {
      if (!emp.dateEmployed) return;
      const years =
        (now.getTime() - new Date(emp.dateEmployed).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      if (years < 1) newHires++;
      if (years >= 15) longServing++;
      if (years <= 2) ranges["0-2 years"]++;
      else if (years <= 5) ranges["2-5 years"]++;
      else if (years <= 10) ranges["5-10 years"]++;
      else if (years <= 15) ranges["10-15 years"]++;
      else ranges["15+ years"]++;
      if (!mostSenior || years > mostSenior.years) {
        mostSenior = {
          name: emp.name || "—",
          years: Math.round(years * 10) / 10,
        };
      }
    });
    const max = Math.max(...Object.values(ranges), 1);
    return {
      newHires,
      longServing,
      mostSenior,
      ranges: Object.entries(ranges).map(([name, value]) => ({
        name,
        value,
        pct: Math.round((value / max) * 100),
      })),
    };
  }, [employees?.data]);

  // Average tenure per county (top 10) — a second insight chart.
  const tenureByCounty = React.useMemo(() => {
    if (!employees?.data) return [];
    const map: Record<string, number[]> = {};
    const now = new Date();
    employees.data.forEach((emp: any) => {
      if (!emp.dateEmployed) return;
      const county = emp.county || "Unknown";
      const years =
        (now.getTime() - new Date(emp.dateEmployed).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      if (!map[county]) map[county] = [];
      map[county].push(years);
    });
    return Object.entries(map)
      .map(([county, ys]) => ({
        county,
        avgTenure:
          Math.round((ys.reduce((a, b) => a + b, 0) / ys.length) * 10) / 10,
        count: ys.length,
      }))
      .sort((a, b) => b.avgTenure - a.avgTenure)
      .slice(0, 10);
  }, [employees?.data]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Experience & Career
        </h2>
        <p className="text-muted-foreground mt-1">
          Tenure analysis, career progression, and staff experience tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tenure</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenureStats.avg}</div>
            <p className="text-xs text-muted-foreground mt-1">
              years of service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Experienced
            </CardTitle>
            <Award className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenureInsights.mostSenior?.years ?? tenureStats.max}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {tenureInsights.mostSenior?.name || "maximum tenure"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Senior Staff (10+ yrs)
            </CardTitle>
            <Star className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seniorStaff.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              experienced professionals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              With Tenure Data
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenureStats.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              employees tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenure Distribution — fixed mapping so the line chart renders */}
      {analytics?.tenureDistribution && (
        <TenureChart
          data={analytics.tenureDistribution.map((d: any) => ({
            name: d.name,
            count: d.value,
          }))}
        />
      )}

      {/* Experience Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Hires (under 1 yr)
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {tenureInsights.newHires}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              joined within the last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Long-Serving (15+ yrs)
            </CardTitle>
            <Clock className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {tenureInsights.longServing}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              15 or more years of service
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenure Range Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Tenure Range Distribution</CardTitle>
          <CardDescription>
            Staff experience brackets with headcount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {tenureInsights.ranges.map((r: any) => (
              <div key={r.name} className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{r.value}</div>
                <div className="text-xs font-medium text-muted-foreground">
                  {r.name}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Tenure by County */}
      <Card>
        <CardHeader>
          <CardTitle>Average Tenure by County</CardTitle>
          <CardDescription>
            Mean years of service per operational county (top 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={tenureByCounty}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 110, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="county"
                type="category"
                width={100}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="avgTenure"
                name="Avg years"
                fill="#8b5cf6"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* All Employees — Years of Experience */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees — Years of Experience</CardTitle>
          <CardDescription>
            Present date: {allEmployeeTenures[0]?.todayStr || "—"} &mdash;{" "}
            {allEmployeeTenures.length} employees listed by tenure
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Date Employed</TableHead>
                  <TableHead className="text-right">
                    Years of Experience
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEmployeeTenures.map((emp: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.county}</TableCell>
                    <TableCell>
                      {emp.dateEmployed
                        ? new Date(emp.dateEmployed).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <Badge
                        variant={
                          emp.tenure >= 5
                            ? "default"
                            : emp.tenure >= 2
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          emp.tenure >= 5
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : emp.tenure >= 2
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : ""
                        }
                      >
                        {emp.tenure} yrs
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Career Progression by Designation */}
      <Card>
        <CardHeader>
          <CardTitle>Career Progression by Designation</CardTitle>
          <CardDescription>
            Average tenure and staff count by position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {careerProgressionData.map((item: any) => (
              <div key={item.designation} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium truncate">
                      {item.designation}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} staff members
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-600">
                      {item.avgTenure} yrs
                    </p>
                    <p className="text-xs text-muted-foreground">avg tenure</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(item.avgTenure / Math.max(...careerProgressionData.map((d: any) => d.avgTenure), 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Senior Staff Table */}
      {seniorStaff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Senior Staff (10+ Years Experience)</CardTitle>
            <CardDescription>
              Most experienced employees in the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead className="text-center">
                      Tenure (Years)
                    </TableHead>
                    <TableHead>Employment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seniorStaff.map((emp: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {emp.name || "-"}
                      </TableCell>
                      <TableCell>{emp.designation || "-"}</TableCell>
                      <TableCell>{emp.county || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {emp.tenure} yrs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.dateEmployed
                          ? new Date(emp.dateEmployed).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

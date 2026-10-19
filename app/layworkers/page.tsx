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
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, MapPin, Briefcase, BadgeIndianRupee } from "lucide-react";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function LayworkersPage() {
  const { data, isLoading } = useSWR("/api/layworkers", fetcher);

  const layworkers = data?.layworkers || [];

  // Group by county
  const byCounty = React.useMemo(() => {
    return (data?.layworkers || []).reduce((acc: any, worker: any) => {
      const county = worker.county || "Unknown";
      if (!acc[county]) acc[county] = [];
      acc[county].push(worker);
      return acc;
    }, {});
  }, [data?.layworkers]);

  const counties = Object.keys(byCounty).sort();

  // County distribution for pie/bar charts
  const countyData = React.useMemo(() => {
    return Object.entries(byCounty)
      .map(([county, workers]: [string, any]) => ({
        name: county,
        value: workers.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [byCounty]);

  // Cadre distribution
  const cadreData = React.useMemo(() => {
    const cadreMap: Record<string, number> = {};
    (data?.layworkers || []).forEach((worker: any) => {
      const c = worker.cadre || "Unknown";
      cadreMap[c] = (cadreMap[c] || 0) + 1;
    });
    return Object.entries(cadreMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data?.layworkers]);

  const totalAmount = React.useMemo(() => {
    return (data?.layworkers || []).reduce((sum: number, w: any) => {
      const amt = parseFloat(w.amount) || 0;
      return sum + amt;
    }, 0);
  }, [data?.layworkers]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Navigation */}
      <BackButton />

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Layworkers Management
        </h2>
        <p className="text-muted-foreground mt-1">
          View and manage casual laborers and temporary staff
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Layworkers
            </CardTitle>
            <Users2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layworkers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {counties.length} counties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Counties</CardTitle>
            <MapPin className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counties.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Operational counties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadres</CardTitle>
            <Briefcase className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cadreData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Staff categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <BadgeIndianRupee className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative allowance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* County Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>County Distribution</CardTitle>
            <CardDescription>Layworkers by county</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {countyData.map((entry, idx) => (
                    <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cadre Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Cadre Distribution</CardTitle>
            <CardDescription>Layworkers by staff category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cadreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {cadreData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[(idx + 4) % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* County Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Layworkers by County</CardTitle>
            <CardDescription>Number of layworkers per county</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  label={{ position: "top", fontSize: 12 }}
                >
                  {countyData.map((entry, idx) => (
                    <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* County Breakdown */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-lg" />
          ))}
        </div>
      ) : counties.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No layworker data available
            </p>
          </CardContent>
        </Card>
      ) : (
        counties.map((county) => (
          <Card key={county}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {county}
                <span className="text-sm font-normal text-muted-foreground">
                  ({byCounty[county].length})
                </span>
              </CardTitle>
              <CardDescription>
                Casual laborers and temporary staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Facility</TableHead>
                      <TableHead className="font-semibold">
                        Sub County
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCounty[county].map((worker: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {worker.name || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {worker.facility || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {worker.subCounty || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

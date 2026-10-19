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
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import {
  DollarSign,
  Users,
  Briefcase,
  TrendingUp,
  Calculator,
  Banknote,
  CreditCard,
  PieChart,
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
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PAY_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

// Assumed salary brackets by designation level (in KES)
const getSalaryEstimate = (
  designation: string,
  tenure: number,
): { min: number; max: number; avg: number } => {
  const base = designation.toLowerCase();
  if (
    base.includes("director") ||
    base.includes("chief") ||
    base.includes("head")
  ) {
    return { min: 250000, max: 500000, avg: 350000 };
  }
  if (
    base.includes("manager") ||
    base.includes("coordinator") ||
    base.includes("officer ii")
  ) {
    return { min: 120000, max: 250000, avg: 180000 };
  }
  if (
    base.includes("officer i") ||
    base.includes("senior") ||
    base.includes("specialist")
  ) {
    return { min: 80000, max: 150000, avg: 110000 };
  }
  if (
    base.includes("assistant") ||
    base.includes("technician") ||
    base.includes("intern")
  ) {
    return { min: 30000, max: 70000, avg: 50000 };
  }
  if (
    base.includes("nurse") ||
    base.includes("clinical") ||
    base.includes("pharmacist")
  ) {
    return { min: 70000, max: 180000, avg: 120000 };
  }
  if (
    base.includes("driver") ||
    base.includes("clerk") ||
    base.includes("attendant")
  ) {
    return { min: 25000, max: 50000, avg: 35000 };
  }
  return { min: 40000, max: 100000, avg: 65000 };
};

export default function PayrollPage() {
  const { data: employees, isLoading: employeesLoading } = useSWR(
    "/api/employees?limit=1000",
    fetcher,
  );
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    "/api/analytics",
    fetcher,
  );

  const isLoading = employeesLoading || analyticsLoading;

  // Payroll summary stats
  const payrollSummary = React.useMemo(() => {
    if (!employees?.data) return null;

    const now = new Date();
    let totalGrossPay = 0;
    let totalCount = 0;
    const designationPay: Record<
      string,
      { count: number; total: number; min: number; max: number }
    > = {};
    const countyPay: Record<string, { count: number; total: number }> = {};

    employees.data.forEach((emp: any) => {
      const tenure = emp.dateEmployed
        ? Math.floor(
            (now.getTime() - new Date(emp.dateEmployed).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          )
        : 0;
      const salary = getSalaryEstimate(emp.designation || "", tenure);
      const avgPay = salary.avg;

      totalGrossPay += avgPay;
      totalCount++;

      const desig = emp.designation || "Unknown";
      if (!designationPay[desig]) {
        designationPay[desig] = {
          count: 0,
          total: 0,
          min: salary.min,
          max: salary.max,
        };
      }
      designationPay[desig].count++;
      designationPay[desig].total += avgPay;

      const county = emp.county || "Unknown";
      if (!countyPay[county]) {
        countyPay[county] = { count: 0, total: 0 };
      }
      countyPay[county].count++;
      countyPay[county].total += avgPay;
    });

    // Top designations by payroll
    const topDesignations = Object.entries(designationPay)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalPay: data.total,
        avgPay: Math.round(data.total / data.count),
        minPay: data.min,
        maxPay: data.max,
      }))
      .sort((a, b) => b.totalPay - a.totalPay)
      .slice(0, 10);

    // Top counties by payroll
    const topCounties = Object.entries(countyPay)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalPay: data.total,
        avgPay: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.totalPay - a.totalPay)
      .slice(0, 10);

    return {
      totalGrossPay,
      totalCount,
      avgPayPerPerson: Math.round(totalGrossPay / totalCount),
      monthlyPayroll: Math.round(totalGrossPay / 12),
      topDesignations,
      topCounties,
    };
  }, [employees?.data]);

  // Payroll distribution data
  const payrollDistribution = React.useMemo(() => {
    if (!payrollSummary) return [];

    const brackets = [
      { range: "Below 50K", min: 0, max: 50000 },
      { range: "50K - 100K", min: 50000, max: 100000 },
      { range: "100K - 150K", min: 100000, max: 150000 },
      { range: "150K - 250K", min: 150000, max: 250000 },
      { range: "250K - 500K", min: 250000, max: 500000 },
      { range: "Above 500K", min: 500000, max: Infinity },
    ];

    if (!employees?.data) return [];

    const now = new Date();
    const counts = brackets.map((b) => ({ range: b.range, count: 0 }));

    employees.data.forEach((emp: any) => {
      const tenure = emp.dateEmployed
        ? Math.floor(
            (now.getTime() - new Date(emp.dateEmployed).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          )
        : 0;
      const salary = getSalaryEstimate(emp.designation || "", tenure);
      const bracketIdx = brackets.findIndex(
        (b) => salary.avg >= b.min && salary.avg < b.max,
      );
      if (bracketIdx >= 0) counts[bracketIdx].count++;
    });

    return counts;
  }, [employees?.data, payrollSummary]);

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
        <h2 className="text-3xl font-bold tracking-tight">Payroll Overview</h2>
        <p className="text-muted-foreground mt-1">
          Salary analysis, payroll distribution, and compensation insights
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Annual Payroll
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES{" "}
              {payrollSummary
                ? (payrollSummary.totalGrossPay / 1000000).toFixed(1)
                : 0}
              M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              estimated gross annual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Payroll
            </CardTitle>
            <Banknote className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES{" "}
              {payrollSummary
                ? (payrollSummary.monthlyPayroll / 1000000).toFixed(1)
                : 0}
              M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              estimated monthly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Salary</CardTitle>
            <CreditCard className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES{" "}
              {payrollSummary
                ? payrollSummary.avgPayPerPerson.toLocaleString()
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per employee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payroll Headcount
            </CardTitle>
            <Users className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollSummary?.totalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              active employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Salary Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Distribution</CardTitle>
            <CardDescription>Employees by salary bracket</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={payrollDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payroll by Designation */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll by Designation</CardTitle>
            <CardDescription>Top designations by total payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={payrollSummary?.topDesignations.slice(0, 8) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `KES ${value.toLocaleString()}`,
                    "Total Pay",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="totalPay" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Designation Salary Details */}
      <Card>
        <CardHeader>
          <CardTitle>Salary by Designation</CardTitle>
          <CardDescription>
            Estimated salary ranges and averages per role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-center">Staff Count</TableHead>
                  <TableHead className="text-center">Min (KES)</TableHead>
                  <TableHead className="text-center">Avg (KES)</TableHead>
                  <TableHead className="text-center">Max (KES)</TableHead>
                  <TableHead>Total Payroll (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollSummary?.topDesignations.map(
                  (item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">
                        {item.count}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.minPay.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-green-600">
                          {item.avgPay.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.maxPay.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.totalPay.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payroll by County */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll by County</CardTitle>
          <CardDescription>
            Salary distribution across operational regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>County</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  <TableHead className="text-center">
                    Avg Salary (KES)
                  </TableHead>
                  <TableHead>Total Payroll (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollSummary?.topCounties.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.count}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.avgPay.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.totalPay.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

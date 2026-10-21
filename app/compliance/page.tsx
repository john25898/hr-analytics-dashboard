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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import { LicenseStatusChart } from "@/components/better-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeEditModal } from "@/components/employee-edit-modal";
import { CategoryPills } from "@/components/category-pills";
import { getEmployeeEdit } from "@/lib/employee-store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CompliancePage() {
  // HRH | CHAK | CBSL — metrics and every license list follow this category.
  const [category, setCategory] = React.useState("HRH");
  const {
    data: employees,
    isLoading: employeesLoading,
    mutate: mutateEmployees,
  } = useSWR(`/api/employees?category=${category}`, fetcher);
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    `/api/analytics?category=${category}`,
    fetcher,
  );

  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  const isLoading = employeesLoading || analyticsLoading;

  // Effective license values — an HR-saved renewal overrides the source data
  // so the page always reflects the latest license state.
  const effectiveValidUntil = (emp: any) => {
    const edit = emp?.name ? getEmployeeEdit(emp.name) : undefined;
    return edit?.license?.validUntil || emp?.validUntil;
  };
  const effectiveLicenceNo = (emp: any) => {
    const edit = emp?.name ? getEmployeeEdit(emp.name) : undefined;
    return edit?.license?.licenceNo || emp?.practiseeLicence;
  };

  // Get expired and expiring licenses
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(
    today.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const noLicenseData =
    employees?.data?.filter((emp: any) => !effectiveValidUntil(emp)) || [];

  const expiredLicenses =
    employees?.data?.filter((emp: any) => {
      const v = effectiveValidUntil(emp);
      if (!v) return false;
      const expireDate = new Date(v);
      return expireDate < today;
    }) || [];

  const expiringLicenses =
    employees?.data?.filter((emp: any) => {
      const v = effectiveValidUntil(emp);
      if (!v) return false;
      const expireDate = new Date(v);
      return expireDate <= thirtyDaysFromNow && expireDate >= today;
    }) || [];

  const validLicenses =
    employees?.data?.filter((emp: any) => {
      const v = effectiveValidUntil(emp);
      if (!v) return false;
      const expireDate = new Date(v);
      return expireDate > thirtyDaysFromNow;
    }) || [];

  function formatDate(date: any) {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(date);
    }
  }

  const licenseTable = (data: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold">Designation</TableHead>
            <TableHead className="font-semibold">County</TableHead>
            <TableHead className="font-semibold">License No.</TableHead>
            <TableHead className="font-semibold">Valid Until</TableHead>
            <TableHead className="font-semibold">Days Remaining</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No records found
              </TableCell>
            </TableRow>
          ) : (
            data.map((emp: any, idx: number) => {
              const validUntil = effectiveValidUntil(emp);
              const expireDate = validUntil ? new Date(validUntil) : null;
              const daysRemaining = expireDate
                ? Math.floor(
                    (expireDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : null;
              return (
                <TableRow
                  key={idx}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setEditModalOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {emp.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{emp.category || "HRH"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {emp.designation || "-"}
                  </TableCell>
                  <TableCell className="text-sm">{emp.county || "-"}</TableCell>
                  <TableCell className="text-sm font-mono">
                    {effectiveLicenceNo(emp) || "-"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatDate(validUntil)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {daysRemaining === null ? (
                      <span className="text-muted-foreground">No data</span>
                    ) : daysRemaining < 0 ? (
                      <span className="text-red-600 font-semibold">
                        {Math.abs(daysRemaining)} days expired
                      </span>
                    ) : (
                      <span>{daysRemaining} days</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
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
          Compliance Tracking
        </h2>
        <p className="text-muted-foreground mt-1">
          Monitor employee licenses and compliance status
        </p>
      </div>

      {/* Category scope — HRH / CHAK / CBSL, same as the dashboard */}
      <CategoryPills value={category} onChange={setCategory} />

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valid Licenses
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validLicenses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              More than 30 days valid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {expiringLicenses.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Within next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expiredLicenses.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Action required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Available</CardTitle>
            <AlertCircle className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {noLicenseData.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No license data on file
            </p>
          </CardContent>
        </Card>
      </div>

      {/* License Details */}
      <Tabs defaultValue="expiring" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
          <TabsTrigger value="expiring">
            Expiring Soon
            <Badge variant="secondary" className="ml-2">
              {expiringLicenses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired
            <Badge variant="secondary" className="ml-2">
              {expiredLicenses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="valid">
            Valid
            <Badge variant="secondary" className="ml-2">
              {validLicenses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="no-license">
            Not Available
            <Badge variant="secondary" className="ml-2">
              {noLicenseData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Licenses Expiring Within 30 Days</CardTitle>
              <CardDescription>
                These licenses require immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>{licenseTable(expiringLicenses)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expired Licenses</CardTitle>
              <CardDescription>
                These employees need license renewal
              </CardDescription>
            </CardHeader>
            <CardContent>{licenseTable(expiredLicenses)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valid" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Valid Licenses</CardTitle>
              <CardDescription>
                Licenses valid for more than 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>{licenseTable(validLicenses)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="no-license" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>No License Data</CardTitle>
              <CardDescription>
                These employees have no licence information on file
              </CardDescription>
            </CardHeader>
            <CardContent>{licenseTable(noLicenseData)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* License Status Overview */}
      {analytics?.licenseStatus && (
        <LicenseStatusChart data={analytics.licenseStatus} />
      )}

      {/* Employee details — click any license row to renew / update */}
      <EmployeeEditModal
        employee={selectedEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onEmployeeUpdated={() => mutateEmployees()}
      />
    </div>
  );
}

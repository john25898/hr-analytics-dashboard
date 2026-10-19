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
import { UnifiedFilters } from "@/components/unified-filters";
import { EmployeesTable } from "@/components/employees-table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Plus } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { EmployeeEditModal } from "@/components/employee-edit-modal";
import { Button } from "@/components/ui/button";
import { NewWorkerModal } from "@/components/new-worker-modal";
import { pullChangesFromBackend } from "@/lib/employee-store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [filters, setFilters] = React.useState({
    county: "all",
    designation: "all",
    gender: "all",
    status: "all",
    education: "all",
    regulatoryBody: "all",
    search: "",
  });

  // Pull HR changes (new workers, edits, contract extensions) from the shared
  // Supabase backend once on mount, so this browser sees what other
  // browsers/devices added. DB wins when it has data.
  React.useEffect(() => {
    let cancelled = false;
    pullChangesFromBackend().then((mods) => {
      if (!cancelled && mods) {
        setRefreshKey((k) => k + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const queryParams = new URLSearchParams();
  if (filters.county !== "all") queryParams.append("county", filters.county);
  if (filters.designation !== "all")
    queryParams.append("designation", filters.designation);
  if (filters.gender !== "all") queryParams.append("gender", filters.gender);
  if (filters.status !== "all") queryParams.append("status", filters.status);
  if (filters.education !== "all")
    queryParams.append("education", filters.education);
  if (filters.regulatoryBody !== "all")
    queryParams.append("regulatoryBody", filters.regulatoryBody);
  if (filters.search) queryParams.append("search", filters.search);

  const { data: employeeData, isLoading: employeesLoading } = useSWR(
    `/api/employees?${queryParams.toString()}&_=${refreshKey}`,
    fetcher,
  );

  const { data: analyticsData, isLoading: analyticsLoading } = useSWR(
    `/api/analytics?_=${refreshKey}`,
    fetcher,
  );

  // Prepare filter options
  const filterOptions = React.useMemo(() => {
    if (!analyticsData)
      return {
        counties: [],
        designations: [],
        genders: [],
        statuses: [],
        educationLevels: [],
        regulatoryBodies: [],
      };

    const counties = Object.keys(
      analyticsData.countyDistribution?.reduce((acc: any, item: any) => {
        acc[item.name] = true;
        return acc;
      }, {}) || {},
    );

    const designations =
      analyticsData.designationGroupDistribution?.map(
        (item: any) => item.name,
      ) ||
      analyticsData.designationDistribution?.map((item: any) => item.name) ||
      [];
    [];
    const genders =
      analyticsData.genderDistribution?.map((item: any) => item.name) || [];
    const statuses =
      analyticsData.licenseStatus?.map((item: any) => item.name) || [];
    const educationLevels =
      analyticsData.educationDistribution?.map((item: any) => item.name) || [];
    const regulatoryBodies =
      analyticsData.regulatoryBodies?.map((item: any) => item.name) || [];

    return {
      counties: counties.sort(),
      designations: designations.sort(),
      genders: genders.sort(),
      statuses: statuses.sort(),
      educationLevels: educationLevels.sort(),
      regulatoryBodies: regulatoryBodies.sort(),
    };
  }, [analyticsData]);

  const isLoading = employeesLoading || analyticsLoading;

  // New workers, license/contract edits and departures are merged server-side
  // by /api/employees (see lib/hr-merge.ts), so the API response already
  // includes them and the count stays accurate.
  const mergedEmployees = React.useMemo(
    () => employeeData?.data || [],
    [employeeData?.data],
  );

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        {/* Navigation */}
        <BackButton />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Employee Directory
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage and view all employees across the organization
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

        {/* Filters */}
        <UnifiedFilters
          options={filterOptions}
          onFilterChange={setFilters}
          isLoading={isLoading}
        />

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employees</CardTitle>
                <CardDescription>
                  {mergedEmployees.length}{" "}
                  {mergedEmployees.length === 1 ? "employee" : "employees"}{" "}
                  found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : employeeData?.data?.length === 0 &&
              mergedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 py-12">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  No employees found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <EmployeesTable
                employees={mergedEmployees}
                onEmployeeClick={(emp) => {
                  setSelectedEmployee(emp);
                  setEditModalOpen(true);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Edit Modal */}
      <EmployeeEditModal
        employee={selectedEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onEmployeeUpdated={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Add New Worker Modal */}
      <NewWorkerModal
        open={addWorkerOpen}
        onOpenChange={setAddWorkerOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}

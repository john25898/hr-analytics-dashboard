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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import {
  AlertCircle,
  Trash2,
  Clock,
  Skull,
  LogOut,
  Handshake,
  UserX,
  CalendarX,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getModifications } from "@/lib/employee-store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Category =
  | "all"
  | "death"
  | "resignation"
  | "retirement"
  | "termination"
  | "end_of_contract";

const categories: {
  key: Category;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "all", label: "All", icon: AlertCircle, color: "text-gray-600" },
  {
    key: "end_of_contract",
    label: "End of Contract",
    icon: CalendarX,
    color: "text-orange-600",
  },
  {
    key: "resignation",
    label: "Resignation",
    icon: LogOut,
    color: "text-amber-600",
  },
  {
    key: "retirement",
    label: "Retirement",
    icon: Handshake,
    color: "text-blue-600",
  },
  { key: "death", label: "Death", icon: Skull, color: "text-red-600" },
  {
    key: "termination",
    label: "Termination",
    icon: UserX,
    color: "text-purple-600",
  },
];

function getCategoryBadge(category: string) {
  switch (category) {
    case "death":
      return (
        <Badge className="bg-red-100 text-red-800">
          <Skull className="h-3 w-3 mr-1" />
          Death
        </Badge>
      );
    case "resignation":
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <LogOut className="h-3 w-3 mr-1" />
          Resignation
        </Badge>
      );
    case "retirement":
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <Handshake className="h-3 w-3 mr-1" />
          Retirement
        </Badge>
      );
    case "termination":
      return (
        <Badge className="bg-purple-100 text-purple-800">
          <UserX className="h-3 w-3 mr-1" />
          Termination
        </Badge>
      );
    default:
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <CalendarX className="h-3 w-3 mr-1" />
          End of Contract
        </Badge>
      );
  }
}

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

export default function DepartedPage() {
  const { data: employees, isLoading } = useSWR(
    "/api/employees?limit=1000&includeDeparted=true",
    fetcher,
  );
  const [sortBy, setSortBy] = React.useState<"name" | "date">("date");
  const [category, setCategory] = React.useState<Category>("all");
  const [storeMods, setStoreMods] = React.useState<any>(null);

  // Read modifications from localStorage (client-side only)
  React.useEffect(() => {
    setStoreMods(getModifications());
  }, []);

  // Refresh when window gets focus (user may have edited from employees page)
  React.useEffect(() => {
    const onFocus = () => setStoreMods(getModifications());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const now = new Date();

  // Employees departed via modal exit reasons (or confirmed from notifications)
  const exitedEmployees = React.useMemo(() => {
    if (!storeMods?.employeeEdits) return [];
    const dataList: any[] = employees?.data || [];
    return Object.entries(storeMods.employeeEdits)
      .filter(([_, edit]: [string, any]) => edit.isDeparted && edit.exitReason)
      .map(([name, edit]: [string, any]) => {
        const emp = dataList.find((e: any) => e.name === name);
        return {
          name,
          designation: emp?.designation || "",
          county: emp?.county || "",
          exitReason: edit.exitReason,
          exitDate: edit.exitDate,
          daysAgo: edit.exitDate
            ? Math.floor(
                (now.getTime() - new Date(edit.exitDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0,
        };
      });
  }, [storeMods, employees?.data, now]);

  // Employees recorded as departed in the source data, or confirmed by HR.
  // Contract-expired staff are NEVER auto-departed — HR must confirm first
  // (via the notification bell or the employee edit modal), which writes an
  // `isDeparted` edit into the modifications store.
  const expiredEmployees = React.useMemo(() => {
    if (!employees?.data) return [];

    return employees.data
      .filter((emp: any) => {
        // Skip if this employee was exited via modal (already in exitedEmployees)
        if (storeMods?.employeeEdits?.[emp.name]?.isDeparted) return false;

        // Only show staff who are departed in the source data. Anyone whose
        // contract merely expired stays active until HR confirms departure.
        if (!emp.isDeparted) return false;

        // Contract end (employment) is the source of truth for departure — not
        // the practising-licence expiry, which can pass while the person is
        // still employed.
        const storedEdit = storeMods?.employeeEdits?.[emp.name];
        const contractDate =
          storedEdit?.endOfContract || emp.contractEnd || emp.validUntil;
        if (!contractDate) return false;
        const d = new Date(contractDate);
        return d < now;
      })
      .map((emp: any) => {
        const storedEdit = storeMods?.employeeEdits?.[emp.name];
        const contractDate =
          storedEdit?.endOfContract || emp.contractEnd || emp.validUntil;
        return {
          ...emp,
          endOfContractDate: contractDate,
          exitReason: "end_of_contract",
          daysAgo: Math.floor(
            (now.getTime() - new Date(contractDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        };
      });
  }, [employees?.data, storeMods, now]);

  const allDeparted = React.useMemo(() => {
    const combined = [...exitedEmployees, ...expiredEmployees];
    return combined
      .filter((emp: any) => {
        if (category === "all") return true;
        return emp.exitReason === category;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "date") return b.daysAgo - a.daysAgo;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [exitedEmployees, expiredEmployees, category, sortBy]);

  const categoryCounts = React.useMemo(() => {
    const all = [...exitedEmployees, ...expiredEmployees];
    const counts: Record<string, number> = { all: all.length };
    all.forEach((emp: any) => {
      const key = emp.exitReason || "end_of_contract";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [exitedEmployees, expiredEmployees]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Departed Employees
        </h2>
        <p className="text-muted-foreground mt-1">
          Employees who have exited the organization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              Total Departed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {allDeparted.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Recent (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {allDeparted.filter((e: any) => e.daysAgo <= 30).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Departed in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Filter by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.key] || 0;
              const isActive = category === cat.key;
              return (
                <Button
                  key={cat.key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.key)}
                  className={`gap-1.5 ${isActive ? "" : cat.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                  {count > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-0.5 text-xs"
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Departed Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Departed Staff List</CardTitle>
              <CardDescription>
                {allDeparted.length}{" "}
                {allDeparted.length === 1 ? "employee" : "employees"} recorded
                {category !== "all" &&
                  ` (filtered by ${categories.find((c) => c.key === category)?.label})`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={sortBy === "date" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSortBy("date")}
              >
                By Date
              </Badge>
              <Badge
                variant={sortBy === "name" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSortBy("name")}
              >
                By Name
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allDeparted.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No departed employees recorded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Date Departed</TableHead>
                    <TableHead className="text-right">Days Ago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDeparted.map((emp: any, idx: number) => (
                    <TableRow key={idx} className="text-muted-foreground">
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{getCategoryBadge(emp.exitReason)}</TableCell>
                      <TableCell className="text-sm">
                        {emp.designation || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {emp.county || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(
                          emp.exitDate ||
                            emp.endOfContractDate ||
                            emp.validUntil,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            emp.daysAgo <= 30 ? "destructive" : "secondary"
                          }
                        >
                          {emp.daysAgo}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary by County */}
      {allDeparted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Departed Employees by County</CardTitle>
            <CardDescription>Distribution of departed staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                allDeparted.reduce((acc: Record<string, number>, emp: any) => {
                  const county = emp.county || "Unknown";
                  acc[county] = (acc[county] || 0) + 1;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([county, count]) => (
                  <div
                    key={county}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{county}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

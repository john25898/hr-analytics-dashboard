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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import { EmployeeEditModal } from "@/components/employee-edit-modal";
import { CategoryPills } from "@/components/category-pills";
import {
  getEmployeeEdit,
  extendContract,
  pullChangesFromBackend,
} from "@/lib/employee-store";
import {
  Download,
  Search,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
  CalendarPlus,
} from "lucide-react";
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

const CONTRACT_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [contractFilter, setContractFilter] = React.useState("all");
  // HRH | CHAK | CBSL — everything on the page is scoped to this category.
  const [category, setCategory] = React.useState("HRH");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  const { data: employees, isLoading: employeesLoading } = useSWR(
    `/api/employees?limit=1000&includeDeparted=true&category=${category}&_=${refreshKey}`,
    fetcher,
  );
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    `/api/analytics?category=${category}&_=${refreshKey}`,
    fetcher,
  );

  // Pull HR changes (contract extensions, edits) from the shared backend once
  // on mount so this browser sees what other browsers/devices changed.
  React.useEffect(() => {
    let cancelled = false;
    pullChangesFromBackend().then((mods) => {
      if (!cancelled && mods) setRefreshKey((k) => k + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = employeesLoading || analyticsLoading;

  // Apply local/DB edits (contract extensions, departures) on top of the
  // server roster so the table, stats and timeline always reflect changes.
  const effectiveEmployees = React.useMemo(() => {
    if (!employees?.data) return [];
    return employees.data.map((emp: any) => {
      const edit = getEmployeeEdit(emp.name || "");
      if (!edit) return emp;
      return {
        ...emp,
        contractEnd: edit.endOfContract || emp.contractEnd,
        isDeparted: edit.isDeparted || undefined,
        exitReason: edit.exitReason || undefined,
      };
    });
  }, [employees?.data, refreshKey]);

  // Contract status analysis
  const contractStats = React.useMemo(() => {
    if (!employees?.data)
      return { expired: 0, expiring: 0, valid: 0, noData: 0, total: 0 };

    const now = new Date();
    const expiringWindowDays = 20;
    const expiringCutoff = new Date(
      now.getTime() + expiringWindowDays * 24 * 60 * 60 * 1000,
    );

    let expired = 0,
      expiring = 0,
      valid = 0,
      noData = 0;

    effectiveEmployees.forEach((emp: any) => {
      if (!emp.contractEnd) {
        noData++;
        return;
      }
      const expireDate = new Date(emp.contractEnd);
      if (expireDate < now) expired++;
      else if (expireDate <= expiringCutoff) expiring++;
      else valid++;
    });

    return {
      expired,
      expiring,
      valid,
      noData,
      total: effectiveEmployees.length,
    };
  }, [effectiveEmployees]);

  // Contract end distribution by month
  const contractTimeline = React.useMemo(() => {
    if (!employees?.data) return [];

    const monthMap: Record<string, number> = {};

    effectiveEmployees.forEach((emp: any) => {
      if (!emp.contractEnd) return;
      const d = new Date(emp.contractEnd);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return Object.entries(monthMap)
      .filter(([month]) => month >= currentKey)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12)
      .map(([month, count]) => ({ month, count }));
  }, [effectiveEmployees]);

  // Contract distribution by county
  const contractByCounty = React.useMemo(() => {
    if (!employees?.data) return [];

    const countyMap: Record<
      string,
      { valid: number; expiring: number; expired: number }
    > = {};

    const now = new Date();
    const expiringCutoff = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

    effectiveEmployees.forEach((emp: any) => {
      const county = emp.county || "Unknown";
      if (!countyMap[county])
        countyMap[county] = { valid: 0, expiring: 0, expired: 0 };

      if (!emp.contractEnd) return;
      const expireDate = new Date(emp.contractEnd);
      if (expireDate < now) countyMap[county].expired++;
      else if (expireDate <= expiringCutoff) countyMap[county].expiring++;
      else countyMap[county].valid++;
    });

    return Object.entries(countyMap)
      .map(([county, data]) => ({
        county,
        ...data,
        total: data.valid + data.expiring + data.expired,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [effectiveEmployees]);

  // Filtered employees for the table
  const filteredEmployees = React.useMemo(() => {
    if (!employees?.data) return [];

    const now = new Date();
    const expiringCutoff = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

    return effectiveEmployees.filter((emp: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (emp.name && emp.name.toLowerCase().includes(searchLower)) ||
        (emp.designation &&
          emp.designation.toLowerCase().includes(searchLower)) ||
        (emp.county && emp.county.toLowerCase().includes(searchLower)) ||
        (emp.station && emp.station.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      if (contractFilter === "all") return true;
      if (contractFilter === "expired")
        return emp.contractEnd && new Date(emp.contractEnd) < now;
      if (contractFilter === "expiring") {
        if (!emp.contractEnd) return false;
        const d = new Date(emp.contractEnd);
        return d >= now && d <= expiringCutoff;
      }
      if (contractFilter === "valid")
        return emp.contractEnd && new Date(emp.contractEnd) >= now;
      if (contractFilter === "no-date") return !emp.contractEnd;

      return true;
    });
  }, [effectiveEmployees, searchTerm, contractFilter]);

  const pieData = [
    { name: "Valid", value: contractStats.valid },
    { name: "Expiring Soon", value: contractStats.expiring },
    { name: "Expired", value: contractStats.expired },
    { name: "No Data", value: contractStats.noData },
  ].filter((d) => d.value > 0);

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
          Contracts Management
        </h2>
        <p className="text-muted-foreground mt-1">
          Track contract statuses, expirations, and renewals across the
          organization
        </p>
      </div>

      {/* Category scope — HRH / CHAK / CBSL, same as the dashboard */}
      <CategoryPills value={category} onChange={setCategory} />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valid Contracts
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contractStats.valid + contractStats.expiring}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              active contracts
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
              {contractStats.expiring}
            </div>
            <p className="text-xs text-muted-foreground mt-1">within 20 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {contractStats.expired}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              requires renewal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <UserCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              contracts on file
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contract Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Status Overview</CardTitle>
            <CardDescription>
              Current contract validity distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
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
                  {pieData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={CONTRACT_COLORS[idx % CONTRACT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contract Expiry Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Expiry Timeline</CardTitle>
            <CardDescription>
              Upcoming contract renewals by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={contractTimeline}>
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
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Contract Distribution by County */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts by County</CardTitle>
          <CardDescription>
            Contract status distribution across operational regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>County</TableHead>
                  <TableHead className="text-center">Valid</TableHead>
                  <TableHead className="text-center">Expiring</TableHead>
                  <TableHead className="text-center">Expired</TableHead>
                  <TableHead>Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractByCounty.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.county}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        {item.valid}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.expiring > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700"
                        >
                          {item.expiring}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.expired > 0 ? (
                        <Badge variant="destructive">{item.expired}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-green-600"
                            style={{
                              width: `${item.total > 0 ? Math.round((item.valid / item.total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {item.total > 0
                            ? Math.round((item.valid / item.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Contract Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Contract Lookup</CardTitle>
          <CardDescription>
            Search employees by name, designation, county, or facility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={contractFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setContractFilter("all")}
            >
              All ({filteredEmployees.length})
            </Button>
            <Button
              variant={contractFilter === "valid" ? "default" : "outline"}
              size="sm"
              onClick={() => setContractFilter("valid")}
            >
              Valid
            </Button>
            <Button
              variant={contractFilter === "expiring" ? "default" : "outline"}
              size="sm"
              onClick={() => setContractFilter("expiring")}
            >
              Expiring Soon
            </Button>
            <Button
              variant={contractFilter === "expired" ? "default" : "outline"}
              size="sm"
              onClick={() => setContractFilter("expired")}
            >
              Expired
            </Button>
            <Button
              variant={contractFilter === "no-date" ? "default" : "outline"}
              size="sm"
              onClick={() => setContractFilter("no-date")}
            >
              No Date
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Contract End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.slice(0, 50).map((emp: any, idx: number) => {
                  const expireDate = emp.contractEnd
                    ? new Date(emp.contractEnd)
                    : null;
                  const now = new Date();
                  const expiringCutoff = new Date(
                    now.getTime() + 20 * 24 * 60 * 60 * 1000,
                  );

                  let status = "Valid";
                  let statusColor =
                    "bg-green-100 text-green-800 border-green-300";

                  if (!expireDate) {
                    status = "No Data";
                    statusColor = "bg-gray-100 text-gray-600 border-gray-300";
                  } else if (expireDate < now) {
                    status = "Expired";
                    statusColor = "bg-red-100 text-red-800 border-red-300";
                  } else if (expireDate <= expiringCutoff) {
                    status = "Expiring Soon";
                    statusColor =
                      "bg-orange-100 text-orange-800 border-orange-300";
                  }

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
                      <TableCell>{emp.designation || "-"}</TableCell>
                      <TableCell>{emp.county || "-"}</TableCell>
                      <TableCell>{emp.station || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {expireDate ? expireDate.toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.contractEnd && !emp.isDeparted && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              title="Extend contract by 6 months"
                              onClick={(e) => {
                                e.stopPropagation();
                                extendContract(emp.name, 6, emp.contractEnd);
                                setRefreshKey((k) => k + 1);
                              }}
                            >
                              <CalendarPlus className="h-3 w-3" />
                              +6m
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 text-green-700 hover:text-green-800"
                              title="Extend contract by 1 year"
                              onClick={(e) => {
                                e.stopPropagation();
                                extendContract(emp.name, 12, emp.contractEnd);
                                setRefreshKey((k) => k + 1);
                              }}
                            >
                              <CalendarPlus className="h-3 w-3" />
                              +1y
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredEmployees.length > 50 && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Showing 50 of {filteredEmployees.length} results
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee details drawer — opens when you click any row */}
      <EmployeeEditModal
        employee={selectedEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onEmployeeUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

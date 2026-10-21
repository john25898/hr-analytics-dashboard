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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegulationBodyChart } from "@/components/better-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  addRegulatoryBody,
  getRegulatoryBodies,
  removeRegulatoryBody,
  type RegulatoryBodyRecord,
} from "@/lib/employee-store";
import { mergeRegulatoryBodies } from "@/lib/hr-options";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RegulatoryBodiesPage() {
  const { data: employees, isLoading: employeesLoading } = useSWR(
    "/api/employees?limit=1000",
    fetcher,
  );
  const { data: analytics, isLoading: analyticsLoading } = useSWR(
    "/api/analytics",
    fetcher,
  );

  const [newBodyName, setNewBodyName] = React.useState("");
  const [customBodies, setCustomBodies] = React.useState<
    RegulatoryBodyRecord[]
  >([]);
  const [formMessage, setFormMessage] = React.useState("");

  const refreshCustomBodies = React.useCallback(() => {
    setCustomBodies(getRegulatoryBodies());
  }, []);

  React.useEffect(() => {
    refreshCustomBodies();
  }, [refreshCustomBodies]);

  const handleAddBody = () => {
    const name = newBodyName.trim();
    if (!name) return;
    const created = addRegulatoryBody(name);
    if (!created) {
      setFormMessage(`"${name}" already exists`);
      return;
    }
    setNewBodyName("");
    setFormMessage(`Added "${created.name}"`);
    refreshCustomBodies();
  };

  const handleRemoveBody = (body: RegulatoryBodyRecord) => {
    removeRegulatoryBody(body.id);
    setFormMessage(`Removed "${body.name}"`);
    refreshCustomBodies();
  };

  const isLoading = employeesLoading || analyticsLoading;

  const regulatoryBodiesData = React.useMemo(() => {
    const bodiesMap: Record<string, any> = {};

    const ensure = (name: string) => {
      if (!bodiesMap[name]) {
        bodiesMap[name] = {
          name,
          count: 0,
          valid: 0,
          expiring: 0,
          expired: 0,
          employees: [],
        };
      }
      return bodiesMap[name];
    };

    // Seed with every known body (built-in + custom) so newly added ones
    // appear immediately even before anyone is assigned to them.
    mergeRegulatoryBodies(customBodies.map((b) => b.name)).forEach(ensure);

    (employees?.data || []).forEach((emp: any) => {
      const entry = ensure(emp.regulatoryBody || "Unregistered");
      entry.count++;
      entry.employees.push(emp);

      // Check license status
      if (emp.validUntil) {
        const today = new Date();
        const expireDate = new Date(emp.validUntil);
        const thirtyDaysFromNow = new Date(
          today.getTime() + 30 * 24 * 60 * 60 * 1000,
        );

        if (expireDate < today) {
          entry.expired++;
        } else if (expireDate <= thirtyDaysFromNow) {
          entry.expiring++;
        } else {
          entry.valid++;
        }
      }
    });

    return Object.values(bodiesMap).sort((a: any, b: any) => b.count - a.count);
  }, [employees?.data, customBodies]);

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
      {/* Navigation */}
      <BackButton />

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Regulatory Bodies</h2>
        <p className="text-muted-foreground mt-1">
          Professional council registrations and compliance tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bodies</CardTitle>
            <Building2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regulatoryBodiesData.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Regulatory councils
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Registered
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees?.data?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valid Licenses
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regulatoryBodiesData.reduce(
                (sum: number, b: any) => sum + b.valid,
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current registrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regulatoryBodiesData.reduce(
                (sum: number, b: any) => sum + b.expired + b.expiring,
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expired or expiring
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {analytics?.regulatoryBodies && analytics.regulatoryBodies.length > 0 && (
        <RegulationBodyChart data={analytics.regulatoryBodies} />
      )}

      {/* Add a regulatory body */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add Regulatory Body
          </CardTitle>
          <CardDescription>
            New bodies become selectable when adding or editing a staff member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newBodyName}
              onChange={(e) => {
                setNewBodyName(e.target.value);
                setFormMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddBody();
              }}
              placeholder="e.g. Nursing Council of Kenya"
              className="sm:max-w-md"
            />
            <Button onClick={handleAddBody} disabled={!newBodyName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Body
            </Button>
          </div>

          {formMessage && (
            <p className="text-xs text-muted-foreground">{formMessage}</p>
          )}

          {customBodies.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Added by you ({customBodies.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {customBodies.map((body) => (
                  <Badge
                    key={body.id}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1 pl-2.5 pr-1.5"
                  >
                    <span className="text-sm">{body.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBody(body)}
                      title={`Remove ${body.name}`}
                      className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No custom bodies yet — the built-in list is shown below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Bodies Details</CardTitle>
          <CardDescription>
            Staff distribution by professional council
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Body Name</TableHead>
                  <TableHead className="text-center">Total Staff</TableHead>
                  <TableHead className="text-center">Valid</TableHead>
                  <TableHead className="text-center">Expiring Soon</TableHead>
                  <TableHead className="text-center">Expired</TableHead>
                  <TableHead>Compliance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regulatoryBodiesData.map((body: any, idx: number) => {
                  const compliance =
                    body.count > 0
                      ? Math.round((body.valid / body.count) * 100)
                      : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{body.name}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {body.count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {body.valid}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {body.expiring > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            {body.expiring}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {body.expired > 0 ? (
                          <Badge variant="destructive">{body.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{ width: `${compliance}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {compliance}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

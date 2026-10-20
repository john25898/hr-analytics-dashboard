"use client";

import React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeftRight, X, Calendar, Search } from "lucide-react";
import { addTransfer, type TransferRecord } from "@/lib/employee-store";
import {
  rosterCounties,
  rosterFacilities,
  rosterAllFacilities,
} from "@/lib/facility-roster";
import { PROJECTS } from "@/lib/hr-options";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function toInputDate(date: any) {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

interface TransferModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  preselectedEmployee?: {
    name: string;
    county?: string;
    station?: string;
    designation?: string;
    project?: string;
  };
}

export function TransferModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedEmployee,
}: TransferModalProps) {
  const { data: analytics } = useSWR("/api/analytics", fetcher);
  const { data: employeesData } = useSWR("/api/employees?limit=1000", fetcher);

  const counties = React.useMemo(() => rosterCounties(), []);

  const employeeNames = React.useMemo(() => {
    if (!employeesData?.data) return [];
    return employeesData.data
      .map((e: any) => e.name)
      .filter(Boolean)
      .sort();
  }, [employeesData]);

  const [employeeName, setEmployeeName] = React.useState("");
  const [fromCounty, setFromCounty] = React.useState("");
  const [fromFacility, setFromFacility] = React.useState("");
  const [toCounty, setToCounty] = React.useState("");
  const [toFacility, setToFacility] = React.useState("");
  const [transferDate, setTransferDate] = React.useState(
    toInputDate(new Date().toISOString()),
  );
  const [reason, setReason] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  // Project (programme) transfer — a worker can move from one project to
  // another without changing office / facility.
  const [fromProject, setFromProject] = React.useState("");
  const [toProject, setToProject] = React.useState("");

  // From-facility options keep the employee's current station selectable, so we
  // union the stations currently in use with the full JTP roster.
  const fromFacilities = React.useMemo(() => {
    const base = analytics?.facilityDistribution?.map((f: any) => f.name) || [];
    return Array.from(new Set([...base, ...rosterAllFacilities()])).sort();
  }, [analytics]);

  // Destination facilities come straight from the JTP roster for the chosen
  // "To County" so the dropdown is properly tied to the selected county.
  const toFacilities = React.useMemo(
    () => rosterFacilities(toCounty),
    [toCounty],
  );

  // Pre-fill when preselectedEmployee changes
  React.useEffect(() => {
    if (preselectedEmployee) {
      setEmployeeName(preselectedEmployee.name);
      setFromCounty(preselectedEmployee.county || "");
      setFromFacility(preselectedEmployee.station || "");
      setDesignation(preselectedEmployee.designation || "");
      setFromProject(preselectedEmployee.project || "");
    }
  }, [preselectedEmployee]);

  const reset = () => {
    setEmployeeName("");
    setFromCounty("");
    setFromFacility("");
    setToCounty("");
    setToFacility("");
    setTransferDate(toInputDate(new Date().toISOString()));
    setReason("");
    setDesignation("");
    setFromProject("");
    setToProject("");
  };

  React.useEffect(() => {
    if (open) {
      // If preselectedEmployee is provided, don't reset (the effect above sets values)
      if (!preselectedEmployee) {
        reset();
      }
    }
  }, [open, preselectedEmployee]);

  // Auto-fill from fields when employee is selected
  React.useEffect(() => {
    if (!employeeName || !employeesData?.data) return;
    const emp = employeesData.data.find((e: any) => e.name === employeeName);
    if (emp) {
      setFromCounty(emp.county || "");
      setFromFacility(emp.station || "");
      setDesignation(emp.designation || "");
      setFromProject(emp.project || "");
    }
  }, [employeeName, employeesData]);

  // A transfer is valid either as a location move (county + facility) or as a
  // project move (destination project chosen).
  const isProjectTransfer = !!toProject && !toCounty && !toFacility;
  const canSubmit =
    !!employeeName &&
    (!!toProject || (!!toCounty && !!toFacility)) &&
    (!isProjectTransfer || toProject !== fromProject);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const record: TransferRecord = {
      id: `transfer-${Date.now()}`,
      employeeName,
      fromCounty,
      toCounty,
      fromFacility,
      toFacility,
      fromSubCounty: "",
      toSubCounty: "",
      fromProject,
      toProject,
      designation,
      transferDate: transferDate || new Date().toISOString(),
      reason,
    };
    addTransfer(record);
    reset();
    onSuccess();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-popover p-0 shadow-2xl ring-1 ring-foreground/10 mx-4">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-popover px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">Transfer Employee</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Employee Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Employee Name
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                list="transfer-employee-list"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Type or select an employee..."
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <datalist id="transfer-employee-list">
                {employeeNames.map((name: string) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* From County */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                From County
              </label>
              <Select
                value={fromCounty}
                onValueChange={(v) => setFromCounty(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((c: string) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To County */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                To County
              </label>
              <Select
                value={toCounty}
                onValueChange={(v) => {
                  setToCounty(v ?? "");
                  setToFacility("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((c: string) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Facility */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                From Facility
              </label>
              <Select
                value={fromFacility}
                onValueChange={(v) => setFromFacility(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {fromFacilities.map((f: string) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Facility */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                To Facility
              </label>
              <Select
                value={toFacility}
                disabled={!toCounty}
                onValueChange={(v) => setToFacility(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select county first" />
                </SelectTrigger>
                <SelectContent>
                  {toFacilities.map((f: string) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project transfer — move a worker from one project to another */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-semibold">Project Transfer</p>
              <p className="text-xs text-muted-foreground">
                Move this worker from one project to another (no county /
                facility change needed).
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  From Project
                </label>
                <Select
                  value={fromProject}
                  onValueChange={(v) => setFromProject(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select current project" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  To Project
                </label>
                <Select
                  value={toProject}
                  onValueChange={(v) => setToProject(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select new project" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECTS.filter((p) => p !== fromProject).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Transfer Date */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Transfer Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Reason for Transfer
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Staff redistribution, promotion, etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Submit Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

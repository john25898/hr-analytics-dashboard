"use client";

import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { Bell, CheckCircle2, FileText, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getModifications, updateEmployeeEdit } from "@/lib/employee-store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DAY = 24 * 60 * 60 * 1000;

function formatDate(d: string | undefined) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

/**
 * Global notification bell. Shows actionable alerts for:
 *  - Contracts that have EXPIRED (staff still active — HR must confirm &
 *    move them to departed; they are never auto-departed)
 *  - Licences that have expired
 *  - Contracts expiring within 20 days (heads-up)
 */
export function NotificationsBell({ compact = false }: { compact?: boolean }) {
  const { data: employees } = useSWR(
    "/api/employees?limit=1000&includeDeparted=true",
    fetcher,
  );
  const [open, setOpen] = React.useState(false);
  const [storeMods, setStoreMods] = React.useState<any>(null);

  React.useEffect(() => {
    setStoreMods(getModifications());
  }, []);

  // Keep in sync with edits made elsewhere (departed page, employee modal)
  React.useEffect(() => {
    const sync = () => setStoreMods(getModifications());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("hr-modifications-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("hr-modifications-change", sync);
    };
  }, []);

  const now = new Date();
  const cutoff20 = new Date(now.getTime() + 20 * DAY);

  const emps = React.useMemo(() => employees?.data || [], [employees]);

  const isConfirmedDeparted = React.useCallback(
    (name: string) => {
      const edit = storeMods?.employeeEdits?.[name];
      return !!(edit?.isDeparted && edit?.exitReason);
    },
    [storeMods],
  );

  // Contracts already past their end date, staff still active → ACTION NEEDED
  const expiredContracts = React.useMemo(
    () =>
      emps.filter(
        (e: any) =>
          !e.isDeparted &&
          !isConfirmedDeparted(e.name) &&
          e.contractEnd &&
          new Date(e.contractEnd) < now,
      ),
    [emps, isConfirmedDeparted, now],
  );

  // Licences past validity, staff still active → ACTION NEEDED
  const expiredLicenses = React.useMemo(
    () =>
      emps.filter(
        (e: any) =>
          !e.isDeparted &&
          !isConfirmedDeparted(e.name) &&
          e.validUntil &&
          new Date(e.validUntil) < now,
      ),
    [emps, isConfirmedDeparted, now],
  );

  // Contracts expiring within 20 days (heads-up only)
  const expiringContracts = React.useMemo(
    () =>
      emps.filter(
        (e: any) =>
          !e.isDeparted &&
          !isConfirmedDeparted(e.name) &&
          e.contractEnd &&
          new Date(e.contractEnd) >= now &&
          new Date(e.contractEnd) <= cutoff20,
      ),
    [emps, isConfirmedDeparted, now, cutoff20],
  );

  const actionCount = expiredContracts.length + expiredLicenses.length;

  const handleConfirmDeparted = (emp: any) => {
    updateEmployeeEdit(emp.name, {
      isDeparted: true,
      exitReason: "end_of_contract",
      exitDate: now.toISOString().slice(0, 10),
      endOfContract: emp.contractEnd || undefined,
    });
    setStoreMods(getModifications());
  };

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={compact ? "icon" : "icon"}
        onClick={toggle}
        className="relative h-9 w-9"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {actionCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {actionCount > 99 ? "99+" : actionCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg ring-1 ring-foreground/10">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              <Badge variant={actionCount > 0 ? "destructive" : "secondary"}>
                {actionCount > 0 ? `${actionCount} action needed` : "All clear"}
              </Badge>
            </div>

            {/* ── Expired contracts → action needed ───────────────────── */}
            {expiredContracts.length > 0 && (
              <div className="mt-1">
                <p className="px-3 py-1 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {expiredContracts.length} contract
                  {expiredContracts.length > 1 ? "s" : ""} expired — action
                  needed
                </p>
                <div className="space-y-1 px-1">
                  {expiredContracts.slice(0, 8).map((emp: any) => (
                    <div
                      key={emp.name}
                      className="rounded-lg border border-red-200 bg-red-50 p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {emp.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.designation || "-"} · {emp.county || "-"} ·
                            ended {formatDate(emp.contractEnd)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="mt-1.5 w-full gap-1"
                        onClick={() => handleConfirmDeparted(emp)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm & move to Departed
                      </Button>
                    </div>
                  ))}
                  {expiredContracts.length > 8 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      +{expiredContracts.length - 8} more…
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Expired licences → action needed ────────────────────── */}
            {expiredLicenses.length > 0 && (
              <div className="mt-1">
                <p className="px-3 py-1 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {expiredLicenses.length} licence
                  {expiredLicenses.length > 1 ? "s" : ""} expired — renew or
                  review
                </p>
                <div className="space-y-1 px-1">
                  {expiredLicenses.slice(0, 6).map((emp: any) => (
                    <div
                      key={emp.name}
                      className="rounded-lg border border-red-200 bg-red-50 p-2"
                    >
                      <p className="truncate text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.designation || "-"} · licence expired{" "}
                        {formatDate(emp.validUntil)}
                      </p>
                    </div>
                  ))}
                  {expiredLicenses.length > 6 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      +{expiredLicenses.length - 6} more…
                    </p>
                  )}
                  <div className="px-2 pt-1">
                    <Link
                      href="/compliance"
                      className="text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      View compliance page →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── Expiring contracts → heads up ───────────────────────── */}
            {expiringContracts.length > 0 && (
              <div className="mt-1">
                <p className="px-3 py-1 text-xs font-semibold text-orange-600 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {expiringContracts.length} contract
                  {expiringContracts.length > 1 ? "s" : ""} expiring within 20
                  days
                </p>
                <div className="px-3 pb-2">
                  <p className="text-xs text-muted-foreground">
                    Latest: {formatDate(expiringContracts[0]?.contractEnd)} ·
                    mostly {expiringContracts[0]?.county || "—"}
                  </p>
                  <Link
                    href="/contracts"
                    className="text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    View contracts page →
                  </Link>
                </div>
              </div>
            )}

            {actionCount === 0 && expiringContracts.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No pending notifications
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

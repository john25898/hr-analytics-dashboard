"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  User,
  FileText,
  AlertTriangle,
  Skull,
  LogOut,
  Heart,
  Handshake,
  ArrowLeftRight,
  History,
  CalendarPlus,
} from "lucide-react";
import { Employee } from "@/lib/excel-data";
import {
  getEmployeeEdit,
  updateEmployeeEdit,
  updateContractEnd,
  updateProvisions,
  updateLicense,
  type EmployeeEdit,
  type StatutoryProvisions,
} from "@/lib/employee-store";
import { TransferModal } from "@/components/transfer-modal";

interface EmployeeEditModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated?: () => void;
}

function formatDate(date: any) {
  if (!date) return "";
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

function toInputDate(date: any) {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

const exitReasons = [
  {
    value: "resignation",
    label: "Resignation",
    icon: LogOut,
    color: "text-amber-600",
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  },
  {
    value: "retirement",
    label: "Retirement",
    icon: Handshake,
    color: "text-blue-600",
    bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  {
    value: "death",
    label: "Death",
    icon: Skull,
    color: "text-red-600",
    bg: "bg-red-50 hover:bg-red-100 border-red-200",
  },
  {
    value: "termination",
    label: "Termination",
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50 hover:bg-orange-100 border-orange-200",
  },
] as const;

export function EmployeeEditModal({
  employee,
  open,
  onOpenChange,
  onEmployeeUpdated,
}: EmployeeEditModalProps) {
  const [endOfContract, setEndOfContract] = React.useState("");
  const [selectedReason, setSelectedReason] = React.useState<string>("");
  const [confirmExit, setConfirmExit] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [provisionsSaved, setProvisionsSaved] = React.useState(false);
  const [licenseSaved, setLicenseSaved] = React.useState(false);
  const [provisions, setProvisions] = React.useState<StatutoryProvisions>({});
  const [licenseNo, setLicenseNo] = React.useState("");
  const [licenseValidUntil, setLicenseValidUntil] = React.useState("");
  const [transferModalOpen, setTransferModalOpen] = React.useState(false);
  // Exit documentation dates — captured before the employee is exited.
  const [noticeDate, setNoticeDate] = React.useState("");
  const [exitDateInput, setExitDateInput] = React.useState("");
  const [fullySignedDate, setFullySignedDate] = React.useState("");
  const [duesPaidDate, setDuesPaidDate] = React.useState("");
  const [certificateDate, setCertificateDate] = React.useState("");
  const [exitDatesSaved, setExitDatesSaved] = React.useState(false);

  // Load existing edits when employee changes
  React.useEffect(() => {
    if (employee) {
      const edit = getEmployeeEdit(employee.name || "");
      setEndOfContract(
        edit?.endOfContract
          ? toInputDate(edit.endOfContract)
          : toInputDate(employee.contractEnd),
      );
      setProvisions(edit?.provisions || {});
      setLicenseNo(edit?.license?.licenceNo ?? employee.practiseeLicence ?? "");
      setLicenseValidUntil(
        edit?.license?.validUntil
          ? toInputDate(edit.license.validUntil)
          : toInputDate(employee.validUntil),
      );
      setSelectedReason("");
      setConfirmExit(false);
      setSaved(false);
      setProvisionsSaved(false);
      setLicenseSaved(false);
      setNoticeDate(toInputDate(edit?.noticeDate));
      setExitDateInput(toInputDate(edit?.exitDate));
      setFullySignedDate(toInputDate(edit?.fullySignedDate));
      setDuesPaidDate(toInputDate(edit?.duesPaidDate));
      setCertificateDate(toInputDate(edit?.certificateDate));
      setExitDatesSaved(false);
    }
  }, [employee]);

  if (!open || !employee) return null;

  const handleSaveContract = () => {
    if (employee.name && endOfContract) {
      // Save the new end date; if it's later than the current one it is
      // recorded automatically as a contract extension (with history).
      const prevEffective =
        existingEdit?.endOfContract || employee.contractEnd || undefined;
      updateContractEnd(employee.name, endOfContract, prevEffective);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onEmployeeUpdated?.();
    }
  };

  const handleQuickExtend = (months: number) => {
    if (!employee.name) return;
    const base =
      existingEdit?.endOfContract ||
      employee.contractEnd ||
      new Date().toISOString();
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setEndOfContract(`${y}-${m}-${day}`);
  };

  const handleSaveProvisions = () => {
    if (!employee.name) return;
    updateProvisions(employee.name, provisions);
    setProvisionsSaved(true);
    setTimeout(() => setProvisionsSaved(false), 2000);
    onEmployeeUpdated?.();
  };

  const handleSaveLicense = () => {
    if (!employee.name) return;
    updateLicense(employee.name, {
      licenceNo: licenseNo.trim() || undefined,
      validUntil: licenseValidUntil || undefined,
    });
    setLicenseSaved(true);
    setTimeout(() => setLicenseSaved(false), 2000);
    onEmployeeUpdated?.();
  };

  const handleExitEmployee = () => {
    if (!employee.name || !selectedReason) return;
    updateEmployeeEdit(employee.name, {
      exitReason: selectedReason as EmployeeEdit["exitReason"],
      // The exit date entered above drives the departure — it is only
      // defaulted to today when HR left the field blank.
      exitDate: exitDateInput
        ? new Date(exitDateInput).toISOString()
        : new Date().toISOString(),
      noticeDate: noticeDate ? new Date(noticeDate).toISOString() : undefined,
      fullySignedDate: fullySignedDate
        ? new Date(fullySignedDate).toISOString()
        : undefined,
      duesPaidDate: duesPaidDate
        ? new Date(duesPaidDate).toISOString()
        : undefined,
      certificateDate: certificateDate
        ? new Date(certificateDate).toISOString()
        : undefined,
      isDeparted: true,
    });
    setConfirmExit(false);
    onOpenChange(false);
    onEmployeeUpdated?.();
  };

  /** Persist the exit document dates without exiting the employee yet. */
  const handleSaveExitDates = () => {
    if (!employee.name) return;
    updateEmployeeEdit(employee.name, {
      noticeDate: noticeDate ? new Date(noticeDate).toISOString() : undefined,
      exitDate: exitDateInput
        ? new Date(exitDateInput).toISOString()
        : undefined,
      fullySignedDate: fullySignedDate
        ? new Date(fullySignedDate).toISOString()
        : undefined,
      duesPaidDate: duesPaidDate
        ? new Date(duesPaidDate).toISOString()
        : undefined,
      certificateDate: certificateDate
        ? new Date(certificateDate).toISOString()
        : undefined,
    });
    setExitDatesSaved(true);
    setTimeout(() => setExitDatesSaved(false), 2000);
    onEmployeeUpdated?.();
  };

  const existingEdit = getEmployeeEdit(employee.name || "");
  const isAlreadyDeparted = existingEdit?.isDeparted;

  const getLicenseStatusColor = (validUntil?: any) => {
    if (!validUntil) return "bg-gray-100 text-gray-800";
    const expireDate = new Date(validUntil);
    const today = new Date();
    const days = Math.floor(
      (expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return "bg-red-100 text-red-800";
    if (days < 30) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Days until the CONTRACT ends (contract date, not license date)
  const daysUntilContractEnd = (() => {
    const date = endOfContract || employee.contractEnd;
    if (!date) return null;
    const d = new Date(date);
    return Math.floor(
      (d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
  })();

  // Days until the LICENSE expires (license date only) — uses the edited
  // value when one has been saved, otherwise the source data.
  const licenseDaysLeft = (() => {
    const date = licenseValidUntil || employee.validUntil;
    if (!date) return null;
    const d = new Date(date);
    return Math.floor(
      (d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-popover p-0 shadow-2xl ring-1 ring-foreground/10 mx-4">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-popover px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">
                {employee.name || "Unknown"}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {employee.designation || "No designation"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Departure Banner */}
          {isAlreadyDeparted && existingEdit?.exitReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-red-800">
                  Employee has exited — {existingEdit.exitReason}
                  {existingEdit.exitDate &&
                    ` on ${formatDate(existingEdit.exitDate)}`}
                </p>
              </div>
            </div>
          )}

          {/* Personal Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-sm">{employee.phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">ID Number</p>
                <p className="font-medium text-sm">{employee.idNo || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">
                  County / Sub-County
                </p>
                <p className="font-medium text-sm">
                  {employee.county || "-"}{" "}
                  {employee.subCounty ? `/ ${employee.subCounty}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Station</p>
                <p className="font-medium text-sm">{employee.station || "-"}</p>
              </div>
            </div>
          </div>

          {/* Education & Age */}
          <div className="grid gap-4 md:grid-cols-2">
            {employee.educationLevel && (
              <div>
                <p className="text-xs text-muted-foreground">Education Level</p>
                <p className="font-medium text-sm">{employee.educationLevel}</p>
              </div>
            )}
            {employee.age && (
              <div>
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="font-medium text-sm">{employee.age} years</p>
              </div>
            )}
          </div>

          {/* License & Compliance Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              License & Contract
            </h4>

            {employee.regulatoryBody && (
              <div>
                <p className="text-xs text-muted-foreground">Regulatory Body</p>
                <p className="font-medium text-sm">{employee.regulatoryBody}</p>
              </div>
            )}

            {/* License Number & Valid Until — editable so expired licenses
                can be renewed right from the employee details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  License Number
                </p>
                <Input
                  value={licenseNo}
                  placeholder="e.g. PT2025D02110"
                  onChange={(e) => setLicenseNo(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  License Valid Until
                </p>
                <Input
                  type="date"
                  value={licenseValidUntil}
                  onChange={(e) => setLicenseValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleSaveLicense}>
                {licenseSaved ? "✓ License Saved!" : "Save License"}
              </Button>
              {licenseDaysLeft !== null && licenseValidUntil && (
                <Badge className={getLicenseStatusColor(licenseValidUntil)}>
                  {licenseDaysLeft < 0
                    ? `Expired ${Math.abs(licenseDaysLeft)}d ago`
                    : licenseDaysLeft < 30
                      ? `Expires in ${licenseDaysLeft}d`
                      : `${licenseDaysLeft}d remaining`}
                </Badge>
              )}
            </div>

            {/* End of Contract — separate from license */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                End of Contract
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={endOfContract}
                    onChange={(e) => setEndOfContract(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {daysUntilContractEnd !== null && (
                  <Badge
                    className={getLicenseStatusColor(
                      endOfContract || employee.contractEnd,
                    )}
                  >
                    {daysUntilContractEnd < 0
                      ? `Expired ${Math.abs(daysUntilContractEnd)}d ago`
                      : daysUntilContractEnd < 30
                        ? `Expires in ${daysUntilContractEnd}d`
                        : `${daysUntilContractEnd}d remaining`}
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Quick extend:
                </span>
                {[6, 12, 24].map((months) => (
                  <Button
                    key={months}
                    size="sm"
                    variant="outline"
                    className="gap-1 text-green-700 hover:text-green-800"
                    onClick={() => handleQuickExtend(months)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />+
                    {months >= 12 ? `${months / 12}y` : `${months}m`}
                  </Button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveContract}
                  disabled={!endOfContract}
                >
                  {saved ? "✓ Saved!" : "Save Contract Date"}
                </Button>
                {existingEdit?.endOfContract &&
                  existingEdit.endOfContract !==
                    toInputDate(employee.contractEnd) && (
                    <p className="text-xs text-muted-foreground">
                      Previously edited:{" "}
                      {formatDate(existingEdit.endOfContract)}
                    </p>
                  )}
              </div>

              {/* Contract extension history */}
              {existingEdit?.contractExtensions &&
                existingEdit.contractExtensions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 p-3">
                    <p className="text-xs font-medium text-green-800 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Extension history (
                      {existingEdit.contractExtensions.length})
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {existingEdit.contractExtensions
                        .slice()
                        .reverse()
                        .map((ext, i) => (
                          <li key={i} className="text-xs text-green-900">
                            <span className="font-medium">
                              {formatDate(ext.from)}
                            </span>{" "}
                            →{" "}
                            <span className="font-medium">
                              {formatDate(ext.to)}
                            </span>
                            <span className="text-green-700/80">
                              {" "}
                              · {formatDate(ext.date)}
                              {ext.extendedBy ? ` · by ${ext.extendedBy}` : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Statutory Provisions — SHA / NHIF / NSSF / KRA */}
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Statutory Provisions
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ["sha", "SHA Number", "e.g. 111-22222-33333-4"],
                    ["nhif", "NHIF Number", "e.g. 1234567890"],
                    ["nssf", "NSSF Number", "e.g. 1234567890"],
                    ["kra", "KRA PIN", "e.g. A123456789B"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {label}
                    </p>
                    <Input
                      value={provisions[key] || ""}
                      placeholder={placeholder}
                      onChange={(e) =>
                        setProvisions((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={handleSaveProvisions}>
                  {provisionsSaved ? "✓ Saved!" : "Save Provision Numbers"}
                </Button>
              </div>
            </div>
          </div>

          {/* Transfer Button */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-700">
                  <ArrowLeftRight className="h-4 w-4" />
                  Transfer Employee
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Move this employee to a different county or facility
                </p>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                onClick={() => {
                  setTransferModalOpen(true);
                }}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfer
              </Button>
            </div>
          </div>

          {/* Exit Employee Section */}
          {isAlreadyDeparted ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Exit Record
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="font-medium text-sm capitalize">
                    {existingEdit?.exitReason || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notice Date</p>
                  <p className="font-medium text-sm">
                    {formatDate(existingEdit?.noticeDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exit Date</p>
                  <p className="font-medium text-sm">
                    {formatDate(existingEdit?.exitDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Date Fully Signed
                  </p>
                  <p className="font-medium text-sm">
                    {formatDate(existingEdit?.fullySignedDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Date Dues Paid
                  </p>
                  <p className="font-medium text-sm">
                    {formatDate(existingEdit?.duesPaidDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Date of Certificate
                  </p>
                  <p className="font-medium text-sm">
                    {formatDate(existingEdit?.certificateDate)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Exit Employee from Organization
              </h4>

              {/* Exit documentation dates — filled in BEFORE the exit */}
              <div className="rounded-lg border border-red-300 bg-white p-3 space-y-3">
                <p className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Exit documentation dates
                </p>
                <p className="text-xs text-muted-foreground">
                  Record these on the file before confirming the exit. The exit
                  date entered here is used as the departure date.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: "notice",
                      label: "Notice Date",
                      value: noticeDate,
                      set: setNoticeDate,
                    },
                    {
                      key: "exit",
                      label: "Exit Date",
                      value: exitDateInput,
                      set: setExitDateInput,
                    },
                    {
                      key: "signed",
                      label: "Date Fully Signed",
                      value: fullySignedDate,
                      set: setFullySignedDate,
                    },
                    {
                      key: "dues",
                      label: "Date Dues Paid",
                      value: duesPaidDate,
                      set: setDuesPaidDate,
                    },
                    {
                      key: "cert",
                      label: "Date of Certificate",
                      value: certificateDate,
                      set: setCertificateDate,
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {field.label}
                      </p>
                      <Input
                        type="date"
                        value={field.value}
                        onChange={(e) => field.set(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveExitDates}
                    disabled={
                      !noticeDate &&
                      !exitDateInput &&
                      !fullySignedDate &&
                      !duesPaidDate &&
                      !certificateDate
                    }
                  >
                    {exitDatesSaved ? "✓ Saved!" : "Save Dates"}
                  </Button>
                </div>
              </div>

              {!confirmExit ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Select the reason for this employee&apos;s departure:
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {exitReasons.map((reason) => {
                      const Icon = reason.icon;
                      return (
                        <button
                          key={reason.value}
                          onClick={() => {
                            setSelectedReason(reason.value);
                            setConfirmExit(true);
                          }}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-all ${reason.bg}`}
                        >
                          <Icon className={`h-5 w-5 ${reason.color}`} />
                          <span>{reason.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-300 bg-white p-3">
                    <p className="text-sm font-medium text-red-800">
                      Confirm exit: <strong>{employee.name}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason:{" "}
                      {
                        exitReasons.find((r) => r.value === selectedReason)
                          ?.label
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exitDateInput
                        ? `This will mark the employee as departed on ${formatDate(exitDateInput)}.`
                        : "Enter the exit date above before confirming — it defaults to today if left blank."}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>Notice: {formatDate(noticeDate) || "-"}</span>
                      <span>
                        Fully signed: {formatDate(fullySignedDate) || "-"}
                      </span>
                      <span>Dues paid: {formatDate(duesPaidDate) || "-"}</span>
                      <span>
                        Certificate: {formatDate(certificateDate) || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleExitEmployee}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Confirm Exit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedReason("");
                        setConfirmExit(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        onSuccess={() => {}}
        preselectedEmployee={
          employee
            ? {
                name: employee.name,
                county: employee.county,
                station: employee.station,
                designation: employee.designation,
              }
            : undefined
        }
      />
    </div>
  );
}

"use client";

import React from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Layers,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/hr-options";
import {
  CYCLES,
  DEPARTMENTS,
  HIRING_MANAGERS,
  SOURCES,
  STAGES,
  addRequisition,
  cycleLabel,
  updateRequisition,
  type Requisition,
  type Stage,
} from "@/lib/recruitment-store";

const inputClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const labelClass = "text-xs font-medium text-muted-foreground mb-1.5 block";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewRequisitionModal({
  open,
  onOpenChange,
  defaultCycle,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCycle: string;
  editing?: Requisition | null;
  onSaved?: (req: Requisition) => void;
}) {
  const [position, setPosition] = React.useState("");
  const [department, setDepartment] = React.useState(DEPARTMENTS[0]);
  const [hiringManager, setHiringManager] = React.useState(HIRING_MANAGERS[0]);
  const [category, setCategory] = React.useState("HRH");
  const [cycle, setCycle] = React.useState(
    defaultCycle === "all" ? CYCLES[0] : defaultCycle,
  );
  const [applicants, setApplicants] = React.useState("0");
  const [shortlisted, setShortlisted] = React.useState("0");
  const [interviewed, setInterviewed] = React.useState("0");
  const [offers, setOffers] = React.useState("0");
  const [stage, setStage] = React.useState<Stage>("Applications");
  const [openingDate, setOpeningDate] = React.useState(todayISO());
  const [targetDate, setTargetDate] = React.useState("");
  const [sources, setSources] = React.useState<string[]>([]);
  const [nextMilestone, setNextMilestone] = React.useState("");
  const [milestoneDate, setMilestoneDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState("");

  // Re-seed the form every time the modal opens (add vs edit mode).
  React.useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setPosition(editing.position);
      setDepartment(editing.department);
      setHiringManager(editing.hiringManager);
      setCategory(editing.category || "HRH");
      setCycle(editing.cycle);
      setApplicants(String(editing.applicants ?? 0));
      setShortlisted(String(editing.shortlisted ?? 0));
      setInterviewed(String(editing.interviewed ?? 0));
      setOffers(String(editing.offers ?? 0));
      setStage(editing.stage);
      setOpeningDate(editing.openingDate);
      setTargetDate(editing.targetDate);
      setSources(Array.isArray(editing.sources) ? editing.sources : []);
      setNextMilestone(editing.nextMilestone || "");
      setMilestoneDate(editing.milestoneDate || "");
      setNotes(editing.notes || "");
      return;
    }
    setPosition("");
    setDepartment(DEPARTMENTS[0]);
    setHiringManager(HIRING_MANAGERS[0]);
    setCategory("HRH");
    setCycle(defaultCycle === "all" ? CYCLES[0] : defaultCycle);
    setApplicants("0");
    setShortlisted("0");
    setInterviewed("0");
    setOffers("0");
    setStage("Applications");
    setOpeningDate(todayISO());
    setTargetDate("");
    setSources([]);
    setNextMilestone("");
    setMilestoneDate("");
    setNotes("");
  }, [open, editing, defaultCycle]);

  const toggleSource = (source: string) => {
    setSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  };

  const toNumber = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!position.trim()) {
      setError("Position title is required.");
      return;
    }

    const payload = {
      position: position.trim(),
      department,
      hiringManager,
      category,
      cycle,
      applicants: toNumber(applicants),
      shortlisted: toNumber(shortlisted),
      interviewed: toNumber(interviewed),
      offers: toNumber(offers),
      stage,
      openingDate: openingDate || todayISO(),
      targetDate: targetDate || openingDate || todayISO(),
      sources: sources.length > 0 ? sources : ["Referrals"],
      nextMilestone: nextMilestone.trim() || "Shortlisting",
      milestoneDate: milestoneDate || targetDate || openingDate || todayISO(),
      notes: notes.trim(),
    };

    const saved = editing
      ? updateRequisition(editing.id, payload)
      : addRequisition(payload);

    if (saved) onSaved?.(saved);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit requisition" : "New requisition"}
        className="relative z-10 mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-popover shadow-2xl ring-1 ring-foreground/10"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-popover px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              {editing ? (
                <Layers className="h-5 w-5 text-blue-600" />
              ) : (
                <Plus className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {editing ? "Edit requisition" : "New requisition"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {editing
                  ? `${editing.id} · ${cycleLabel(editing.cycle)}`
                  : "Open a role and start tracking its candidate pipeline"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Role */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Role
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Position title *</label>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Procurement & Admin Manager"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputClass}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Hiring manager</label>
                <select
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  className={inputClass}
                >
                  {HIRING_MANAGERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <div
                  role="group"
                  aria-label="Category"
                  className="inline-flex w-full items-center gap-1 rounded-full bg-muted p-1"
                >
                  {["HRH", "CHAK", "CBSL"].map((cat) => {
                    const active = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        aria-pressed={active}
                        className={cn(
                          "flex-1 rounded-full px-3 py-1 text-xs transition-colors",
                          active
                            ? "bg-blue-600 font-medium text-white shadow-sm"
                            : "text-foreground/70 hover:bg-background/60 hover:text-foreground",
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Must be one of: {CATEGORIES.join(", ")}
                </p>
              </div>
              <div>
                <label className={labelClass}>Reporting cycle</label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className={inputClass}
                >
                  {CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {cycleLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Pipeline numbers */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              Pipeline
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Applicants", value: applicants, set: setApplicants },
                {
                  label: "Shortlisted",
                  value: shortlisted,
                  set: setShortlisted,
                },
                {
                  label: "Interviewed",
                  value: interviewed,
                  set: setInterviewed,
                },
                { label: "Offers", value: offers, set: setOffers },
              ].map((field) => (
                <div key={field.label}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className={labelClass}>Current stage</label>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => {
                  const active = stage === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStage(s)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "border-blue-600 bg-blue-600 font-medium text-white"
                          : "border-border bg-background text-foreground/70 hover:bg-muted",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Dates + sourcing */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Timeline &amp; sourcing
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Opening date</label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Target date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Sources</label>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map((source) => {
                    const active = sources.includes(source);
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => toggleSource(source)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          active
                            ? "border-foreground/20 bg-foreground text-background"
                            : "border-border bg-background text-foreground/70 hover:bg-muted",
                        )}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>Next milestone</label>
                <input
                  value={nextMilestone}
                  onChange={(e) => setNextMilestone(e.target.value)}
                  placeholder="e.g. Panel review"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Milestone date</label>
                <input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Panel feedback, referee status, offer approvals…"
                  className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              {editing ? (
                <>
                  <BadgeCheck className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create requisition
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

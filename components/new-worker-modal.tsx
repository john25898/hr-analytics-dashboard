"use client";

import React from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  addDisability,
  addNewWorker,
  getRegulatoryBodies,
  type NewWorkerRecord,
} from "@/lib/employee-store";
import {
  rosterCounties,
  rosterFacilities,
  rosterSubCounties,
} from "@/lib/facility-roster";
import {
  CATEGORIES,
  CONTRACT_TYPES,
  DISABILITY_TYPES,
  EDUCATION_LEVELS,
  PROJECTS,
  SUPPORT_SUGGESTIONS,
  WORKSTATIONS,
  mergeRegulatoryBodies,
} from "@/lib/hr-options";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function NewWorkerModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: analytics } = useSWR("/api/analytics", fetcher);
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [idNo, setIdNo] = React.useState("");
  const [workEmail, setWorkEmail] = React.useState("");
  const [personalEmail, setPersonalEmail] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [project, setProject] = React.useState("");
  const [workstation, setWorkstation] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [subCounty, setSubCounty] = React.useState("");
  const [facility, setFacility] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [dateEmployed, setDateEmployed] = React.useState("");
  const [contractEnd, setContractEnd] = React.useState("");
  const [educationLevel, setEducationLevel] = React.useState("");
  const [qualification, setQualification] = React.useState("");
  const [othersCert, setOthersCert] = React.useState("");
  const [regulatoryBody, setRegulatoryBody] = React.useState("");
  // Built-in councils plus any custom ones HR has added on the Regulatory
  // Bodies page. Re-read on open so bodies added after mount still show up.
  const [bodyOptions, setBodyOptions] = React.useState<string[]>(() =>
    mergeRegulatoryBodies(),
  );
  const [licenceNo, setLicenceNo] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [disability, setDisability] = React.useState("");
  const [supportNeeded, setSupportNeeded] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // CHAK staff: no county/sub-county, office workstation in place of facility.
  const isChak = category === "CHAK";

  // Counties, sub-counties and facilities come from the Jamii Tekelezi (JTP)
  // facility roster (200 facilities) so the dropdowns stay chained:
  //   County -> Sub County -> Facility
  const counties = React.useMemo(() => rosterCounties(), []);

  const designations = React.useMemo(() => {
    if (!analytics?.designationDistribution) return [];
    return analytics.designationDistribution.map((d: any) => d.name).sort();
  }, [analytics]);

  const subCounties = React.useMemo(() => rosterSubCounties(county), [county]);

  const facilities = React.useMemo(
    () => rosterFacilities(county, subCounty),
    [county, subCounty],
  );

  const reset = () => {
    setName("");
    setGender("");
    setPhone("");
    setIdNo("");
    setWorkEmail("");
    setPersonalEmail("");
    setCategory("");
    setEmploymentType("");
    setProject("");
    setWorkstation("");
    setDob("");
    setCounty("");
    setSubCounty("");
    setFacility("");
    setDesignation("");
    setDateEmployed("");
    setContractEnd("");
    setEducationLevel("");
    setQualification("");
    setOthersCert("");
    setRegulatoryBody("");
    setLicenceNo("");
    setValidUntil("");
    setDisability("");
    setSupportNeeded("");
    setError("");
  };

  React.useEffect(() => {
    if (open) reset();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const custom = getRegulatoryBodies().map((b) => b.name);
    setBodyOptions(mergeRegulatoryBodies(custom));
  }, [open]);

  const handleSubmit = async () => {
    if (saving) return;
    // Category drives the location fields: CHAK staff need a workstation
    // (office), HRH / CBSL staff need the county -> sub-county -> facility chain.
    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (!category) {
      setError("Please select a Category.");
      return;
    }
    if (isChak && !workstation) {
      setError("Please select a Workstation for CHAK staff.");
      return;
    }
    if (!isChak && !county) {
      setError("Please select a County.");
      return;
    }
    setError("");
    const record: NewWorkerRecord = {
      id: `worker-${Date.now()}`,
      name: name.trim(),
      gender,
      phone,
      idNo,
      workEmail: workEmail.trim(),
      personalEmail: personalEmail.trim(),
      category,
      employmentType,
      project,
      workstation: isChak ? workstation : "",
      county: isChak ? "" : county,
      subCounty: isChak ? "" : subCounty,
      facility: isChak ? workstation : facility,
      designation,
      dateEmployed: dateEmployed || new Date().toISOString(),
      contractEnd,
      dob,
      educationLevel,
      qualification,
      othersCert,
      regulatoryBody,
      licenceNo,
      validUntil,
      // Only kept when a disability was actually declared.
      disability,
      supportNeeded: disability ? supportNeeded : "",
    };
    setSaving(true);
    try {
      // Wait for the shared-backend write so counts refresh with the new
      // worker included (no manual browser refresh needed).
      await addNewWorker(record);
      // Mirror the declaration into the Disabilities register so it is
      // tracked for accommodations and reporting.
      if (disability) {
        addDisability({
          id: `disability-${Date.now()}`,
          name: record.name,
          gender: record.gender,
          disability,
          county: record.county,
          subCounty: record.subCounty,
          facility: record.facility,
          designation: record.designation,
          phone: record.phone,
          supportNeeded: record.supportNeeded || "",
          idNo: record.idNo,
          dob: record.dob,
          dateEmployed: record.dateEmployed,
          educationLevel: record.educationLevel,
          qualification: record.qualification,
          regulatoryBody: record.regulatoryBody,
        });
      }
      reset();
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-popover p-0 shadow-2xl ring-1 ring-foreground/10 mx-4">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-popover px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Add New Worker</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <span className="sr-only">Close</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9684 3.2184L7.49998 6.68682L4.03156 3.2184C3.80701 2.99385 3.44294 2.99385 3.21839 3.2184C2.99384 3.44295 2.99384 3.80702 3.21839 4.03157L6.68681 7.49999L3.21839 10.9684C2.99384 11.193 2.99384 11.557 3.21839 11.7816C3.44294 12.0061 3.80701 12.0061 4.03156 11.7816L7.49998 8.31316L10.9684 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31315 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Full Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                ID Number
              </label>
              <input
                value={idNo}
                onChange={(e) => setIdNo(e.target.value)}
                placeholder="ID No."
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Work Email
              </label>
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="name@chak.org"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Personal Email
              </label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Category / Employment Type / Project — sits right after ID Number */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategory(next);
                  setError("");
                  // Switching category invalidates the other location fields.
                  if (next === "CHAK") {
                    setCounty("");
                    setSubCounty("");
                    setFacility("");
                  } else {
                    setWorkstation("");
                  }
                }}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Contract Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select contract type</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Project
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select project</option>
                {PROJECTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* County / Sub County / Facility only apply to non-CHAK staff */}
            {!isChak && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    County *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => {
                      setCounty(e.target.value);
                      setSubCounty("");
                      setFacility("");
                    }}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select county</option>
                    {counties.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Sub County
                  </label>
                  <select
                    value={subCounty}
                    disabled={!county}
                    onChange={(e) => {
                      setSubCounty(e.target.value);
                      setFacility("");
                    }}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {county ? "All sub counties" : "Select county first"}
                    </option>
                    {subCounties.map((s: string) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Facility / Station
                  </label>
                  <select
                    value={facility}
                    disabled={!county}
                    onChange={(e) => setFacility(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {county ? "Select facility" : "Select county first"}
                    </option>
                    {facilities.map((f: string) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* CHAK staff: workstation replaces facility */}
            {isChak && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Workstation *
                </label>
                <select
                  value={workstation}
                  onChange={(e) => {
                    setWorkstation(e.target.value);
                    setError("");
                  }}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select workstation</option>
                  {WORKSTATIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Designation
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select designation</option>
                {designations.map((d: string) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Date Employed
              </label>
              <input
                type="date"
                value={dateEmployed}
                onChange={(e) => setDateEmployed(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Contract End
              </label>
              <input
                type="date"
                value={contractEnd}
                onChange={(e) => setContractEnd(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select education level</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Qualification
              </label>
              <input
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. Diploma in Health Records & IT"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Other Certifications
              </label>
              <input
                value={othersCert}
                onChange={(e) => setOthersCert(e.target.value)}
                placeholder="Additional certifications"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Regulatory Body
              </label>
              <select
                value={regulatoryBody}
                onChange={(e) => setRegulatoryBody(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select regulatory body</option>
                {bodyOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Practice Licence No
              </label>
              <input
                value={licenceNo}
                onChange={(e) => setLicenceNo(e.target.value)}
                placeholder="Licence number"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Licence Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Disability
              </label>
              <select
                value={disability}
                onChange={(e) => {
                  setDisability(e.target.value);
                  // Clear the accommodation when no disability is declared.
                  if (!e.target.value) setSupportNeeded("");
                }}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None declared</option>
                {DISABILITY_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {disability && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Support Needed
                </label>
                <input
                  list="support-needed-options"
                  value={supportNeeded}
                  onChange={(e) => setSupportNeeded(e.target.value)}
                  placeholder="Accommodations required"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <datalist id="support-needed-options">
                  {SUPPORT_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              // Required fields are enforced in handleSubmit (with a visible
              // message) because CHAK staff have no county — only a workstation.
              disabled={!name.trim() || saving}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving…" : "Save Worker"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Employee, Layworker, getExcelData } from "@/lib/excel-data";
import { normalizeCategory } from "@/lib/hr-options";
import { readAllChanges, type HRChangeRow } from "@/lib/server/hr-store";

export interface MergedData {
  employees: Employee[];
  departed: Employee[];
  layworkers: Layworker[];
  summary: {
    totalEmployees: number;
    totalDeparted: number;
    totalLayworkers: number;
    totalPersonnel: number;
    designationGroups: string[];
    individualDesignations: string[];
  };
}

/**
 * Fetch all change rows from the shared change store (Supabase when configured,
 * otherwise the server-side change file). File rows are returned too, so a
 * worker added while no Supabase project is configured still shows up in every
 * list and KPI.
 */
async function fetchChanges(): Promise<HRChangeRow[]> {
  try {
    return await readAllChanges();
  } catch {
    return [];
  }
}

/**
 * Canonical designation metadata — the single source of truth for how a
 * designation (short title) maps to its designation group and full title.
 * New workers are only required to pick a designation in the UI; the rest is
 * derived here so the dashboard stays consistent with the master workbook.
 */
const DESIGNATION_META: Record<
  string,
  { designationGroup: string; designationOriginal: string }
> = {
  "Clinical Officer": {
    designationGroup: "Clinical Officer",
    designationOriginal: "Clinical Officer",
  },
  "Clinical Officer - Mentor": {
    designationGroup: "Clinical Officer",
    designationOriginal: "Clinical Officer - Mentor",
  },
  "Counseling Psychologist": {
    designationGroup: "Counseling Psychologist",
    designationOriginal: "Counselling Psychologist",
  },
  HRIO: {
    designationGroup: "HRIO",
    designationOriginal: "Health Records Information Officer",
  },
  "HRIO Mentor": {
    designationGroup: "HRIO",
    designationOriginal: "Hrio - Mentor",
  },
  "HTS Counselor": {
    designationGroup: "HTS Counselor",
    designationOriginal: "Hts Counselor",
  },
  "ICT Officer": {
    designationGroup: "ICT Officer",
    designationOriginal: "Ict Officer",
  },
  "Medical Laboratory Technologist": {
    designationGroup: "Medical Laboratory Technologist",
    designationOriginal: "Medical Laboratory Technologist",
  },
  Nurse: {
    designationGroup: "Nurse",
    designationOriginal: "Nurse",
  },
  "Pharmaceutical Technologist": {
    designationGroup: "Pharmaceutical Technologist",
    designationOriginal: "Pharmaceutical Technologist",
  },
  "Pharmaceutical Technologist - Supply Chain": {
    designationGroup: "Pharmaceutical Technologist - Supply Chain",
    designationOriginal: "Pharmacy Technologist - Supply Chain",
  },
  "Social Worker": {
    designationGroup: "Social Worker",
    designationOriginal: "Social Worker",
  },
};

/** Resolve group + full title for a designation (backend-derived). */
export function designationMeta(designation?: string): {
  designationGroup?: string;
  designationOriginal?: string;
} {
  if (!designation) return {};
  const meta = DESIGNATION_META[designation];
  return meta
    ? {
        designationGroup: meta.designationGroup,
        designationOriginal: meta.designationOriginal,
      }
    : {};
}

/** Apply an employee_edit record onto a base employee. */
function applyEdit(emp: Employee, edit: any): Employee {
  const next: Employee = { ...emp };
  if (edit?.license) {
    if (edit.license.licenceNo) next.practiseeLicence = edit.license.licenceNo;
    if (edit.license.validUntil) next.validUntil = edit.license.validUntil;
  }
  if (edit?.endOfContract) next.contractEnd = edit.endOfContract;
  if (edit?.category) next.category = edit.category;
  if (typeof edit?.isDeparted === "boolean") next.isDeparted = edit.isDeparted;
  if (edit?.exitReason) (next as any).exitReason = edit.exitReason;
  if (edit?.exitDate) (next as any).exitDate = edit.exitDate;
  if (edit?.provisions) (next as any).provisions = edit.provisions;
  return next;
}

/** Convert a new_worker record into the Employee shape the rest of the app uses. */
function newWorkerToEmployee(w: any): Employee {
  const designation =
    w?.designation ||
    w?.designationGroup ||
    w?.designationOriginal ||
    undefined;
  const meta = designationMeta(designation);
  return {
    id: w?.id,
    name: w?.name,
    gender: w?.gender || undefined,
    designation,
    designationGroup: w?.designationGroup || meta.designationGroup || undefined,
    designationOriginal:
      w?.designationOriginal || meta.designationOriginal || undefined,
    county: w?.county || undefined,
    subCounty: w?.subCounty || undefined,
    // CHAK staff have no facility — their workstation (office) is the station.
    station: w?.facility || w?.workstation || w?.subCounty || undefined,
    category: w?.category || undefined,
    employmentType: w?.employmentType || undefined,
    project: w?.project || undefined,
    workstation: w?.workstation || undefined,
    validUntil: w?.validUntil || undefined,
    contractEnd: w?.contractEnd || undefined,
    phone: w?.phone,
    idNo: w?.idNo,
    workEmail: w?.workEmail || undefined,
    personalEmail: w?.personalEmail || undefined,
    educationLevel: w?.educationLevel || undefined,
    qualification: w?.qualification || undefined,
    regulatoryBody: w?.regulatoryBody || undefined,
    practiseeLicence: w?.licenceNo || undefined,
    dateEmployed: w?.dateEmployed,
    dob: w?.dob || undefined,
    disability: w?.disability || undefined,
    supportNeeded: w?.supportNeeded || undefined,
    isDeparted: false,
  };
}

/**
 * Base Excel roster + server-side merge of shared Supabase changes
 * (new workers, license/contract edits, departures, re-hires).
 * Every API route that serves employees/analytics should use this so the
 * dashboard, compliance, payroll, etc. all reflect live HR changes.
 */
export async function getMergedData(): Promise<MergedData | null> {
  const base = await getExcelData();
  if (!base) return null;

  const changes = await fetchChanges();
  const newWorkers: Employee[] = [];
  const editsByName: Record<string, any> = {};
  // Latest project transfer per employee (rows arrive newest-first).
  const projectByName: Record<string, string> = {};

  for (const row of changes) {
    const data = row?.data;
    if (!data) continue;
    if (row.change_type === "new_worker" && data?.name) {
      newWorkers.push(newWorkerToEmployee(data));
    } else if (row.change_type === "employee_edit" && row.ref_id) {
      editsByName[row.ref_id] = data;
    } else if (
      row.change_type === "transfer" &&
      data?.employeeName &&
      data?.toProject
    ) {
      // Only the most recent transfer wins for a given employee.
      if (!(data.employeeName in projectByName)) {
        projectByName[data.employeeName] = data.toProject;
      }
    }
  }

  const active: Employee[] = [];
  const departed: Employee[] = [...base.departed];

  for (const emp of base.employees) {
    const edit = editsByName[emp.name];
    if (edit?.isDeparted) {
      departed.push(applyEdit(emp, edit));
    } else {
      active.push(edit ? applyEdit(emp, edit) : emp);
    }
  }

  // Apply edits to departed staff too; re-hired staff come back to active.
  const rehired: Employee[] = [];
  const remainingDeparted: Employee[] = [];
  for (const emp of departed) {
    const edit = editsByName[emp.name];
    const updated = edit ? applyEdit(emp, edit) : emp;
    if (edit && edit.isDeparted === false) {
      updated.isDeparted = false;
      rehired.push(updated);
    } else {
      remainingDeparted.push(updated);
    }
  }

  const employees = [...active, ...newWorkers, ...rehired].map((emp) =>
    projectByName[emp.name]
      ? { ...emp, project: projectByName[emp.name] }
      : emp,
  );
  const designationGroups = [
    ...new Set(
      employees
        .map((e) => e.designationGroup || e.designation || "Unknown")
        .filter(Boolean),
    ),
  ];
  const individualDesignations = [
    ...new Set(
      employees.map((e) => e.designation || "Unknown").filter(Boolean),
    ),
  ];

  // Normalise the category on every record (employees, departed, layworkers)
  // so the dashboard "View data by category" filter can rely on it existing.
  const withCategory = <T extends { category?: string }>(list: T[]): T[] =>
    list.map((item) => ({
      ...item,
      category: normalizeCategory(item.category),
    }));

  return {
    employees: withCategory(employees),
    departed: withCategory(remainingDeparted),
    layworkers: withCategory(base.layworkers),
    summary: {
      totalEmployees: employees.length,
      totalDeparted: remainingDeparted.length,
      totalLayworkers: base.layworkers.length,
      totalPersonnel:
        employees.length + remainingDeparted.length + base.layworkers.length,
      designationGroups,
      individualDesignations,
    },
  };
}

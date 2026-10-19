"use server";

import fs from "fs";
import path from "path";

export interface Employee {
  name: string;
  gender?: string;
  phone?: string;
  idNo?: string;
  designation?: string;
  designationGroup?: string;
  designationOriginal?: string;
  county?: string;
  subCounty?: string;
  station?: string;
  dateEmployed?: string;
  dob?: string;
  age?: number;
  educationLevel?: string;
  qualification?: string;
  regulatoryBody?: string;
  practiseeLicence?: string;
  validUntil?: string;
  contractEnd?: string;
  isDeparted?: boolean;
  [key: string]: any;
}

export interface Layworker {
  id?: string | number;
  name: string;
  facility?: string;
  county?: string;
  subCounty?: string;
  cadre?: string;
  phone?: string;
  idNo?: string;
  amount?: number;
}

export interface EnrichedData {
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

let cachedData: EnrichedData | null = null;

export async function getExcelData(): Promise<EnrichedData | null> {
  if (cachedData) return cachedData;

  try {
    const enrichedPath = path.join(
      process.cwd(),
      "data/employees-enriched.json",
    );
    if (fs.existsSync(enrichedPath)) {
      const raw = fs.readFileSync(enrichedPath, "utf-8");
      const data: EnrichedData = JSON.parse(raw);
      data.employees = data.employees.map(normalizeEmployeeCounty);
      data.departed = data.departed.map(normalizeEmployeeCounty);
      data.layworkers = data.layworkers.map((lw: Layworker) => {
        if (lw.county) lw.county = normalizeCountyName(lw.county);
        return lw;
      });
      cachedData = data;
      return data;
    }
    console.error("No data files found in /data directory");
    return null;
  } catch (error) {
    console.error("Error reading enriched data:", error);
    return null;
  }
}

function normalizeCountyName(county?: string): string {
  if (!county) return "Unknown";
  const normalized = county.toString().trim().toUpperCase();
  if (normalized.includes("EMBU")) return "Embu";
  if (normalized.includes("MERU")) return "Meru";
  if (normalized.includes("NYANDARUA")) return "Nyandarua";
  if (normalized.includes("THARAKA")) return "Tharaka Nithi";
  return county.toString().trim();
}

function normalizeEmployeeCounty(emp: Employee): Employee {
  if (emp.county) emp.county = normalizeCountyName(emp.county);
  return emp;
}

import { NextRequest, NextResponse } from "next/server";
import { getMergedData } from "@/lib/hr-merge";
import { CATEGORIES, matchesCategory } from "@/lib/hr-options";

export async function GET(request: NextRequest) {
  try {
    const data = await getMergedData();

    if (!data) {
      return NextResponse.json(
        { error: "Failed to load data" },
        { status: 500 },
      );
    }

    // "View data by category" filter — HRH (default) / CHAK / CBSL / all.
    const categoryFilter = request.nextUrl.searchParams.get("category");
    const inCategory = (record: { category?: string }) =>
      matchesCategory(record, categoryFilter);

    const employees = data.employees.filter(inCategory);
    const departedInCategory = data.departed.filter(inCategory);
    const layworkersInCategory = (data.layworkers || []).filter(inCategory);

    // Gender distribution
    const genderCount = employees.reduce(
      (acc, emp) => {
        const gender = emp.gender || "Unknown";
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // County distribution
    const countyCount = employees.reduce(
      (acc, emp) => {
        const county = emp.county || "Unknown";
        acc[county] = (acc[county] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Designation GROUP distribution (merged for filters)
    const designationGroupCount = employees.reduce(
      (acc, emp) => {
        const group = emp.designationGroup || emp.designation || "Unknown";
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Individual designation distribution
    const designationCount = employees.reduce(
      (acc, emp) => {
        const designation = emp.designation || "Unknown";
        acc[designation] = (acc[designation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Education level distribution
    const educationCount = employees.reduce(
      (acc, emp) => {
        const education = emp.educationLevel || "Unknown";
        acc[education] = (acc[education] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Age distribution
    const ageRanges: Record<string, number> = {
      "20-30": 0,
      "31-40": 0,
      "41-50": 0,
      "51-60": 0,
      "60+": 0,
    };
    employees.forEach((emp) => {
      const age = emp.age ? parseInt(String(emp.age)) : null;
      if (age) {
        if (age <= 30) ageRanges["20-30"]++;
        else if (age <= 40) ageRanges["31-40"]++;
        else if (age <= 50) ageRanges["41-50"]++;
        else if (age <= 60) ageRanges["51-60"]++;
        else ageRanges["60+"]++;
      }
    });

    // License status based on validUntil dates
    const today = new Date();
    const thirtyDaysFromNow = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    let validCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let noLicenseCount = 0;

    employees.forEach((emp) => {
      if (!emp.validUntil) {
        noLicenseCount++;
        return;
      }
      const expireDate = new Date(emp.validUntil);
      if (expireDate < today) expiredCount++;
      else if (expireDate <= thirtyDaysFromNow) expiringCount++;
      else validCount++;
    });

    const licenseStatus = {
      Valid: validCount,
      Expiring: expiringCount,
      Expired: expiredCount,
      "Not Available": noLicenseCount,
    };

    // Regulatory bodies
    const regulatoryBodyCount = employees.reduce(
      (acc, emp) => {
        const body = emp.regulatoryBody || "Unregistered";
        acc[body] = (acc[body] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Sub-county distribution
    const subCountyCount = employees.reduce(
      (acc, emp) => {
        const subCounty = emp.subCounty || "Unknown";
        acc[subCounty] = (acc[subCounty] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Facility/Station distribution
    const facilityCount = employees.reduce(
      (acc, emp) => {
        const facility = emp.station || "Unknown";
        acc[facility] = (acc[facility] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Tenure ranges
    const now = new Date();
    const tenureRanges: Record<string, number> = {
      "0-2 years": 0,
      "2-5 years": 0,
      "5-10 years": 0,
      "10-15 years": 0,
      "15+ years": 0,
    };
    employees.forEach((emp) => {
      if (emp.dateEmployed) {
        const employed = new Date(emp.dateEmployed);
        const yearsEmployed =
          (now.getTime() - employed.getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (yearsEmployed <= 2) tenureRanges["0-2 years"]++;
        else if (yearsEmployed <= 5) tenureRanges["2-5 years"]++;
        else if (yearsEmployed <= 10) tenureRanges["5-10 years"]++;
        else if (yearsEmployed <= 15) tenureRanges["10-15 years"]++;
        else tenureRanges["15+ years"]++;
      }
    });

    // Qualifications
    const qualificationCount = employees.reduce(
      (acc, emp) => {
        const qual = emp.qualification || "Unknown";
        acc[qual] = (acc[qual] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Employees per category — lets the UI show what each pill contains.
    const categoryCounts: Record<string, number> = {};
    CATEGORIES.forEach((cat) => (categoryCounts[cat] = 0));
    data.employees.forEach((emp) => {
      const key = emp.category || "HRH";
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });

    return NextResponse.json({
      category: categoryFilter || "all",
      categoryCounts,
      summary: {
        totalEmployees: employees.length,
        totalDeparted: departedInCategory.length,
        totalLayworkers: layworkersInCategory.length,
        totalPersonnel:
          employees.length +
          departedInCategory.length +
          layworkersInCategory.length,
        expiringLicenses: expiringCount,
        expiredLicenses: expiredCount,
        validLicenses: validCount,
        designationGroups: [
          ...new Set(
            employees
              .map((e) => e.designationGroup || e.designation || "Unknown")
              .filter(Boolean),
          ),
        ],
      },
      genderDistribution: Object.entries(genderCount).map(([name, value]) => ({
        name,
        value,
      })),
      countyDistribution: Object.entries(countyCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      designationDistribution: Object.entries(designationCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, value]) => ({ name, value })),
      designationGroupDistribution: Object.entries(designationGroupCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      educationDistribution: Object.entries(educationCount).map(
        ([name, value]) => ({ name, value }),
      ),
      ageDistribution: Object.entries(ageRanges).map(([name, value]) => ({
        name,
        value,
      })),
      licenseStatus: Object.entries(licenseStatus).map(([name, value]) => ({
        name,
        value,
      })),
      regulatoryBodies: Object.entries(regulatoryBodyCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      subCountyDistribution: Object.entries(subCountyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, value]) => ({ name, value })),
      facilityDistribution: Object.entries(facilityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, value]) => ({ name, value })),
      tenureDistribution: Object.entries(tenureRanges).map(([name, value]) => ({
        name,
        value,
      })),
      qualifications: Object.entries(qualificationCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
    });
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

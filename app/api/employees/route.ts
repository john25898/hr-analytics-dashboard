import { NextRequest, NextResponse } from "next/server";
import { getMergedData } from "@/lib/hr-merge";
import { matchesCategory } from "@/lib/hr-options";

export async function GET(request: NextRequest) {
  try {
    const data = await getMergedData();

    if (!data) {
      return NextResponse.json(
        { error: "Failed to load data" },
        { status: 500 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const county = searchParams.get("county");
    const designation = searchParams.get("designation");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search")?.toLowerCase();
    const status = searchParams.get("status");
    const education = searchParams.get("education");
    const regulatoryBody = searchParams.get("regulatoryBody");
    const includeDeparted = searchParams.get("includeDeparted") === "true";
    const limit = searchParams.get("limit");

    // Start with active employees only (unless includeDeparted is true)
    let filtered = includeDeparted
      ? [...data.employees, ...data.departed]
      : [...data.employees];

    // HRH / CHAK / CBSL — untagged records default to HRH.
    if (category && category !== "all") {
      filtered = filtered.filter((emp) => matchesCategory(emp, category));
    }

    if (county && county !== "all") {
      filtered = filtered.filter((emp) => emp.county === county);
    }

    if (designation && designation !== "all") {
      // Filter by designationGroup (merged filter) or individual designation
      filtered = filtered.filter(
        (emp) =>
          emp.designationGroup === designation ||
          emp.designation === designation,
      );
    }

    if (gender && gender !== "all") {
      filtered = filtered.filter(
        (emp) => emp.gender?.toUpperCase() === gender.toUpperCase(),
      );
    }

    if (status && status !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "active" || statusLower === "valid") {
        filtered = filtered.filter((emp) => {
          if (!emp.validUntil) return true;
          return new Date(emp.validUntil) >= new Date();
        });
      } else if (statusLower === "expired") {
        filtered = filtered.filter((emp) => {
          if (!emp.validUntil) return false;
          return new Date(emp.validUntil) < new Date();
        });
      } else if (statusLower === "expiring") {
        const today = new Date();
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((emp) => {
          if (!emp.validUntil) return false;
          const d = new Date(emp.validUntil);
          return d <= thirtyDays && d >= today;
        });
      }
    }

    if (education && education !== "all") {
      filtered = filtered.filter((emp) => emp.educationLevel === education);
    }

    if (regulatoryBody && regulatoryBody !== "all") {
      filtered = filtered.filter(
        (emp) => emp.regulatoryBody === regulatoryBody,
      );
    }

    if (search) {
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(search) ||
          emp.phone?.toString().includes(search) ||
          emp.idNo?.toString().includes(search),
      );
    }

    // Apply limit if specified
    const result = limit ? filtered.slice(0, parseInt(limit)) : filtered;

    return NextResponse.json({
      data: result,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error in employees API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

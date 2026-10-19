import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "data", "leave-data.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const searchParams = request.nextUrl.searchParams;
    const employee = searchParams.get("employee");
    const leaveType = searchParams.get("leaveType");
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    let log = [...data.leaveLog];

    if (employee && employee !== "all") {
      log = log.filter((l: any) => l.employee === employee);
    }
    if (leaveType && leaveType !== "all") {
      log = log.filter((l: any) => l.leaveType === leaveType);
    }
    if (status && status !== "all") {
      log = log.filter((l: any) => l.status === status);
    }
    if (month && month !== "all") {
      const m = parseInt(month);
      log = log.filter((l: any) => {
        const d = new Date(l.startDate);
        return d.getMonth() + 1 === m;
      });
    }

    return NextResponse.json({
      ...data,
      leaveLog: log,
      total: log.length,
    });
  } catch (error) {
    console.error("Error in leave API:", error);
    return NextResponse.json(
      { error: "Failed to load leave data" },
      { status: 500 },
    );
  }
}

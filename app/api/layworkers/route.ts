import { NextResponse } from "next/server";
import { getExcelData } from "@/lib/excel-data";

export async function GET() {
  try {
    const data = await getExcelData();

    if (!data) {
      return NextResponse.json(
        { error: "Failed to load data" },
        { status: 500 },
      );
    }

    // Group layworkers by county
    const byCounty = (data.layworkers || []).reduce(
      (acc: any, worker: any) => {
        const county = worker.county || "Unknown";
        if (!acc[county]) acc[county] = [];
        acc[county].push(worker);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return NextResponse.json({
      layworkers: data.layworkers,
      byCounty,
      total: data.layworkers?.length || 0,
      countyCount: Object.keys(byCounty).length,
      summary: data.summary,
    });
  } catch (error) {
    console.error("Error in layworkers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getOverviewMetrics } from "@/lib/db";

export async function GET() {
  try {
    const data = getOverviewMetrics();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load overview metrics" },
      { status: 500 }
    );
  }
}

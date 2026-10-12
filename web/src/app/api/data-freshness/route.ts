import { NextResponse } from "next/server";
import { getDataFreshness } from "@/lib/db";

export async function GET() {
  try {
    const data = getDataFreshness();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load data freshness" },
      { status: 500 }
    );
  }
}

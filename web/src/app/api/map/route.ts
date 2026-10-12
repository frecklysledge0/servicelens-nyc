import { NextRequest, NextResponse } from "next/server";
import { getMapData } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const borough = searchParams.get("borough") || undefined;
    const risk_band = searchParams.get("risk_band") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "800", 10);

    const mapData = getMapData({
      borough,
      risk_band,
      status,
      limit,
    });

    return NextResponse.json(mapData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve map points" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRequestsList } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const borough = searchParams.get("borough") || undefined;
    const status = searchParams.get("status") || undefined;
    const risk_band = searchParams.get("risk_band") || undefined;
    const descriptor = searchParams.get("descriptor") || undefined;
    const start_date = searchParams.get("start_date") || undefined;
    const end_date = searchParams.get("end_date") || undefined;
    const sort_by = searchParams.get("sort_by") || undefined;
    const sort_order = (searchParams.get("sort_order") as "asc" | "desc") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = getRequestsList({
      search,
      borough,
      status,
      risk_band,
      descriptor,
      start_date,
      end_date,
      sort_by,
      sort_order,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to query requests" },
      { status: 500 }
    );
  }
}

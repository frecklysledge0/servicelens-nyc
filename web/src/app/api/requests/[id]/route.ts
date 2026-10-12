import { NextRequest, NextResponse } from "next/server";
import { getRequestById } from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const req = getRequestById(id);

    if (!req) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve request details" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getModelPerformance } from "@/lib/db";

export async function GET() {
  try {
    const data = getModelPerformance();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load model performance metrics" },
      { status: 500 }
    );
  }
}

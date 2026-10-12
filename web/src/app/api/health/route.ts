import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM service_requests").get() as { c: number };
    return NextResponse.json({
      status: "ok",
      service: "ServiceLens NYC API",
      timestamp: new Date().toISOString(),
      database: "connected",
      records_indexed: count?.c || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

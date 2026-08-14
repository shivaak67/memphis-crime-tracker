import { NextRequest, NextResponse } from "next/server";
import { syncIncidents } from "@/lib/sync";

/**
 * GET|POST /api/sync  (cron-protected)
 * Pulls latest MPD ArcGIS incidents and upserts into Postgres.
 */

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function parseSinceDays(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("days");
  if (raw === null || raw === "") return 365;
  if (raw === "all") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 365;
  return Math.floor(n);
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncIncidents({ sinceDays: parseSinceDays(request) });
  const status = result.status === "success" ? 200 : 500;
  return NextResponse.json(result, { status });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

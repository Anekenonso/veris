import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit/auditLogger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || undefined;
    const logs = getAuditLogs(jobId);
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

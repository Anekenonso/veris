import { NextResponse } from "next/server";
import { verifyAndSettle } from "@/lib/orchestrator/orchestrator";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const job = await verifyAndSettle(params.id);
    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify and settle job";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

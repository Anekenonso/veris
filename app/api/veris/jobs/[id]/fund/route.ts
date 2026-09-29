import { NextResponse } from "next/server";
import { fundJob } from "@/lib/orchestrator/orchestrator";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const job = await fundJob(params.id, body.txHash);
    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fund job";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getWorkerReputation } from "@/lib/reputation/reputationService";

export async function GET(
  req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const data = await getWorkerReputation(params.address);
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch reputation";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

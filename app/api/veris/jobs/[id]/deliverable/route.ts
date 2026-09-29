import { NextResponse } from "next/server";
import { submitDeliverable } from "@/lib/orchestrator/orchestrator";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    if (!body.content) {
      return NextResponse.json(
        { success: false, error: "Missing required deliverable content" },
        { status: 400 }
      );
    }

    const job = await submitDeliverable({
      jobId: params.id,
      type: body.type || "text",
      content: String(body.content),
      notes: body.notes ? String(body.notes) : undefined,
      uri: body.uri ? String(body.uri) : undefined,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit deliverable";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

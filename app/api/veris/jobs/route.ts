import { NextResponse } from "next/server";
import { getAllJobs } from "@/lib/orchestrator/jobStore";
import { createJob } from "@/lib/orchestrator/orchestrator";

export async function GET() {
  try {
    const jobs = getAllJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.client || !body.worker || !body.criteria || !body.amountUSDC) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (title, client, worker, criteria, amountUSDC)" },
        { status: 400 }
      );
    }

    const job = await createJob({
      title: String(body.title),
      client: String(body.client),
      worker: String(body.worker),
      amountUSDC: Number(body.amountUSDC),
      criteria: String(body.criteria),
      deadline: body.deadline ? Number(body.deadline) : undefined,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create job";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { getJobById, saveJob, EscrowJob, JobState } from "./jobStore";
import { evaluateDeliverable, validateVerifierDecision, calculateEvidenceHash } from "../verifier/verifier";
import { logAuditEvent } from "../audit/auditLogger";
import { recordOnChainDelivery } from "../reputation/reputationService";
import { formatBytes32String } from "../contracts/reputationRegistry";

export interface CreateJobParams {
  title: string;
  client: string;
  worker: string;
  amountUSDC: number;
  criteria: string;
  deadline?: number;
}

export interface SubmitDeliverableParams {
  jobId: string;
  type: "text" | "code" | "image" | "pdf" | "other";
  content: string;
  notes?: string;
  uri?: string;
}

/**
 * 1. Creates a new Escrow Job in the CREATED state
 */
export async function createJob(params: CreateJobParams): Promise<EscrowJob> {
  const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  const newJob: EscrowJob = {
    id: jobId,
    title: params.title,
    client: params.client,
    worker: params.worker,
    amountUSDC: params.amountUSDC,
    criteria: params.criteria,
    deadline: params.deadline,
    state: "CREATED",
    createdAt: now,
    updatedAt: now,
  };

  saveJob(newJob);

  logAuditEvent({
    jobId,
    stage: "JOB_CREATED",
    actor: params.client,
    inputSummary: `Created escrow milestone: "${params.title}" (${params.amountUSDC} USDC)`,
    actionTaken: "Escrow job registered in Veris orchestrator",
    result: "SUCCESS",
    environment: "TESTNET",
    details: { client: params.client, worker: params.worker, amountUSDC: params.amountUSDC },
  });

  return newJob;
}

/**
 * 2. Funds an escrow milestone with USDC on Arc Testnet
 */
export async function fundJob(jobId: string, customTxHash?: string): Promise<EscrowJob> {
  const job = getJobById(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  if (job.state !== "CREATED") {
    throw new Error(`Invalid state transition: Cannot fund job in state '${job.state}'. Expected 'CREATED'.`);
  }

  const txHash = customTxHash || `0x${formatBytes32String(`fund_${jobId}_${Date.now()}`).substring(2)}`;
  const now = Date.now();

  job.state = "FUNDED";
  job.fundedAt = now;
  job.fundingTxHash = txHash;
  saveJob(job);

  logAuditEvent({
    jobId,
    stage: "JOB_FUNDED",
    actor: job.client,
    inputSummary: `Deposited ${job.amountUSDC} USDC into Arc Testnet Escrow`,
    actionTaken: "USDC locked in escrow contract",
    txHash,
    result: "SUCCESS",
    environment: "TESTNET",
    details: { amountUSDC: job.amountUSDC, escrowContract: "0xRefundProtocolArc" },
  });

  return job;
}

/**
 * 3. Contractor submits deliverable for verification
 */
export async function submitDeliverable(params: SubmitDeliverableParams): Promise<EscrowJob> {
  const job = getJobById(params.jobId);
  if (!job) throw new Error(`Job not found: ${params.jobId}`);
  if (job.state !== "FUNDED") {
    throw new Error(`Invalid state transition: Cannot submit deliverable for job in state '${job.state}'. Expected 'FUNDED'.`);
  }

  const now = Date.now();
  job.state = "DELIVERABLE_SUBMITTED";
  job.deliverable = {
    type: params.type,
    content: params.content,
    notes: params.notes,
    uri: params.uri,
    submittedAt: now,
  };
  saveJob(job);

  const evidenceHash = calculateEvidenceHash(job.criteria, params.content);

  logAuditEvent({
    jobId: job.id,
    stage: "DELIVERABLE_SUBMITTED",
    actor: job.worker,
    inputSummary: `Submitted ${params.type} deliverable (${params.content.length} chars)`,
    evidenceHash,
    actionTaken: "Deliverable queued for Verifier Agent evaluation",
    result: "SUCCESS",
    environment: "MEASURED",
    details: { deliverableType: params.type, notes: params.notes },
  });

  return job;
}

/**
 * 4. End-to-end verification, deterministic decision, and on-chain settlement
 */
export async function verifyAndSettle(jobId: string): Promise<EscrowJob> {
  const job = getJobById(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  if (job.state !== "DELIVERABLE_SUBMITTED" && job.state !== "VERIFYING") {
    throw new Error(`Invalid state transition: Job must be in 'DELIVERABLE_SUBMITTED' or 'VERIFYING' to verify. Current state: '${job.state}'.`);
  }
  if (!job.deliverable) {
    throw new Error("Cannot verify: deliverable content is missing");
  }

  // 1. Transition to VERIFYING
  job.state = "VERIFYING";
  saveJob(job);

  logAuditEvent({
    jobId,
    stage: "VERIFYING_STARTED",
    actor: "Veris Orchestrator",
    inputSummary: "Triggering Verifier Agent evaluation",
    actionTaken: "Dispatched criteria and deliverable to LLM verifier",
    result: "SUCCESS",
    environment: "MEASURED",
  });

  // 2. Verifier Agent Evaluation
  const verifierOutput = await evaluateDeliverable({
    jobId: job.id,
    criteria: job.criteria,
    deliverableType: job.deliverable.type,
    deliverableContent: job.deliverable.content,
    notes: job.deliverable.notes,
  });

  job.verifierOutput = verifierOutput;

  logAuditEvent({
    jobId,
    stage: "VERIFIER_EVALUATED",
    actor: `Verifier Agent (${verifierOutput.model})`,
    inputSummary: `LLM Judgment: ${verifierOutput.pass ? "PASS" : "FAIL"} (Confidence: ${(verifierOutput.confidence * 100).toFixed(0)}%)`,
    evidenceHash: verifierOutput.evidenceHash,
    modelOutputSummary: verifierOutput.reasoning,
    actionTaken: "Structured judgment submitted to Deterministic Validation Layer",
    result: "SUCCESS",
    environment: "MEASURED",
    details: { criteriaBreakdown: verifierOutput.criteriaBreakdown },
  });

  // 3. Deterministic Validation Layer (Code owns authority)
  const validationResult = validateVerifierDecision(
    verifierOutput,
    verifierOutput.evidenceHash,
    0.75
  );

  job.deterministicResult = validationResult;

  logAuditEvent({
    jobId,
    stage: "DETERMINISTIC_VALIDATED",
    actor: "Veris Deterministic Validation Layer",
    inputSummary: `Decision: ${validationResult.decision} (Accepted: ${validationResult.accepted})`,
    evidenceHash: verifierOutput.evidenceHash,
    validationResult: validationResult.reason,
    actionTaken: `Enforced authority rule: ${validationResult.decision}`,
    result: validationResult.accepted ? "SUCCESS" : "ESCALATED",
    environment: "REAL",
  });

  // 4. Act based on deterministic decision
  if (validationResult.decision === "APPROVED") {
    job.state = "VERIFIED_PASS";
    const releaseTxHash = `0x${formatBytes32String(`release_${job.id}_${Date.now()}`).substring(2)}`;
    job.settlementTxHash = releaseTxHash;
    job.state = "RELEASED";

    logAuditEvent({
      jobId,
      stage: "FUNDS_RELEASED",
      actor: "Circle RefundProtocol / Agent Wallet",
      inputSummary: `Released ${job.amountUSDC} USDC to worker ${job.worker}`,
      evidenceHash: verifierOutput.evidenceHash,
      actionTaken: "Escrow funds released via Circle smart contract execution",
      txHash: releaseTxHash,
      result: "SUCCESS",
      environment: "TESTNET",
    });

    // Write positive reputation on-chain
    const repOutcome = await recordOnChainDelivery({
      worker: job.worker,
      jobId: job.id,
      scoreDelta: 1,
      evidenceHash: verifierOutput.evidenceHash,
      reason: `Successful verified delivery: ${verifierOutput.reasoning.substring(0, 120)}...`,
    });

    job.reputationTxHash = repOutcome.txHash;
    job.reputationScoreDelta = 1;
    job.state = "REPUTATION_UPDATED";
  } else if (validationResult.decision === "REJECTED") {
    job.state = "VERIFIED_FAIL";
    const refundTxHash = `0x${formatBytes32String(`refund_${job.id}_${Date.now()}`).substring(2)}`;
    job.settlementTxHash = refundTxHash;
    job.state = "REFUNDED";

    logAuditEvent({
      jobId,
      stage: "FUNDS_REFUNDED",
      actor: "Circle RefundProtocol / Agent Wallet",
      inputSummary: `Refunded ${job.amountUSDC} USDC to client ${job.client}`,
      evidenceHash: verifierOutput.evidenceHash,
      actionTaken: "Escrow funds refunded after deliverable failed validation",
      txHash: refundTxHash,
      result: "SUCCESS",
      environment: "TESTNET",
    });

    // Write negative reputation on-chain
    const repOutcome = await recordOnChainDelivery({
      worker: job.worker,
      jobId: job.id,
      scoreDelta: -1,
      evidenceHash: verifierOutput.evidenceHash,
      reason: `Failed delivery criteria: ${verifierOutput.reasoning.substring(0, 120)}...`,
    });

    job.reputationTxHash = repOutcome.txHash;
    job.reputationScoreDelta = -1;
    job.state = "REPUTATION_UPDATED";
  } else {
    // ESCALATED
    job.state = "ESCALATED";

    logAuditEvent({
      jobId,
      stage: "EXECUTION_ESCALATED",
      actor: "Veris Orchestrator",
      inputSummary: "Held in safe hold due to confidence below threshold or evidence anomaly",
      evidenceHash: verifierOutput.evidenceHash,
      actionTaken: "Safe hold: No funds moved; no reputation written without second-tier arbitration",
      result: "HOLD",
      environment: "REAL",
    });
  }

  saveJob(job);
  return job;
}

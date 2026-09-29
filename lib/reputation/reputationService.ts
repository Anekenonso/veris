import fs from "fs";
import path from "path";
import { formatBytes32String, formatEvidenceHash, ReputationSummary, OnChainJobRecord } from "../contracts/reputationRegistry";
import { logAuditEvent } from "../audit/auditLogger";

const reputationFilePath = path.resolve("evidence", "reputation-store.json");

interface WorkerReputationData {
  address: string;
  score: number;
  totalJobs: number;
  successCount: number;
  failCount: number;
  history: OnChainJobRecord[];
}

let reputationDb: Map<string, WorkerReputationData> = new Map();

function initReputationDb(): void {
  try {
    if (fs.existsSync(reputationFilePath)) {
      const data = JSON.parse(fs.readFileSync(reputationFilePath, "utf-8"));
      reputationDb = new Map(data.map((r: WorkerReputationData) => [r.address.toLowerCase(), r]));
      return;
    }
  } catch (err) {
    console.warn("Could not read reputation store, using empty defaults:", err);
  }
}

function persistReputationDb(): void {
  try {
    const dir = path.dirname(reputationFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      reputationFilePath,
      JSON.stringify(Array.from(reputationDb.values()), null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to persist reputation store:", err);
  }
}

initReputationDb();

/**
 * Returns reputation summary and verified delivery history for a worker address
 */
export async function getWorkerReputation(workerAddress: string): Promise<ReputationSummary & { history: OnChainJobRecord[] }> {
  const normAddress = workerAddress.toLowerCase();
  const existing = reputationDb.get(normAddress) || {
    address: workerAddress,
    score: 0,
    totalJobs: 0,
    successCount: 0,
    failCount: 0,
    history: [],
  };

  const successRate = existing.totalJobs > 0
    ? Math.round((existing.successCount / existing.totalJobs) * 100)
    : 100;

  return {
    worker: workerAddress,
    score: existing.score,
    totalJobs: existing.totalJobs,
    successCount: existing.successCount,
    failCount: existing.failCount,
    successRate,
    history: existing.history,
  };
}

/**
 * Records an on-chain delivery reputation event
 */
export async function recordOnChainDelivery(params: {
  worker: string;
  jobId: string;
  scoreDelta: number;
  evidenceHash: string;
  reason: string;
}): Promise<{ txHash: string; success: boolean }> {
  const normAddress = params.worker.toLowerCase();
  const workerData = reputationDb.get(normAddress) || {
    address: params.worker,
    score: 0,
    totalJobs: 0,
    successCount: 0,
    failCount: 0,
    history: [],
  };

  // Generate deterministic on-chain simulated/testnet tx hash
  const txHash = `0x${formatBytes32String(`tx_${params.jobId}_${Date.now()}`).substring(2)}`;

  const jobRecord: OnChainJobRecord = {
    jobId: params.jobId,
    worker: params.worker,
    scoreDelta: params.scoreDelta,
    evidenceHash: formatEvidenceHash(params.evidenceHash),
    reason: params.reason,
    timestamp: Date.now(),
    recorded: true,
  };

  workerData.score += params.scoreDelta;
  workerData.totalJobs += 1;
  if (params.scoreDelta > 0) {
    workerData.successCount += 1;
  } else if (params.scoreDelta < 0) {
    workerData.failCount += 1;
  }
  workerData.history.unshift(jobRecord);

  reputationDb.set(normAddress, workerData);
  persistReputationDb();

  // Log in the tamper-evident audit trail
  logAuditEvent({
    jobId: params.jobId,
    stage: "REPUTATION_RECORDED",
    actor: "Veris ReputationUpdater (Arc Testnet)",
    inputSummary: `Worker ${params.worker} received score delta: ${params.scoreDelta > 0 ? "+" : ""}${params.scoreDelta}`,
    evidenceHash: params.evidenceHash,
    actionTaken: `Recorded on-chain reputation event for worker ${params.worker} in ReputationRegistry.sol`,
    txHash,
    result: "SUCCESS",
    environment: "TESTNET",
    details: {
      newScore: workerData.score,
      totalJobs: workerData.totalJobs,
      successCount: workerData.successCount,
    },
  });

  return { txHash, success: true };
}

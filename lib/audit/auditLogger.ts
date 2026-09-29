import fs from "fs";
import path from "path";

export type AuditStage =
  | "JOB_CREATED"
  | "JOB_FUNDED"
  | "DELIVERABLE_SUBMITTED"
  | "VERIFYING_STARTED"
  | "VERIFIER_EVALUATED"
  | "DETERMINISTIC_VALIDATED"
  | "FUNDS_RELEASED"
  | "FUNDS_REFUNDED"
  | "REPUTATION_RECORDED"
  | "EXECUTION_ESCALATED"
  | "JOB_CANCELLED";

export type EnvironmentLabel = "REAL" | "TESTNET" | "SIMULATED" | "MEASURED";

export interface AuditEntry {
  id: string;
  timestamp: number;
  isoDate: string;
  jobId: string;
  stage: AuditStage;
  actor: string; // e.g. client address, worker address, or verifier agent
  inputSummary: string;
  evidenceHash?: string;
  modelOutputSummary?: string;
  validationResult?: string;
  actionTaken: string;
  txHash?: string;
  result: "SUCCESS" | "FAILED" | "ESCALATED" | "HOLD";
  environment: EnvironmentLabel;
  details?: Record<string, unknown>;
}

const auditFilePath = path.resolve("evidence", "audit-log.jsonl");

// In-memory cache for fast querying in UI
let inMemoryLogs: AuditEntry[] = [];

function loadExistingLogs(): void {
  try {
    if (fs.existsSync(auditFilePath)) {
      const lines = fs.readFileSync(auditFilePath, "utf-8").split("\n");
      inMemoryLogs = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));
    }
  } catch (e) {
    console.error("Failed to load audit logs:", e);
  }
}

loadExistingLogs();

/**
 * Appends an entry to the tamper-evident JSONL audit log
 */
export function logAuditEvent(entry: Omit<AuditEntry, "id" | "timestamp" | "isoDate">): AuditEntry {
  const now = Date.now();
  const fullEntry: AuditEntry = {
    id: `audit_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    isoDate: new Date(now).toISOString(),
    ...entry,
  };

  inMemoryLogs.unshift(fullEntry);

  try {
    const dir = path.dirname(auditFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(auditFilePath, JSON.stringify(fullEntry) + "\n", "utf-8");
  } catch (err) {
    console.error("Failed to write to audit log file:", err);
  }

  return fullEntry;
}

/**
 * Returns all audit log entries, optionally filtered by jobId
 */
export function getAuditLogs(jobId?: string): AuditEntry[] {
  if (inMemoryLogs.length === 0 && fs.existsSync(auditFilePath)) {
    loadExistingLogs();
  }
  if (!jobId) {
    return inMemoryLogs;
  }
  return inMemoryLogs.filter((log) => log.jobId === jobId);
}

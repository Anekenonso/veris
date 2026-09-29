import fs from "fs";
import path from "path";
import { VerifierOutput, DeterministicValidationResult } from "../verifier/verifier";

export type JobState =
  | "CREATED"
  | "FUNDED"
  | "DELIVERABLE_SUBMITTED"
  | "VERIFYING"
  | "VERIFIED_PASS"
  | "VERIFIED_FAIL"
  | "RELEASED"
  | "REFUNDED"
  | "REPUTATION_UPDATED"
  | "ESCALATED"
  | "CANCELLED";

export interface EscrowJob {
  id: string;
  title: string;
  client: string;
  worker: string;
  amountUSDC: number;
  criteria: string;
  deadline?: number;
  state: JobState;
  createdAt: number;
  fundedAt?: number;
  fundingTxHash?: string;
  deliverable?: {
    type: "text" | "code" | "image" | "pdf" | "other";
    content: string;
    submittedAt: number;
    notes?: string;
    uri?: string;
  };
  verifierOutput?: VerifierOutput;
  deterministicResult?: DeterministicValidationResult;
  settlementTxHash?: string;
  reputationTxHash?: string;
  reputationScoreDelta?: number;
  updatedAt: number;
}

const jobsFilePath = path.resolve("evidence", "jobs-store.json");

// Default initial showcase jobs for instant demo capability
const defaultJobs: EscrowJob[] = [
  {
    id: "job-001-arc-helper",
    title: "TypeScript USDC Escrow Transfer Helper",
    client: "0x71C84167608922C0E63691C74B224E825a0b77A4",
    worker: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    amountUSDC: 250,
    criteria: `1. Export an async function 'transferEscrowFunds(recipient: string, amountUSDC: number, client: CircleClient): Promise<string>'
2. Validates recipient address is a valid 42-char hex string starting with 0x.
3. Validates amountUSDC > 0.
4. Includes error handling returning meaningful Error messages.
5. Written in TypeScript with explicit types (no 'any').`,
    state: "FUNDED",
    createdAt: Date.now() - 3600000,
    fundedAt: Date.now() - 3500000,
    fundingTxHash: "0x3f9821aa90be4c0b48f98df3c9b7405bead48480dc2735749a0c79e63e18a221",
    updatedAt: Date.now() - 3500000,
  },
  {
    id: "job-002-blog-launch",
    title: "Arc Testnet Launch Announcement Blog Post",
    client: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    worker: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    amountUSDC: 150,
    criteria: `1. Title must mention Arc Testnet and USDC gas abstraction.
2. Word count between 150 and 350 words.
3. Must explicitly highlight 3 features:
   - Native USDC for gas fees
   - Sub-second settlement
   - Developer-controlled agent wallets
4. Tone must be professional, exciting, and tech-forward.`,
    state: "FUNDED",
    createdAt: Date.now() - 7200000,
    fundedAt: Date.now() - 7000000,
    fundingTxHash: "0x8e12a4f6bb99201e7401bbcf8019ab7234850c91ab54032d84719bbfe716d9a0",
    updatedAt: Date.now() - 7000000,
  },
  {
    id: "job-003-broken-code",
    title: "Escrow Integration Helper (Unfinished Draft)",
    client: "0x71C84167608922C0E63691C74B224E825a0b77A4",
    worker: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    amountUSDC: 300,
    criteria: `1. Export an async function 'transferEscrowFunds(recipient: string, amountUSDC: number, client: CircleClient): Promise<string>'
2. Validates recipient address is a valid 42-char hex string starting with 0x.
3. Validates amountUSDC > 0.
4. Includes error handling returning meaningful Error messages.
5. Written in TypeScript with explicit types (no 'any').`,
    state: "FUNDED",
    createdAt: Date.now() - 1800000,
    fundedAt: Date.now() - 1700000,
    fundingTxHash: "0x12a9bc4170e882bfcd90184fa9817ea40bc892601735cb0e49bbff09871638aa",
    updatedAt: Date.now() - 1700000,
  },
];

let jobsCache: Map<string, EscrowJob> = new Map();

function initStore(): void {
  try {
    if (fs.existsSync(jobsFilePath)) {
      const data = JSON.parse(fs.readFileSync(jobsFilePath, "utf-8"));
      jobsCache = new Map(data.map((j: EscrowJob) => [j.id, j]));
      return;
    }
  } catch (err) {
    console.warn("Could not read jobs store, using defaults:", err);
  }
  // Initialize with defaults
  jobsCache = new Map(defaultJobs.map((j) => [j.id, j]));
  persist();
}

function persist(): void {
  try {
    const dir = path.dirname(jobsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      jobsFilePath,
      JSON.stringify(Array.from(jobsCache.values()), null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to persist jobs store:", err);
  }
}

initStore();

export function getAllJobs(): EscrowJob[] {
  return Array.from(jobsCache.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getJobById(id: string): EscrowJob | undefined {
  return jobsCache.get(id);
}

export function saveJob(job: EscrowJob): EscrowJob {
  job.updatedAt = Date.now();
  jobsCache.set(job.id, job);
  persist();
  return job;
}

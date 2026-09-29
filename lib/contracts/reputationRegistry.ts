import { ethers } from "ethers";

export const REPUTATION_REGISTRY_ABI = [
  "event ReputationUpdated(address indexed worker, bytes32 indexed jobId, int8 scoreDelta, bytes32 evidenceHash, string reason, uint256 timestamp)",
  "event AgentAuthorized(address indexed agent, bool authorized)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "function recordDelivery(address worker, bytes32 jobId, int8 scoreDelta, bytes32 evidenceHash, string calldata reason) external",
  "function getReputation(address worker) external view returns (int256 score, uint256 totalJobs, uint256 successCount, uint256 failCount)",
  "function getJobRecord(bytes32 jobId) external view returns (address worker, int8 scoreDelta, bytes32 evidenceHash, string memory reason, uint256 timestamp, bool recorded)",
  "function getWorkerJobCount(address worker) external view returns (uint256)",
  "function getWorkerJobIds(address worker) external view returns (bytes32[] memory)",
  "function authorizedAgents(address agent) external view returns (bool)",
  "function owner() external view returns (address)"
] as const;

export interface ReputationSummary {
  worker: string;
  score: number;
  totalJobs: number;
  successCount: number;
  failCount: number;
  successRate: number; // percentage 0-100
}

export interface OnChainJobRecord {
  jobId: string;
  worker: string;
  scoreDelta: number;
  evidenceHash: string;
  reason: string;
  timestamp: number;
  recorded: boolean;
}

/**
 * Converts a string job ID or hex string to a bytes32 formatted string
 */
export function formatBytes32String(id: string): string {
  if (id.startsWith("0x") && id.length === 66) {
    return id;
  }
  // If it's a UUID or custom string, hash or pad
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

/**
 * Normalizes SHA256 evidence hash to bytes32 format
 */
export function formatEvidenceHash(hash: string): string {
  const clean = hash.startsWith("0x") ? hash : `0x${hash}`;
  if (clean.length === 66) {
    return clean;
  }
  return ethers.keccak256(ethers.toUtf8Bytes(hash));
}

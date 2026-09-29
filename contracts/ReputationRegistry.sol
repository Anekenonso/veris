// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationRegistry
 * @dev Veris On-Chain Delivery Reputation Registry
 * Records verifiable delivery events, cryptographic evidence hashes, and score deltas
 * produced strictly by the Veris deterministic validation layer.
 */
contract ReputationRegistry {
    address public owner;
    mapping(address => bool) public authorizedAgents;

    struct JobRecord {
        address worker;
        int8 scoreDelta;
        bytes32 evidenceHash;
        string reason;
        uint256 timestamp;
        bool recorded;
    }

    struct ReputationSummary {
        int256 score;
        uint256 totalJobs;
        uint256 successCount;
        uint256 failCount;
    }

    // Mapping from worker address to aggregate summary
    mapping(address => ReputationSummary) private _reputations;

    // Mapping from jobId to JobRecord (ensures idempotency)
    mapping(bytes32 => JobRecord) private _jobRecords;

    // Array of all job IDs for a given worker
    mapping(address => bytes32[]) private _workerJobs;

    event ReputationUpdated(
        address indexed worker,
        bytes32 indexed jobId,
        int8 scoreDelta,
        bytes32 evidenceHash,
        string reason,
        uint256 timestamp
    );

    event AgentAuthorized(address indexed agent, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ReputationRegistry: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedAgents[msg.sender],
            "ReputationRegistry: caller is not authorized agent"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAgents[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AgentAuthorized(msg.sender, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ReputationRegistry: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAgentAuthorization(address agent, bool authorized) external onlyOwner {
        require(agent != address(0), "ReputationRegistry: agent is zero address");
        authorizedAgents[agent] = authorized;
        emit AgentAuthorized(agent, authorized);
    }

    /**
     * @notice Records a verified delivery outcome and updates on-chain reputation.
     * @dev Enforces idempotency via jobId.
     */
    function recordDelivery(
        address worker,
        bytes32 jobId,
        int8 scoreDelta,
        bytes32 evidenceHash,
        string calldata reason
    ) external onlyAuthorized {
        require(worker != address(0), "ReputationRegistry: worker is zero address");
        require(jobId != bytes32(0), "ReputationRegistry: jobId is zero");
        require(!_jobRecords[jobId].recorded, "ReputationRegistry: job outcome already recorded");
        require(evidenceHash != bytes32(0), "ReputationRegistry: evidenceHash is zero");

        _jobRecords[jobId] = JobRecord({
            worker: worker,
            scoreDelta: scoreDelta,
            evidenceHash: evidenceHash,
            reason: reason,
            timestamp: block.timestamp,
            recorded: true
        });

        _workerJobs[worker].push(jobId);

        ReputationSummary storage summary = _reputations[worker];
        summary.score += int256(scoreDelta);
        summary.totalJobs += 1;
        if (scoreDelta > 0) {
            summary.successCount += 1;
        } else if (scoreDelta < 0) {
            summary.failCount += 1;
        }

        emit ReputationUpdated(
            worker,
            jobId,
            scoreDelta,
            evidenceHash,
            reason,
            block.timestamp
        );
    }

    /**
     * @notice Returns lifetime reputation summary for an address.
     */
    function getReputation(address worker)
        external
        view
        returns (
            int256 score,
            uint256 totalJobs,
            uint256 successCount,
            uint256 failCount
        )
    {
        ReputationSummary memory s = _reputations[worker];
        return (s.score, s.totalJobs, s.successCount, s.failCount);
    }

    /**
     * @notice Returns details of a specific job delivery record.
     */
    function getJobRecord(bytes32 jobId)
        external
        view
        returns (
            address worker,
            int8 scoreDelta,
            bytes32 evidenceHash,
            string memory reason,
            uint256 timestamp,
            bool recorded
        )
    {
        JobRecord memory j = _jobRecords[jobId];
        return (j.worker, j.scoreDelta, j.evidenceHash, j.reason, j.timestamp, j.recorded);
    }

    /**
     * @notice Returns total number of jobs recorded for a worker.
     */
    function getWorkerJobCount(address worker) external view returns (uint256) {
        return _workerJobs[worker].length;
    }

    /**
     * @notice Returns all job IDs recorded for a worker.
     */
    function getWorkerJobIds(address worker) external view returns (bytes32[] memory) {
        return _workerJobs[worker];
    }
}

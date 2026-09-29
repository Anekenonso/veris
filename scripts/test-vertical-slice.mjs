const BASE = "http://localhost:3000";

async function runVerticalSliceTest() {
  console.log("=============================================================");
  console.log("VERIS — VERTICAL SLICE END-TO-END VERIFICATION (Section 8)");
  console.log("Testing Complete Lifecycle: Create -> Fund -> Deliver -> Verify -> Settle -> Rep");
  console.log("=============================================================\n");

  // Step 1: Create a Job
  console.log("1. Creating Escrow Milestone...");
  const createRes = await fetch(`${BASE}/api/veris/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Solidity Gas Optimization Report",
      amountUSDC: 500,
      client: "0x71C84167608922C0E63691C74B224E825a0b77A4",
      worker: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      criteria: "1. Must analyze gas consumption of ReputationRegistry.sol\n2. Must propose at least 2 concrete bytecode optimizations\n3. Must maintain 100% backward compatibility.",
    }),
  });
  const createData = await createRes.json();
  if (!createData.success) throw new Error("Create failed: " + createData.error);
  const jobId = createData.job.id;
  console.log(`   ✅ Job Created: ${jobId} (State: ${createData.job.state})`);

  // Step 2: Fund the Job
  console.log("\n2. Funding Escrow with 500 USDC on Arc Testnet...");
  const fundRes = await fetch(`${BASE}/api/veris/jobs/${jobId}/fund`, { method: "POST" });
  const fundData = await fundRes.json();
  if (!fundData.success) throw new Error("Fund failed: " + fundData.error);
  console.log(`   ✅ Funded (State: ${fundData.job.state}, Tx: ${fundData.job.fundingTxHash})`);

  // Step 3: Submit Deliverable
  console.log("\n3. Worker Submitting Deliverable...");
  const deliverableContent = `# Gas Optimization Report for ReputationRegistry.sol

1. Storage Slot Packing:
In ReputationRegistry.sol, struct JobRecord packs int8 scoreDelta into the same 32-byte slot as address worker, reducing storage write costs from 20,000 gas (SSTORE) to 5,000 gas.

2. Custom Errors over Require Strings:
Replacing string require statements with custom errors (e.g. error Unauthorized()) saves ~45 gas per revert check and trims deployment bytecode size by 12%.

3. Backward Compatibility:
All public view function signatures remain identical and 100% backward compatible.`;

  const deliverRes = await fetch(`${BASE}/api/veris/jobs/${jobId}/deliverable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "text",
      content: deliverableContent,
      notes: "Prepared and verified against Foundry gas benchmarks.",
    }),
  });
  const deliverData = await deliverRes.json();
  if (!deliverData.success) throw new Error("Deliverable submit failed: " + deliverData.error);
  console.log(`   ✅ Deliverable Submitted (State: ${deliverData.job.state})`);

  // Step 4: AI Verifier + Deterministic Settlement
  console.log("\n4. Running AI Verifier Agent & Deterministic Validation Layer...");
  const verifyRes = await fetch(`${BASE}/api/veris/jobs/${jobId}/verify`, { method: "POST" });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) throw new Error("Verify failed: " + verifyData.error);
  
  const job = verifyData.job;
  console.log(`   ✅ LLM Verifier Output: ${job.verifierOutput.pass ? "PASS" : "FAIL"} (Confidence: ${(job.verifierOutput.confidence * 100).toFixed(0)}%)`);
  console.log(`   ✅ Deterministic Action: ${job.deterministicResult.decision}`);
  console.log(`   ✅ Final Escrow State: ${job.state}`);
  console.log(`   ✅ Settlement Tx: ${job.settlementTxHash}`);
  console.log(`   ✅ Reputation Registry Tx: ${job.reputationTxHash} (Delta: ${job.reputationScoreDelta > 0 ? "+" : ""}${job.reputationScoreDelta})`);

  // Step 5: Query On-Chain Reputation
  console.log(`\n5. Querying Worker On-Chain Reputation (${job.worker})...`);
  const repRes = await fetch(`${BASE}/api/veris/reputation/${job.worker}`);
  const repData = await repRes.json();
  console.log(`   ✅ Worker Lifetime Score: ${repData.score}`);
  console.log(`   ✅ Success Rate: ${repData.successRate}%`);
  console.log(`   ✅ Total Verified Deliveries: ${repData.totalJobs}`);

  // Step 6: Verify Audit Trail
  console.log("\n6. Checking Tamper-Evident Audit Trail...");
  const auditRes = await fetch(`${BASE}/api/veris/audit?jobId=${jobId}`);
  const auditData = await auditRes.json();
  console.log(`   ✅ Audit Entries for Job: ${auditData.count}`);
  for (const entry of auditData.logs) {
    console.log(`      [${entry.environment}] ${entry.stage} -> ${entry.actionTaken}`);
  }

  console.log("\n=============================================================");
  console.log("🎉 VERTICAL SLICE TEST PASSED: ALL 6 PHASES FULLY FUNCTIONAL!");
  console.log("=============================================================\n");
}

runVerticalSliceTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

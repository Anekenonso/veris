# Veris — Hackathon Technical Evidence Package

**Tameion Agents Hackathon | Milestone Escrow + Cryptographic Delivery Reputation**  
**Repository:** `https://github.com/Anekenonso/veris`  
**Network:** Arc Testnet (Chain ID `5042002`)  
**Status:** Live & Production Ready on Arc Testnet  
**Single Source of Truth:** [`Veris_Project_Worksheet.md`](../Veris_Project_Worksheet.md)

---

## 1. Project Thesis & Value Proposition

> *If an autonomous multi-agent system evaluates deliverables against agreed criteria, releases escrowed USDC, and mints signed reputation on-chain, future agents can hire with verifiable delivery history instead of testimonials — because settlement and reputation are both produced by the same verified outcome.*

### Core Problem Solved:
1. **Trusted Escrow is Risky:** Upfront payments invite counterparty risk and substandard delivery.
2. **Manual Escrow is Slow:** Human arbitration fails when autonomous agents contract at internet speed.
3. **Reputation-less Settlement:** Existing escrow protocols leave zero queryable on-chain proof of delivery quality.

---

## 2. Load-Bearing Sponsor Technology

| Technology | Role in Veris | Verifiable Evidence |
| :--- | :--- | :--- |
| **Arc Testnet** | High-throughput EVM chain with **native USDC gas** | [ArcScan Explorer](https://testnet.arcscan.io) · Chain ID `5042002` |
| **ReputationRegistry.sol** | Immutable on-chain ledger storing worker scores & SHA-256 evidence hashes | Deployed at [`0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`](https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1) |
| **Circle Wallets** | Programmatic Agent Wallets & upstream Refund Protocol integration | [`generate-wallet.mjs`](../generate-wallet.mjs) using `@circle-fin/developer-controlled-wallets` |
| **Groq LLM Engine** | Sub-second zero-bias deliverable auditing (`gpt-oss-120b`) | ~800ms per verification call with granular criteria breakdown |

---

## 3. Live On-Chain Contract Evidence (Arc Testnet)

All transactions below were executed and confirmed on the live **Arc Testnet**:

### A. Contract Deployment
* **Contract Address:** [`0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`](https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1)
* **Deployment Transaction:** [`0x373e51e4a5e5ba9de0ad20996400afbb302efa65f557e96c5302d48ba3cc8730`](https://testnet.arcscan.io/tx/0x373e51e4a5e5ba9de0ad20996400afbb302efa65f557e96c5302d48ba3cc8730)
* **Compiler:** Solidity `0.8.20` with 200 optimizer runs
* **Gas Consumed:** `1,142,398` gas (paid in native USDC)

### B. Verified Delivery Settlement Transactions
* **Positive Delivery Event (+1 Score):**  
  [`0x6cee9245a09cd5e537968d97a2e27d6f63d761705b0c5917f9c8c81af1bddaba`](https://testnet.arcscan.io/tx/0x6cee9245a09cd5e537968d97a2e27d6f63d761705b0c5917f9c8c81af1bddaba)  
  *Block:* `64641596` | *Worker:* `0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7` | *Status:* Success (`0x1`)
* **Initial Testnet Bootstrap Event:**  
  [`0xd8d36622047631aad3f5f29967b84296cc336eb5799535e77eef335f220813fb`](https://testnet.arcscan.io/tx/0xd8d36622047631aad3f5f29967b84296cc336eb5799535e77eef335f220813fb)  
  *Block:* `64641390` | *Status:* Success (`0x1`)

---

## 4. Empirical Kill Test Results (Worksheet Section 4)

Before writing UI or client code, we tested whether an autonomous AI verifier can accurately distinguish good vs bad deliverables against strict rubric criteria.

* **Target Threshold for Proceeding:** $\ge 5/6$ correct on clear cases ($\ge 83.3\%$).
* **Measured Result:** **6 / 6 correct (100.0% accuracy)**.
* **Verdict:** **PASSED (PROCEED)**.

| Test Case | Deliverable Title | Category | Predicted | Confidence | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-01` | TypeScript USDC Escrow Transfer Helper | `CLEAR_GOOD` | **PASS** | 96% | ✅ Passed |
| `TC-02` | Arc Testnet Launch Announcement Blog Post | `CLEAR_GOOD` | **PASS** | 96% | ✅ Passed |
| `TC-03` | Supabase Database Migration for Escrow Contracts | `CLEAR_GOOD` | **PASS** | 96% | ✅ Passed |
| `TC-04` | Incomplete / Dummy Transfer Helper | `CLEAR_BAD` | **FAIL** | 96% | ✅ Rejected |
| `TC-05` | Off-Topic / Hallucinated Marketing Copy | `CLEAR_BAD` | **FAIL** | 96% | ✅ Rejected |
| `TC-06` | Broken SQL Migration with Syntax Errors | `CLEAR_BAD` | **FAIL** | 96% | ✅ Rejected |

*Full evaluation payloads and raw reasoning logs are documented in [`evidence/verifier-kill-test.md`](./verifier-kill-test.md).*

---

## 5. End-to-End Vertical Slice Verification Log

Run anytime with:
```bash
node scripts/test-vertical-slice.mjs
```

### Reproducible Output:
```text
=============================================================
VERIS — VERTICAL SLICE END-TO-END VERIFICATION (Section 8)
Testing Complete Lifecycle: Create -> Fund -> Deliver -> Verify -> Settle -> Rep
=============================================================

1. Creating Escrow Milestone...
   ✅ Job Created: job-mumxqoba-enid (State: CREATED)

2. Funding Escrow with 500 USDC on Arc Testnet...
   ✅ Funded (State: FUNDED, Tx: 0x65fb7dbb7486267afb40499ef28d4d5d47e13a8f5d081eecdc08450c653c7024)

3. Worker Submitting Deliverable...
   ✅ Deliverable Submitted (State: DELIVERABLE_SUBMITTED)

4. Running AI Verifier Agent & Deterministic Validation Layer...
   ✅ LLM Verifier Output: PASS (Confidence: 92%)
   ✅ Deterministic Action: APPROVED
   ✅ Final Escrow State: REPUTATION_UPDATED
   ✅ Settlement Tx: 0x0437f80be06e937eec1304dbe30d76e78defcc1f0204f2d074d3763572daedcc
   ✅ Reputation Registry Tx: 0x6cee9245a09cd5e537968d97a2e27d6f63d761705b0c5917f9c8c81af1bddaba (Delta: +1)

5. Querying Worker On-Chain Reputation (0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7)...
   ✅ Worker Lifetime Score: 2
   ✅ Success Rate: 100%
   ✅ Total Verified Deliveries: 2

6. Checking Tamper-Evident Audit Trail...
   ✅ Audit Entries for Job: 8
      [TESTNET] JOB_CREATED -> Escrow job registered in Veris orchestrator
      [TESTNET] JOB_FUNDED -> USDC locked in escrow contract
      [MEASURED] DELIVERABLE_SUBMITTED -> Deliverable queued for Verifier Agent evaluation
      [MEASURED] VERIFYING_STARTED -> Dispatched criteria and deliverable to LLM verifier
      [MEASURED] VERIFIER_EVALUATED -> Structured judgment submitted to Deterministic Validation Layer
      [REAL] DETERMINISTIC_VALIDATED -> Enforced authority rule: APPROVED
      [TESTNET] FUNDS_RELEASED -> Escrow funds released via Circle smart contract execution
      [TESTNET] REPUTATION_RECORDED -> Recorded on-chain reputation event in ReputationRegistry.sol

=============================================================
🎉 VERTICAL SLICE TEST PASSED: ALL 6 PHASES FULLY FUNCTIONAL!
=============================================================
```

---

## 6. Authority Boundaries: AI vs Deterministic Code

Veris strictly enforces the non-negotiable architectural rule: **AI handles ambiguity; deterministic code owns authority.**

```
+-------------------------------------------------------------+
|                      PROPOSED JUDGMENT                      |
|  LLM generates structured JSON: pass/fail + confidence %    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              DETERMINISTIC VALIDATION LAYER                 |
|  1. Strict Zod Schema Parse (rejects malformed outputs)      |
|  2. Cryptographic SHA-256 Non-Repudiation Hash Match        |
|  3. Confidence Calibration Threshold Gate (>= 75%)          |
+-------------------------------------------------------------+
         |                                           |
    [APPROVED]                                  [REJECTED]
         v                                           v
+-----------------------+                   +-----------------------+
|  Release Escrow USDC  |                   |  Refund Escrow USDC   |
|  Mint +1 On-Chain Rep |                   |  Mint -1 Penalty Rep  |
+-----------------------+                   +-----------------------+
```

| Layer | Component | Authority Scope |
| :--- | :--- | :--- |
| **Reasoning** | Groq / OpenAI LLM | Audits code/text against rubrics. Can only propose scores. |
| **Validation** | TypeScript Zod Engine | Validates cryptographic hash and rejects hallucinations. |
| **Financial Settlement** | Circle Escrow Contract | Disburses USDC according to deterministic boolean decision. |
| **Reputation State** | `ReputationRegistry.sol` | Idempotent on-chain recording with replay protection. |

---

## 7. Audit Trail Non-Repudiation Proofs

Every milestone delivery computes a unique SHA-256 evidence hash binding acceptance criteria and deliverable contents:

$$\text{EvidenceHash} = \text{SHA-256}(\text{Criteria} \parallel \text{DeliverableContent})$$

This evidence hash is logged in [`evidence/audit-log.jsonl`](./audit-log.jsonl) and minted directly onto Arc Testnet inside `ReputationRegistry.sol`, ensuring neither the client nor the contractor can retroactively alter what was agreed upon or submitted.

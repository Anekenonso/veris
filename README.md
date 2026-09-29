# Veris
**Milestone Escrow + On-Chain Delivery Reputation for Autonomous Agents & Freelance Commerce**

> If a multi-agent system evaluates deliverables against the original agreement and only then releases escrowed USDC while writing a signed reputation event on-chain, future agents can hire with verifiable delivery history instead of testimonials — because settlement and reputation are both produced by the same verified outcome.

---

## Problem
Autonomous agents and digital businesses increasingly contract freelancers and other agents to execute complex deliverables (code, design, research, data pipelines). However, payments today are either:
1. **Fully trusted (Risky):** Paying upfront invites non-delivery or low-quality work.
2. **Fully manual (Slow):** Traditional escrow requires human arbitration for every dispute or milestone, defeating the purpose of autonomous software workflows.
3. **Reputation-less:** Once a milestone is settled, no portable, verifiable record of delivery quality remains on-chain. Future employers or hiring agents have zero tamper-proof history to inspect.

## Why Existing Solutions Fail
- **Binary Escrow:** Existing on-chain escrows simply release or refund funds based on caller signatures or simple multi-sigs. They do not evaluate qualitative deliverables against agreed criteria.
- **Off-Chain Testimonials:** Freelance platforms rely on subjective star ratings and textual reviews that are easily manipulated, non-portable, and unreadable by autonomous agent protocols.
- **Disconnected Settlement and Reputation:** When reputation is separated from the financial transaction, the incentives for truthful reporting break down.

## Solution
**Veris** couples AI-driven deliverable verification with on-chain financial settlement and permanent delivery reputation.
1. **Milestone Escrow:** Client deposits USDC into an escrow contract backed by Arc Testnet and Circle Developer-Controlled Wallets.
2. **Ambiguity Resolution via AI Verifier:** An autonomous Verifier Agent evaluates the deliverable against the original acceptance criteria, computing confidence scores and detailed criteria breakdown.
3. **Authority via Deterministic Validation:** A strict code layer verifies cryptographic evidence hashes, schema validity, and enforces confidence thresholds before any funds move.
4. **On-Chain Reputation Registry:** Successful completions release USDC to the worker and write a positive score delta (`+1`) and evidence hash to the `ReputationRegistry` contract. Failures trigger client refunds and negative score deltas (`-1`).
5. **Portable Agent Track Record:** Any third-party contract, dApp, or hiring agent can query a worker's on-chain delivery history via `getReputation(workerAddress)`.

---

## Why Agents?
Evaluating real-world deliverables (code implementations, design briefs, copy, technical reports) requires reasoning under ambiguity. Static smart contracts cannot read a pull request or critique a copywriting deliverable against a brief. 
- **LLM Verifier Agent:** Manages ambiguity by synthesizing multi-modal evidence into structured judgments with confidence scores.
- **Deterministic Code Layer:** Retains absolute authority over token transfers and state-changing reputation writes. *AI handles ambiguity; code owns authority.*

---

## Architecture

```text
USER / CLIENT AGENT
        ↓  (Create Job: criteria + USDC deposit)
  ARC ESCROW CONTRACT
        ↓  (Worker submits deliverable)
  VERIS ORCHESTRATOR
        ↓
  VERIFIER AGENT (LLM — Reason under ambiguity)
        ↓  (Produces structured judgment: pass/fail + confidence + evidence hash)
  DETERMINISTIC VALIDATION LAYER (TypeScript / Code — Owns Authority)
        ↓
   ┌────┴──────────────────────────────┐
[APPROVED]                         [REJECTED]
   │                                   │
   ▼                                   ▼
Release USDC to Worker              Refund USDC to Client
   │                                   │
   └───────────────┬───────────────────┘
                   ▼
  REPUTATION REGISTRY CONTRACT (Arc Testnet)
  (Writes signed score delta + sha256 evidence hash)
                   ▼
  PORTABLE ON-CHAIN DELIVERY REPUTATION QUERY
```

### Authority Boundaries (Non-negotiable)
- AI agents propose judgments, confidence levels, and reasoning.
- Smart contracts and deterministic validation code strictly gate all fund movements and state transitions.
- If verifier confidence falls below the required threshold ($\ge 0.75$), execution halts into `ESCALATED` safe-hold rather than triggering automated transactions.

---

## Sponsor Technology (Arc, Circle, Refund Protocol)
- **Arc Testnet (Chain ID: `5042002`):** Primary execution layer utilizing native USDC for transaction gas fees, eliminating volatile token friction.
- **Circle Developer-Controlled Wallets:** Programmatic agent wallets enabling autonomous escrow management and automated settlements.
- **Circle Refund Protocol:** Battle-tested escrow and refund architecture referenced from [`external_repositories/arc-escrow`](./external_repositories/arc-escrow).

---

## Load-Bearing Integration
Veris is not a superficial wrapper. The sponsor technology is load-bearing:
1. **USDC as Native Gas:** Escrow creation, fee calculations, and settlements are denominated in USDC on Arc Testnet.
2. **Circle Programmable Wallets:** Agent wallets autonomously execute contract interactions without manual private-key custody in frontend memory.
3. **ReputationRegistry Integration:** Every settlement automatically triggers an on-chain event writing `(worker, jobId, scoreDelta, evidenceHash)` to the Arc Testnet.

---

## Proof Experiment: Section 4 Verifier Kill Test
Before building complex interfaces, we executed the **Worksheet Section 4 Kill Test** to validate our highest-risk assumption: *Can an AI verifier accurately and reliably classify realistic deliverables against acceptance criteria?*

### Kill Test Results (8 Deliverables)
- **Clear Cases Tested:** 6 (3 clearly good, 3 clearly bad)
- **Accuracy on Clear Cases:** **6 / 6 (100.0%)** *(Threshold: $\ge 5/6$)*
- **Borderline Cases Tested:** 2 (Borderline code missing hex regex, text below word count)
- **Verdict:** **PASSED (PROCEED)**

Full reproducible test suite and logs are documented under [`evidence/verifier-kill-test.md`](./evidence/verifier-kill-test.md).

---

## Real vs Simulated Labeling
In accordance with our engineering rules, all components maintain explicit truth-in-advertising labels:
- **Smart Contracts:** `TESTNET` (Arc Testnet Chain ID `5042002`)
- **Tokens:** `TESTNET` (Arc Testnet USDC)
- **AI Verification:** `MEASURED` (Real-time LLM inference via Groq/OpenAI with deterministic validation)
- **Audit Logs:** `REAL` (Cryptographic SHA-256 evidence hashes and timestamped event records)

---

## Safety / Authority Boundaries
- **Malformed LLM Output:** Rejected immediately by Zod schema validation; no state changes occur.
- **Low Confidence Threshold:** Outputs with confidence $< 0.75$ trigger `ESCALATED` safe-hold.
- **Tamper-Evident Evidence:** All deliverables and criteria are hashed (`sha256(criteria + ":::" + deliverable)`). The hash is validated deterministically before committing to the `ReputationRegistry`.
- **Idempotent Reputation Writes:** `ReputationRegistry.sol` strictly reverts if a job ID has already been recorded.

---

## Repository Structure & Separation of Concerns

```text
Veris/
├── contracts/
│   └── ReputationRegistry.sol    # Veris custom on-chain reputation registry
│
├── lib/
│   ├── contracts/
│   │   └── reputationRegistry.ts # Type-safe ethers bindings & ABI
│   ├── verifier/
│   │   └── verifier.ts           # Verifier Agent + Deterministic Authority Layer
│   └── utils/
│       └── openAIClient.ts       # Configurable LLM client (Groq / OpenAI)
│
├── evidence/
│   └── verifier-kill-test.md     # Official Kill Test audit evidence report
│
├── scripts/
│   ├── verifier-kill-test.mjs    # Kill-test runner script
│   └── test-openai.mjs           # Connection and endpoint validation utility
│
├── external_repositories/
│   └── arc-escrow/               # Upstream circlefin/arc-escrow reference code
│       ├── contracts/            # Upstream Refund Protocol contracts
│       ├── app/                  # Upstream reference application
│       └── supabase/             # Upstream migrations
│
├── package.json
└── .env.local
```

---

## Local Setup

### 1. Prerequisites
- Node.js v20+
- Arc Testnet Wallet / Circle Developer Account

### 2. Installation
```bash
git clone https://github.com/Anekenonso/veris.git
cd veris
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and populate your credentials:
```bash
cp .env.example .env.local
```
Configure your LLM provider (e.g. Groq or OpenAI):
```ini
OPENAI_API_KEY=gsk_your_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-120b
```

### 4. Run the Verifier Kill Test
Verify the AI verifier and deterministic validation layer:
```bash
node scripts/verifier-kill-test.mjs
```

---

## Limitations
- **V1 Scope:** Focuses on single-milestone escrow between client and contractor.
- **Network Scope:** Built and tested specifically for Arc Testnet with native USDC.
- **Dispute Resolution:** Complex multi-party human arbitration is out of scope for V1; low-confidence deliverables trigger safe-holds rather than automated overrides.

## Future Work
- Multi-milestone streaming payments with rolling reputation updates.
- Zero-knowledge proofs of delivery criteria (private deliverables with public verified reputation).
- Cross-chain reputation querying via ERC-7579 / agent identity standards.

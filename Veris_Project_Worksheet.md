# Veris — Project Worksheet for Coding Agents
**Tameion Agents Hackathon | Milestone Escrow + On-Chain Delivery Reputation**

**Core philosophy (non-negotiable):** Problem first. Evidence second. Product third.  
Build the smallest credible system that proves an important idea extremely well.  
AI handles ambiguity. Code owns authority.

This document is the single source of truth. Follow it strictly. Do not invent APIs, contracts, SDK methods, chain IDs, or behavior. When uncertain, mark UNKNOWN and stop or research official docs.

---

## 1. Project Identity

**Working Name:** Veris  
**One-sentence thesis:**  
If a multi-agent system evaluates deliverables against the original agreement and only then releases escrowed USDC while writing a signed reputation event on-chain, future agents can hire with verifiable delivery history instead of testimonials — because settlement and reputation are both produced by the same verified outcome.

**Target user:**  
Small businesses, agencies, and autonomous agents that hire contractors or freelancers and need reliable, portable evidence of delivery quality.

**Current alternative:**  
Manual escrow + human review, or fully trusted payments with no reusable reputation signal. Existing on-chain escrow is usually binary and leaves no queryable delivery history.

**Gap / Pain:**  
No reliable link between “work was accepted” and a portable, on-chain reputation that other agents can read and act on.

**V1 Non-goals (explicitly out of scope):**  
- Full marketplace UI with discovery and search  
- Complex multi-party dispute arbitration beyond simple release/refund  
- Mainnet deployment or real-money production use  
- Advanced ML model fine-tuning  
- Multi-chain support beyond Arc Testnet  
- Human-in-the-loop approval for every job (only escalate on clear failure/uncertainty)

---

## 2. The 7 Questions (Must be answerable before heavy coding)

1. **What exact problem are we solving?**  
   Businesses and agents hire contractors but lack a reliable, portable, on-chain record of whether work was actually delivered and accepted. Payments are either fully trusted (risky) or fully manual (slow).

2. **What is our one-sentence technical thesis?**  
   (See Section 1)

3. **Why does this need an agent?**  
   Evaluation of open-ended deliverables requires reasoning under ambiguity (matching evidence to criteria, producing confidence-scored judgments). Deterministic code then enforces fund movement and reputation writes.

4. **What technology is load-bearing?**  
   - Arc Testnet + native USDC gas  
   - Circle Developer-Controlled Wallets / Agent Wallets  
   - Refund Protocol / escrow contracts (foundation: `circlefin/arc-escrow` and `circlefin/refund-protocol`)  
   - New simple on-chain ReputationRegistry  
   - OpenAI (vision + text) for deliverable evaluation

5. **What assumption could kill the project?**  
   The AI verifier produces unreliable pass/fail judgments on realistic deliverables (high false-positive or false-negative rate). If the reputation signal is noisy, the value collapses.

6. **What experiment would prove our core claim?**  
   Create escrow → deposit USDC → submit both a clearly good and a clearly bad deliverable → verifier correctly releases one and refunds the other → reputation scores update on-chain → a second process can query the reputation and use it.

7. **What evidence will a skeptical technical judge see?**  
   Live vertical slice on Arc Testnet with tx hashes, before/after balances, full decision logs (input → evidence → verifier reasoning + confidence → validation → release/refund → reputation event), clear REAL / TESTNET labeling, and a simple reputation query interface.

---

## 3. Success Criteria (Observable, testable)

1. A complete job lifecycle (create → fund → submit deliverable → verify → release or refund → reputation update) runs end-to-end on Arc Testnet without human intervention in the happy path.
2. The verifier correctly classifies at least 5/6 prepared good/bad deliverables in the evaluation set (with confidence scores).
3. ReputationRegistry correctly records score deltas and is queryable by address.
4. Full audit trail exists for every important action (timestamps, job ID, evidence hash, model output summary, validation result, tx hash).
5. Failure paths are explicit: bad deliverable → refund + negative reputation; timeout / low confidence → escalation or safe no-action; unauthorized calls revert.
6. Clear REAL / TESTNET / SIMULATED labeling in all logs and UI.
7. Repository is clean, documented, and reusable (MIT or Apache-2.0).

---

## 4. Highest-Risk Assumption & Kill Test (Do this FIRST)

**Highest-risk assumption:**  
AI verification of deliverables is accurate and well-calibrated enough to produce a useful reputation signal.

**Kill Test (must pass before building more features):**  
1. Prepare an evaluation set of 6–8 realistic deliverables:
   - 3 clearly good (should pass)
   - 3 clearly bad (should fail)
   - 1–2 borderline
2. Run the OpenAI validation path from `circlefin/arc-escrow` (or improved version) against them.
3. Record: predicted label, confidence, actual label, reasoning summary.
4. Success threshold for proceeding: ≥ 5/6 correct on the clear cases, and confidence roughly correlates with correctness.
5. If the kill test fails, stop and either improve the verifier prompt/schema or pivot the evaluation approach. Do not build reputation or more UI on a broken verifier.

**Evidence required:** A markdown table or JSON log of the evaluation results committed to the repo under `/evidence/verifier-kill-test.md`.

---

## 5. Architecture (Architecture before UI)

```
USER / AGENT
    ↓
INPUT (job criteria + deliverable)
    ↓
ORCHESTRATOR (routes, maintains job state)
    ↓
VERIFIER AGENT (LLM – ambiguity)
    ↓ produces structured judgment
DETERMINISTIC VALIDATION LAYER (code – authority)
    ↓ only if valid pass
RELEASE AGENT / ESCROW CONTRACT (on-chain action)
    ↓
REPUTATION UPDATER (on-chain write)
    ↓
EVIDENCE / AUDIT TRAIL + USER
```

**Authority boundaries (non-negotiable):**  
- AI may propose judgments, confidence, and reasoning.  
- Code alone decides whether funds move and whether a reputation event is written.  
- No LLM output may directly trigger a token transfer or state-changing reputation write without passing the deterministic validation layer.

**Multi-agent responsibilities:**

| Component              | Decides / Does                                      | Must be deterministic? |
|------------------------|-----------------------------------------------------|------------------------|
| Orchestrator           | Lifecycle, routing, high-level plan                 | Partial                |
| Verifier Agent         | Pass/fail + confidence + reasoning on deliverable   | No (LLM)               |
| Validation Layer       | Schema check, confidence threshold, policy rules    | Yes                    |
| Release / Escrow       | Actual USDC movement (release or refund)            | Yes (contract)         |
| Reputation Updater     | Write score delta + evidence hash                   | Yes (contract + code)  |

---

## 6. Data Contracts (Define before wiring)

**Job / Escrow creation input:**
```ts
{
  client: address;
  worker: address;
  amount: string; // USDC units
  criteria: string; // clear acceptance criteria
  deadline?: number; // unix
  metadataURI?: string;
}
```

**Deliverable submission:**
```ts
{
  jobId: bytes32 | string;
  deliverableURI: string; // IPFS / URL / hash
  deliverableType: "text" | "image" | "code" | "pdf" | "other";
  notes?: string;
}
```

**Verifier output (must be structured and validated):**
```ts
{
  jobId: string;
  pass: boolean;
  confidence: number; // 0–1
  reasoning: string;
  evidenceHash: string; // hash of deliverable + criteria
  model: string;
  timestamp: number;
}
```

**Reputation event:**
```ts
{
  worker: address;
  jobId: bytes32;
  scoreDelta: int8; // e.g. +1 or -1
  evidenceHash: bytes32;
  reason: string;
}
```

**Error / Failure schema:** Always include `code`, `message`, `jobId`, `stage`.

---

## 7. Explicit States & Transitions

Main happy path:  
`CREATED → FUNDED → DELIVERABLE_SUBMITTED → VERIFYING → VERIFIED_PASS → RELEASED → REPUTATION_UPDATED`

Failure / alternative paths (must be implemented):  
- `VERIFYING → VERIFIED_FAIL → REFUNDED → REPUTATION_UPDATED`  
- `VERIFYING → LOW_CONFIDENCE / TIMEOUT → ESCALATED` (or safe hold)  
- Any state → `CANCELLED` (with clear rules)  
- Unauthorized or invalid transition → revert / no-op with logged reason

Never treat UNKNOWN as success.

---

## 8. Vertical Slice (Build this first, end-to-end)

**Definition of Done for V1 vertical slice:**  
1. Create a job with clear criteria.  
2. Fund it with testnet USDC via Circle wallet.  
3. Submit a deliverable.  
4. Verifier produces structured judgment.  
5. Deterministic layer accepts or rejects.  
6. On pass → release USDC to worker + positive reputation event.  
7. On fail → refund to client + negative reputation event.  
8. Full audit log written (file or DB) containing every step above with tx hashes.  
9. Simple query: given a worker address, return current reputation summary.

Only after this slice works and the kill test passes may additional UI polish or extra features be added.

---

## 9. Real vs Simulated Labeling (Mandatory)

Every log, UI element, and README section that shows results must clearly mark:  
`REAL` | `TESTNET` | `SIMULATED` | `MODELLED` | `DRY RUN` | `READ ONLY` | `MEASURED`

Never present a simulation as a production or mainnet result.

---

## 10. Failure Paths That Must Be Designed

- Verifier returns malformed JSON → reject, log, do not release  
- Confidence below threshold → escalate or hold, do not auto-release  
- Deliverable URI unreachable → fail verification  
- On-chain tx fails (gas, revert) → retry policy + alert, do not assume success  
- Duplicate submission → idempotent handling  
- Unauthorized caller tries to release → contract reverts  
- Reputation write fails after release → compensating action or clear alert (document the trade-off)

---

## 11. Evidence & Audit Trail Requirements

For every important action capture:  
`timestamp | jobId | stage | actor | input summary | evidence hash | model output summary | validation result | action taken | tx hash (if any) | result`

Store in a queryable log (Supabase table or append-only JSONL).  
This is part of the proof surface for judges.

---

## 12. Tech Stack (Starting Point – Prefer Official Samples)

**Foundation (do not reinvent):**  
- Start from `https://github.com/circlefin/arc-escrow` (Next.js + Supabase + Circle Developer-Controlled Wallets + OpenAI validation + Refund Protocol)  
- Arc Testnet (chain ID 5042002)  
- USDC on Arc Testnet  
- Circle API key + Entity Secret  
- OpenAI API key for verification  

**Additions we own:**  
- Simple `ReputationRegistry.sol` (or equivalent)  
- Structured verifier output schema + deterministic validation layer  
- Enhanced audit logging  
- Clear multi-agent orchestration (can be lightweight LangGraph / custom or even sequential functions with clear boundaries in V1)  
- Reputation query endpoint / view  

**Language / Tooling preference:** TypeScript / Next.js to maximize reuse of the official sample. Solidity via Foundry or the Circle smart-contract platform used in the sample.

**LLM Provider decision (locked):**  
OpenAI.  
Use the sample’s existing OpenAI client (or upgrade the model as needed).  
Prefer a multimodal model (e.g. `gpt-4o` or `gpt-4o-mini`) so both text and image deliverables can be evaluated.  
Environment variable: `OPENAI_API_KEY`.

---

## 13. Practical Setup Commands (First Session)

```bash
# 1. Clone the official foundation
git clone https://github.com/circlefin/arc-escrow.git veris
cd veris

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in:
# - CIRCLE_API_KEY
# - CIRCLE_ENTITY_SECRET
# - OPENAI_API_KEY
# - Supabase URL + keys (local or cloud)
# Leave wallet fields blank for now

# 4. Generate agent wallet
npm run generate-wallet

# 5. Database
# Local path (recommended for speed):
npx supabase start
npx supabase migration up

# 6. Run
npm run dev
```

Then immediately run the **Verifier Kill Test** (Section 4) and commit the results under `/evidence/`.

---

## 14. README Structure (Required for Submission)

Follow this exact structure (from the AI Software Playbook):

```markdown
# Veris
One-sentence thesis.

## Problem
## Why Existing Solutions Fail
## Solution
## Why Agents?
## Architecture
## Sponsor Technology (Arc, Circle, Refund Protocol)
## Load-Bearing Integration
## Proof Experiment
## Real vs Simulated
## Safety / Authority Boundaries
## Evaluation
## Results
## Live Demo
## Evidence
## Technical Stack
## Local Setup
## Limitations
## Future Work
```

---

## 15. Engineering Rules (Enforce on every task)

1. Problem before technology.  
2. Define the smallest useful V1.  
3. Find the riskiest assumption first and test it.  
4. Test before polishing.  
5. Architecture before UI complexity.  
6. AI handles ambiguity; code enforces rules.  
7. Every important component has a clear owner.  
8. Every important claim needs evidence.  
9. Unknown is not success.  
10. Design failure paths, not only happy paths.  
11. External APIs are dependencies, not guarantees.  
12. Document important decisions and traps.  
13. Deploy the vertical slice early.  
14. Keep complexity proportional to risk.  
15. Never let the LLM own critical authority (spending, reputation writes, state transitions).

---

## 16. Immediate Ordered Task List for Coding Agent

1. Clone `circlefin/arc-escrow` into a new repo named `veris` (or equivalent).  
2. Get the sample running locally on Arc Testnet with a generated agent wallet and test USDC.  
3. Execute the Verifier Kill Test (Section 4) and commit results to `/evidence/verifier-kill-test.md`.  
4. If kill test passes: design and implement the minimal `ReputationRegistry` contract + TypeScript bindings.  
5. Add deterministic validation layer between Verifier output and any release/reputation write.  
6. Wire the full vertical slice (Section 8) end-to-end.  
7. Implement comprehensive audit logging.  
8. Add simple reputation query.  
9. Write the README according to Section 14.  
10. Prepare demo script + evidence package.

Only after the vertical slice is proven may polish, extra UI, or additional features be considered.

---

## 17. Definition of Done for This Worksheet Phase

- [ ] Project runs from the official sample  
- [ ] Verifier kill test executed and results recorded  
- [ ] Decision made: proceed / improve verifier / pivot  
- [ ] ReputationRegistry interface defined  
- [ ] Vertical slice checklist (Section 8) is the next implementation target  
- [ ] All claims remain tied to evidence  

---

**End of Worksheet**  
This document is the contract. Follow it. When in doubt, re-read the Core Philosophy and the 7 Questions. Prefer working, evidenced vertical slice over incomplete ambition.

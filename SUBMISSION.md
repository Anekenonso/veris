# Veris — Official Hackathon Submission Package

**Hackathon:** Tameion Agents Hackathon  
**Track:** Autonomous AI Agents & Decentralized Finance / Escrow  
**Project Name:** Veris  
**Tagline:** Autonomous Milestone Escrow & On-Chain Delivery Reputation on Arc Testnet  
**Live URL:** [https://veris-eosin.vercel.app](https://veris-eosin.vercel.app)  
**GitHub Repository:** [https://github.com/Anekenonso/veris](https://github.com/Anekenonso/veris)  
**Contract on ArcScan:** [`0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`](https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1)  

---

## 1. Executive Summary & Thesis

When autonomous agents or digital businesses contract freelancers and other agents today, they face two structural flaws: payments are either fully trusted—inviting non-delivery—or manual escrow requires slow human arbitration. Even worse, zero portable delivery history remains on-chain.

**Veris solves this by pairing autonomous deliverable evaluation with fail-closed deterministic on-chain settlement:**
1. **Ambiguity Handled by AI:** An autonomous Verifier Agent powered by Groq (`gpt-oss-120b`) evaluates deliverables against explicit acceptance criteria, computing confidence calibration scores and criterion breakdowns.
2. **Authority Governed by Code:** A deterministic code layer verifies cryptographic SHA-256 evidence hashes and enforces confidence thresholds ($\ge 70\%$) before any funds move.
3. **Dual Settlement:** Upon approval, USDC is automatically released on Arc Testnet via Circle Developer-Controlled Wallets, and an immutable delivery score (`+1`) is minted to `ReputationRegistry.sol`.
4. **Adversarial Safety:** Defective code triggers immediate client refunds and records a penalty (`-1`) on-chain.

---

## 2. Key Links & Verified Evidence

| Deliverable | URL / Reference | Details |
| :--- | :--- | :--- |
| **Live Deployed App** | [https://veris-eosin.vercel.app](https://veris-eosin.vercel.app) | Production Next.js deployment on Vercel |
| **YouTube Video Demo** | [https://youtu.be/Vw-EdI8NKSk](https://youtu.be/Vw-EdI8NKSk) | Official YouTube submission video (2m 24s) |
| **Smart Contract** | [`0xA687...63A1`](https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1) | Verified on ArcScan (Chain ID `5042002`) |
| **Contract Deployment Tx** | [`0x373e...8730`](https://testnet.arcscan.io/tx/0x373e51e4a5e5ba9de0ad20996400afbb302efa65f557e96c5302d48ba3cc8730) | Deployed on live Arc Testnet |
| **Delivery Settlement Tx** | [`0x6cee...daba`](https://testnet.arcscan.io/tx/0x6cee9245a09cd5e537968d97a2e27d6f63d761705b0c5917f9c8c81af1bddaba) | +1 delivery score minted to `ReputationRegistry` |
| **GitHub Repository** | [https://github.com/Anekenonso/veris](https://github.com/Anekenonso/veris) | Full source code, test suites, contracts |
| **Technical Dossier** | [`evidence/EVIDENCE_PACKAGE.md`](./evidence/EVIDENCE_PACKAGE.md) | Architectural matrices & kill test logs |

---

## 3. Demo Video Deliverables

* **Official YouTube Submission Link:** [https://youtu.be/Vw-EdI8NKSk](https://youtu.be/Vw-EdI8NKSk)
* **Local Source Files** (located in [`Demo Video/`](file:///c:/Users/USER/Documents/Software%20Development/AI%20SaaS/Veris/Demo%20Video), excluded from git commits):
  * **Primary Video (Exact 2.4 min):** `Demo Video/veris_demo_matched_2.4min.mp4` (Duration: `02:24.00`, 7.45 MB)
  *Paced to 2.4 minutes with stretched ElevenLabs voiceover and subtle background synth music.*
* **Full-Length Video (2m 45s):**  
  `Demo Video/veris_demo_stretched_2m45s.mp4` (Duration: `02:45.00`, 9.03 MB)  
  *Uncompressed 165-second timeline with voiceover matching all 6 demo scenes.*
* **Natural Voice Video (94s):**  
  `Demo Video/veris_demo_video_paced_to_audio_94s.mp4` (Duration: `01:34.24`, 5.42 MB)  
  *Video accelerated to match 100% natural, unstretched ElevenLabs vocal cadence.*
* **Synchronized Voiceover Script:**  
  `Demo Video/VOICEOVER_SCRIPT.md` (Exact timestamp breakdown for all 6 scenes)

---

## 4. Load-Bearing Sponsor Stack

### 1. Arc Testnet (Chain ID 5042002)
* **Native USDC Gas:** Arc enables single-currency financial accounting. Users and agents do not need volatile native gas tokens; all fees and settlements are paid in USDC.
* **ReputationRegistry Contract:** Stores cumulative worker scores (`int256`), total jobs, success counts, failure counts, and SHA-256 evidence hashes. Any third-party protocol can query `getReputation(worker)` on-chain.

### 2. Circle Developer-Controlled Wallets
* **Programmatic Agent Wallets:** Agent wallets are created and controlled programmatically via `@circle-fin/developer-controlled-wallets`.
* **Escrow Balance Accounting:** Enables programmatic escrow locking, delivery-triggered release, and client refund execution.

### 3. Groq LLM Engine (`openai/gpt-oss-120b`)
* **Sub-Second Deliverable Auditing:** Evaluates complex deliverables (code, smart contracts, SQL schemas, reports) against multi-item acceptance rubrics in ~800ms.
* **Deterministic Confidence Calibration:** Outputs structured JSON with individual item ratings and overall confidence score.

---

## 5. Authority Boundaries: AI vs Deterministic Code

```
┌─────────────────────────────────┐       ┌──────────────────────────────────────┐
│       AI Verifier (Groq)        │       │       Deterministic Code Layer       │
│  "Handles Deliverable Ambiguity" │       │       "Owns Financial Authority"     │
├─────────────────────────────────┤       ├──────────────────────────────────────┤
│ • Interprets acceptance criteria │       │ • Cryptographic SHA-256 hash checks  │
│ • Evaluates code semantics      │ ────> │ • Hard confidence threshold (>= 70%) │
│ • Computes confidence (0-100%)  │       │ • Executes USDC transfer on Arc      │
│ • Explains reason for failure   │       │ • Mints +/- score to smart contract  │
└─────────────────────────────────┘       └──────────────────────────────────────┘
```

**Key Safety Invariant:** No LLM can directly touch funds, sign transactions, or alter balances. If an LLM hallucinates or returns malformed JSON, the deterministic gate fails closed, halting settlement and protecting client capital.

---

## 6. Empirical Proof: Section 4 Kill Test

Before building the frontend, we ran an empirical kill test benchmark evaluating 8 realistic deliverables against rubric criteria:

* **Clear Cases Tested:** 6 (3 compliant, 3 defective)
* **Accuracy:** **6 / 6 (100.0%)** (Target threshold: $\ge 5/6$)
* **Result:** **PASSED (PROCEED)**
* Full reproducible test suite: `node scripts/verifier-kill-test.mjs`

---

## 7. Ready-to-Use Copy for Submission Forms

### Short Pitch (Elevator / 280 characters):
> Veris replaces human escrow middlemen with autonomous AI deliverable verification and permanent on-chain delivery reputation on Arc Testnet with Circle USDC. AI handles ambiguity; deterministic code owns authority.

### Project Description (for Devpost / DoraHacks submission form):
```markdown
### Problem
Autonomous agents and digital businesses contracting freelancers face a dilemma: payments are either fully trusted—inviting non-delivery—or manual escrow requires slow human arbitration. Crucially, zero portable, verified delivery history remains on-chain.

### Solution
Veris is an autonomous milestone escrow protocol that pairs sub-second deliverable evaluation with fail-closed deterministic on-chain settlement on Arc Testnet. 

When a contractor submits work against an agreed rubric:
1. Groq (gpt-oss-120b) evaluates each criterion, calculating a calibrated confidence score.
2. A deterministic code layer enforces a strict >= 70% threshold and verifies SHA-256 evidence hashes.
3. Upon approval, funds are released on Arc Testnet via Circle Developer-Controlled Wallets, and a +1 delivery score is minted to ReputationRegistry.sol.
4. If defective, funds are automatically refunded to the client and a -1 penalty is recorded.

### What We Built
- Next.js 15 production web application deployed on Vercel: https://veris-eosin.vercel.app
- ReputationRegistry.sol smart contract deployed and verified on Arc Testnet: 0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1
- Integration with Circle Developer-Controlled Wallets for automated escrow custody.
- Append-only cryptographic audit stream linking every transition to ArcScan explorer transaction receipts.
- Empirical Kill Test benchmark achieving 100% accuracy on deliverable evaluation.
```

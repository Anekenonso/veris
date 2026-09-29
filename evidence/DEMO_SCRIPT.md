# Veris — Hackathon Video Demo Script (2.5 – 3 Minutes)

**Project:** Veris (Autonomous Milestone Escrow & On-Chain Delivery Reputation)  
**Hackathon Tracks:** Autonomous Agents, Arc Testnet, Circle Developer-Controlled Wallets  
**Target Video Duration:** 2 minutes 45 seconds  
**Live Application URL:** `http://localhost:3000` (or production deployment)  
**Deployed Contract:** [`0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1` on Arc Testnet](https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1)

---

## Video Scene Breakdown

```mermaid
timeline
    title 2:45 Demo Video Flow
    00:00 - 00:25 : 1. The Core Problem & Thesis
    00:25 - 00:50 : 2. Sponsor Architecture & Tech Stack
    00:50 - 01:35 : 3. Happy Path: Fund, Audit & Arc Testnet Release
    01:35 - 02:10 : 4. Failure Path: Defective Deliverable & Refund
    02:10 - 02:35 : 5. Tamper-Evident Audit Trail & ArcScan Proof
    02:35 - 02:45 : 6. Portable Reputation & Closing
```

---

### Scene 1: The Core Problem & One-Sentence Thesis (0:00 – 0:25)

* **Visual on Screen:**  
  Start on the Veris Dashboard (`http://localhost:3000`). Slow hover over the top badge: `Arc Testnet 5042002` and `Native USDC Gas`.
* **Voiceover:**  
  > *"When autonomous agents or digital businesses hire contractors today, they face two structural flaws: payments are either fully trusted—inviting non-delivery—or manual escrow requires slow human arbitration. Even worse, once a job finishes, zero portable delivery history remains on-chain.*  
  >  
  > *This is **Veris**. If an autonomous multi-agent system evaluates deliverables against agreed criteria, releases escrowed USDC, and mints signed reputation on-chain, future agents can hire with verifiable delivery history instead of testimonials."*

---

### Scene 2: Load-Bearing Sponsor Stack (0:25 – 0:50)

* **Visual on Screen:**  
  Click on the top-right Arc Testnet badge to open ArcScan in a new tab (`https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`), highlighting our live `ReputationRegistry.sol` contract and native USDC balance. Switch back to the dashboard.
* **Voiceover:**  
  > *"Veris is built natively on **Arc Testnet**, leveraging single-currency accounting with native USDC gas. Contractor and client payouts interface with **Circle Developer-Controlled Wallets**, while **Groq inference** provides sub-second deliverable evaluation.*  
  >  
  > *Crucially: **AI handles ambiguity, but code owns authority.** No LLM can move funds or write reputation without passing our strict deterministic validation gate."*

---

### Scene 3: Happy Path — Escrow Funding, AI Audit & On-Chain Release (0:50 – 1:35)

* **Visual on Screen:**  
  1. Click **Milestone Escrow** tab. Select the active milestone: *"Solidity Gas Optimization Report (500 USDC)"*.
  2. In **Step 1 (Client Mode)**: Click **"Simulate Arc Deposit (500 USDC)"**. The step badge turns emerald `FUNDED` with a transaction hash.
  3. In **Step 2 (Contractor Mode)**: The interactive rubric displays 3 acceptance criteria. Click **"Good Code (Passes)"** preset button. The TypeScript deliverable code fills the editor.
  4. Click **"Submit Deliverable for Verification"**. The system computes a SHA-256 evidence hash.
  5. In **Step 3 (Verifier Oracle Mode)**: Click **"Run Autonomous Verifier"**.  
     - Watch the live telemetry stages tick: *Hashing Evidence $\to$ Groq LLM Evaluation $\to$ Deterministic Gate $\ge 75\% \to$ Arc Settlement $\to$ Reputation Minted*.
     - Show the **APPROVED** verdict with **92% calibrated confidence**, rubric breakdown (3/3 criteria MET), and the live settlement tx hash.
* **Voiceover:**  
  > *"Let's see the happy path. The client funds 500 USDC on Arc Testnet into escrow. Next, the contractor submits their TypeScript implementation.*  
  >  
  > *Veris hashes the deliverable and criteria with SHA-256. Then, our autonomous Verifier Agent audits every rubric line item. The deterministic code gate checks schema conformity and verifies confidence exceeds our 70% threshold.*  
  >  
  > *Because it passes, 500 USDC is automatically released to the contractor, and a positive score delta (+1) is minted on Arc Testnet to our ReputationRegistry smart contract."*

---

### Scene 4: Failure Path — Defective Deliverable & Deterministic Refund (1:35 – 2:10)

* **Visual on Screen:**  
  1. Click **"+ Create Milestone"** modal or select an existing draft milestone.
  2. Click **"Simulate Arc Deposit"**.
  3. In Step 2, click **"Broken Code (Fails)"** preset button (incomplete dummy code missing types, validation, and error handling).
  4. Click **"Submit Deliverable"**, then proceed to Step 3 and click **"Run Autonomous Verifier"**.
  5. The telemetry runs: The Verifier highlights failed criteria in red. The Deterministic Gate flags **REJECTED**.
  6. Escrow state transitions to **REFUNDED**. 500 USDC is refunded to the client, and a `-1` penalty delta is minted on-chain.
* **Voiceover:**  
  > *"Now let's test adversarial safety. A contractor submits broken, dummy code with missing types and no error handling.*  
  >  
  > *The verifier detects the non-compliant rubric items and outputs a rejection. The deterministic layer immediately halts payout, executes an automatic refund of the escrowed USDC back to the client, and penalizes the contractor with a -1 reputation delta on Arc Testnet.*  
  >  
  > *Zero human intervention, zero manual arbitration delay."*

---

### Scene 5: Tamper-Evident Audit Trail & ArcScan Verification (2:10 – 2:35)

* **Visual on Screen:**  
  1. Click **Audit Ledger** tab.
  2. Filter by `Stage: Approved` and search for the job ID.
  3. Show the table with timestamp, actor, input summary, and the clickable **"Tx"** link.
  4. Click the **"Tx"** link to show the actual transaction receipt on **ArcScan** (`testnet.arcscan.io/tx/0x6cee9245a09cd5e537968d97a2e27d6f63d761705b0c5917f9c8c81af1bddaba`), showing the mined block, gas consumed in USDC, and interacting contract `0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`.
* **Voiceover:**  
  > *"Every single lifecycle transition is committed to an append-only cryptographic audit stream with immutable SHA-256 evidence hashes.*  
  >  
  > *Judges can click directly from the audit ledger into ArcScan to inspect the live transaction receipts on Arc Testnet."*

---

### Scene 6: Contractor Directory & Thesis Climax (2:35 – 2:45)

* **Visual on Screen:**  
  Click the **Contractor Directory** tab. Show the contractor address (`0x8920...43e7`) with Lifetime Score: `+2`, 100% Success Rate, and expand the verified delivery history cards showing on-chain verified stamps.
* **Voiceover:**  
  > *"When future autonomous agents hire, they query `getReputation(worker)` directly from Arc Testnet. They hire based on verified mathematical delivery history—not easily forged platform stars.*  
  >  
  > *This is Veris: Autonomous Milestone Escrow & On-Chain Delivery Reputation. Thank you."*

---

## Recording Checklist for the Presenter

- [ ] Browser window sized to 1280x720 or 1920x1080.
- [ ] Next.js app running on `http://localhost:3000`.
- [ ] Pre-opened ArcScan contract page in second tab: `https://testnet.arcscan.io/address/0xA687Be4b96e109d1d40826bF58cFFEbE4e1B63A1`.
- [ ] Microphone tested with clear audio and zero background noise.
- [ ] Click "Good Code" preset first for the happy path, then "Broken Code" for the failure path.

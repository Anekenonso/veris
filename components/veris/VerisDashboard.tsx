"use client";

import React, { useState, useEffect } from "react";
import { EscrowJob, JobState } from "@/lib/orchestrator/jobStore";
import { AuditEntry } from "@/lib/audit/auditLogger";
import { ReputationSummary, OnChainJobRecord } from "@/lib/contracts/reputationRegistry";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Search,
  RefreshCw,
  Coins,
  Send,
  Cpu,
  Award,
  History,
  FileCode,
  FileText,
  Layers,
  Lock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCheck,
  Code,
  Info,
  DollarSign,
  UserCheck,
  SlidersHorizontal,
  Filter,
} from "lucide-react";

const INITIAL_SHOWCASE_JOBS: EscrowJob[] = [
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
    createdAt: 1790674075752,
    fundedAt: 1790674175752,
    fundingTxHash: "0x3f9821aa90be4c0b48f98df3c9b7405bead48480dc2735749a0c79e63e18a221",
    updatedAt: 1790674175752,
  },
  {
    id: "job-mumjdnhx-8p9i",
    title: "Solidity Gas Optimization Report",
    client: "0x71C84167608922C0E63691C74B224E825a0b77A4",
    worker: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    amountUSDC: 500,
    criteria: `1. Must analyze gas consumption of ReputationRegistry.sol
2. Must propose at least 2 concrete bytecode optimizations
3. Must maintain 100% backward compatibility.`,
    state: "REPUTATION_UPDATED",
    createdAt: 1790677885749,
    updatedAt: 1790677894729,
    fundedAt: 1790677887847,
    fundingTxHash: "0xdd0a8f28a984b25a596f0aa54a14c51d064e0012c5b2fb75939b4b5d2cdc998d",
    deliverable: {
      type: "text",
      content: `# Gas Optimization Report for ReputationRegistry.sol

1. Storage Slot Packing:
In ReputationRegistry.sol, struct JobRecord packs int8 scoreDelta into the same 32-byte slot as address worker, reducing storage write costs from 20,000 gas (SSTORE) to 5,000 gas.

2. Custom Errors over Require Strings:
Replacing string require statements with custom errors saves ~45 gas per revert check.

3. Backward Compatibility:
All public view function signatures remain identical and 100% backward compatible.`,
      notes: "Prepared and verified against Foundry gas benchmarks.",
      submittedAt: 1790677890566,
    },
    verifierOutput: {
      jobId: "job-mumjdnhx-8p9i",
      pass: true,
      confidence: 0.88,
      reasoning: "The deliverable provides a gas consumption analysis of ReputationRegistry.sol, proposes two specific bytecode optimizations, and satisfies backward compatibility.",
      evidenceHash: "638e364abb26c5750224cb22c265651a705a6cf1886921aafc7def1e6681536f",
      model: "openai/gpt-oss-120b",
      timestamp: 1790677894719,
      criteriaBreakdown: [
        { criterion: "Must analyze gas consumption of ReputationRegistry.sol", status: "MET", evidence: "Storage slot packing and custom errors analyzed." },
        { criterion: "Must propose at least 2 concrete bytecode optimizations", status: "MET", evidence: "Proposes slot packing and custom errors." },
        { criterion: "Must maintain 100% backward compatibility", status: "MET", evidence: "All public view function signatures remain identical." },
      ],
    },
    deterministicResult: { accepted: true, decision: "APPROVED", reason: "Deliverable passed verification with confidence 0.88", validatedAt: 1790677894724 },
    settlementTxHash: "0xad5d08d36486870c9bce6ed1a58dcb20acb1e48b2beb5012a80a9a955d20f3c6",
    reputationTxHash: "0x6b1136ad047e4da0700bc6e8065e2f962217cb3d28dfbe1a7601f9533986c7d7",
    reputationScoreDelta: 1,
  },
];

export default function VerisDashboard() {
  const [activeTab, setActiveTab] = useState<"wizard" | "contractors" | "audit">("wizard");
  const [jobs, setJobs] = useState<EscrowJob[]>(INITIAL_SHOWCASE_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<string>("job-001-arc-helper");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Active Wizard Step (1: Fund, 2: Deliverable, 3: Settle)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // New Milestone Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("250");
  const [newWorker, setNewWorker] = useState("0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7");
  const [newCriteria, setNewCriteria] = useState("");

  // Deliverable Input State
  const [deliverableContent, setDeliverableContent] = useState("");
  const [deliverableType, setDeliverableType] = useState<"code" | "text">("code");
  const [deliverableNotes, setDeliverableNotes] = useState("");

  // Reputation Lookup State
  const [lookupAddress, setLookupAddress] = useState("0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7");
  const [reputationData, setReputationData] = useState<(ReputationSummary & { history: OnChainJobRecord[] }) | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  // Live Verification Telemetry State (0: Idle, 1..5: Stages)
  const [verifyingStage, setVerifyingStage] = useState<number>(0);

  // Audit Ledger Filter & Search State
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [auditSearch, setAuditSearch] = useState<string>("");

  // Contractor Tab Filter State
  const [contractorFilter, setContractorFilter] = useState<"ALL" | "SUCCESS" | "FAIL">("ALL");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/veris/jobs");
      const data = await res.json();
      if (data.success && data.jobs.length > 0) {
        setJobs(data.jobs);
        if (!selectedJobId || !data.jobs.find((j: EscrowJob) => j.id === selectedJobId)) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load escrow jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/veris/audit");
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReputation = async (address: string) => {
    try {
      setRepLoading(true);
      const res = await fetch(`/api/veris/reputation/${address}`);
      const data = await res.json();
      if (data.success) {
        setReputationData(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load reputation");
    } finally {
      setRepLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchAuditLogs();
    fetchReputation(lookupAddress);
  }, []);

  const activeJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // Auto-sync wizard step to match active job's state
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.state === "CREATED") {
      setWizardStep(1);
    } else if (activeJob.state === "FUNDED") {
      setWizardStep(2);
    } else if (
      activeJob.state === "DELIVERABLE_SUBMITTED" ||
      activeJob.state === "VERIFYING" ||
      activeJob.state === "RELEASED" ||
      activeJob.state === "REFUNDED" ||
      activeJob.state === "REPUTATION_UPDATED"
    ) {
      setWizardStep(3);
    }
  }, [activeJob?.id, activeJob?.state]);

  const handleCopy = (text: string, label: string = "Value") => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Actions
  const handleFundJob = async (jobId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/veris/jobs/${jobId}/fund`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Escrow funded with $${data.job.amountUSDC} USDC!`);
        await fetchJobs();
        await fetchAuditLogs();
        setWizardStep(2);
      } else {
        toast.error(data.error || "Funding failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fund escrow");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDeliverable = async (jobId: string) => {
    if (!deliverableContent.trim()) {
      toast.error("Please enter the deliverable code or content.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/veris/jobs/${jobId}/deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: deliverableType,
          content: deliverableContent,
          notes: deliverableNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Deliverable submitted and hashed!");
        setDeliverableContent("");
        setDeliverableNotes("");
        await fetchJobs();
        await fetchAuditLogs();
        setWizardStep(3);
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deliverable");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndSettle = async (jobId: string) => {
    try {
      setActionLoading(true);
      setVerifyingStage(1); // 1: Hashing evidence

      const t1 = setTimeout(() => setVerifyingStage(2), 600); // 2: Groq audit
      const t2 = setTimeout(() => setVerifyingStage(3), 1300); // 3: Threshold check
      const t3 = setTimeout(() => setVerifyingStage(4), 1900); // 4: Arc settlement

      const res = await fetch(`/api/veris/jobs/${jobId}/verify`, { method: "POST" });
      const data = await res.json();

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setVerifyingStage(5); // 5: Completed

      if (data.success) {
        const decision = data.job.deterministicResult?.decision;
        if (decision === "APPROVED") {
          toast.success("Verification approved! USDC released and +1 reputation recorded.");
        } else if (decision === "REJECTED") {
          toast.error("Verification rejected. Acceptance criteria not satisfied.");
        } else {
          toast.warning("Verification flagged ambiguity. Escalated.");
        }
        await fetchJobs();
        await fetchAuditLogs();
        if (activeJob) {
          await fetchReputation(activeJob.worker);
        }
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setActionLoading(false);
      setTimeout(() => setVerifyingStage(0), 1200);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCriteria) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/veris/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          amountUSDC: Number(newAmount),
          client: "0x71C84167608922C0E63691C74B224E825a0b77A4",
          worker: newWorker,
          criteria: newCriteria,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("New milestone escrow created!");
        setShowCreateModal(false);
        setNewTitle("");
        setNewCriteria("");
        await fetchJobs();
        setSelectedJobId(data.job.id);
        setWizardStep(1);
        await fetchAuditLogs();
      } else {
        toast.error(data.error || "Creation failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create milestone");
    } finally {
      setActionLoading(false);
    }
  };

  // Demo Helpers
  const loadQuickGoodDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Fully typed implementation meeting all criteria with regex checks.");
    setDeliverableContent(`import { CircleClient } from "@circle-fin/developer-controlled-wallets";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function transferEscrowFunds(
  recipient: string,
  amountUSDC: number,
  client: CircleClient
): Promise<string> {
  if (!ETH_ADDRESS_REGEX.test(recipient)) {
    throw new Error(\`Invalid recipient address: "\${recipient}". Must be 42-char hex.\`);
  }
  if (typeof amountUSDC !== "number" || isNaN(amountUSDC) || amountUSDC <= 0) {
    throw new Error(\`Invalid amount: "\${amountUSDC}". Must be positive.\`);
  }

  try {
    const tx = await client.createTransaction({
      destinationAddress: recipient,
      amounts: [amountUSDC.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } }
    });
    return tx.data.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed";
    throw new Error(\`Escrow transfer failed: \${msg}\`);
  }
}`);
    toast.success("Loaded Good Code (Passes Verification)");
  };

  const loadQuickBadDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Incomplete stub missing input validations and error handling.");
    setDeliverableContent(`// Stub implementation missing parameter types and validations
export function transferEscrowFunds(recipient: any, amount: any) {
  // TODO: validate inputs
  console.log("Mock transfer");
  return "0xdummy_placeholder";
}`);
    toast.info("Loaded Broken Code (Fails Verification)");
  };

  return (
    <div className="min-h-screen text-[#0F172A] flex flex-col font-sans">
      {/* Top Navbar - Full Screen Width */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="w-full px-4 sm:px-8 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-sans font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                  Veris
                </span>
                <span className="text-[9px] sm:text-[10px] text-teal-800/80 font-mono uppercase tracking-[0.14em] font-semibold block">
                  Milestone Escrow & Reputation
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 h-10">
              <button
                onClick={() => setActiveTab("wizard")}
                className={`h-8 px-4 rounded-lg text-xs font-semibold tracking-[-0.01em] transition cursor-pointer flex items-center ${
                  activeTab === "wizard"
                    ? "bg-white text-teal-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Milestone Escrow
              </button>
              <button
                onClick={() => setActiveTab("contractors")}
                className={`h-8 px-4 rounded-lg text-xs font-semibold tracking-[-0.01em] transition cursor-pointer flex items-center ${
                  activeTab === "contractors"
                    ? "bg-white text-teal-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Contractor Directory
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`h-8 px-4 rounded-lg text-xs font-semibold tracking-[-0.01em] transition cursor-pointer flex items-center ${
                  activeTab === "audit"
                    ? "bg-white text-teal-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Audit Ledger ({auditLogs.length})
              </button>
            </nav>
          </div>

          {/* Network & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg badge-sapphire text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Arc Testnet</span>
              <span className="font-mono font-bold tracking-tight">5042002</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg badge-teal text-xs font-medium">
              <Coins className="w-3.5 h-3.5" />
              <span>Native USDC Gas</span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-3.5 sm:px-4 rounded-xl btn-primary text-xs cursor-pointer flex items-center gap-1.5 font-medium tracking-[-0.01em] whitespace-nowrap shadow-xs"
            >
              <span>+ Create <span className="hidden xs:inline">Milestone</span></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs Bar */}
        <div className="flex md:hidden border-t border-slate-100 px-3 py-1.5 bg-slate-50/80 overflow-x-auto gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab("wizard")}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap transition cursor-pointer ${
              activeTab === "wizard"
                ? "bg-white text-teal-800 shadow-2xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Escrow
          </button>
          <button
            onClick={() => setActiveTab("contractors")}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap transition cursor-pointer ${
              activeTab === "contractors"
                ? "bg-white text-teal-800 shadow-2xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Contractors
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap transition cursor-pointer ${
              activeTab === "audit"
                ? "bg-white text-teal-800 shadow-2xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Audit ({auditLogs.length})
          </button>
        </div>
      </header>

      {/* Main Container - Full Screen Width */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {activeTab === "wizard" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Constantly Flowing Active Milestone Stream Bar */}
            <div className="premium-card p-3 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-800 font-sans tracking-tight shrink-0">
                    Active Milestone:
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200/60 uppercase tracking-wider">
                  Live Stream
                </span>
              </div>

              {/* Constantly Flowing Marquee Track (Hover to pause, Click to select) */}
              <div
                className="relative flex-1 overflow-hidden marquee-mask py-0.5 min-w-0"
                title="Constantly flowing milestone stream — Hover to pause, click to select"
              >
                <div className="animate-flow-marquee flex items-center gap-2.5">
                  {/* Duplicated list to enable infinite seamless loop */}
                  {[...jobs, ...jobs].map((job, idx) => {
                    const isSelected = selectedJobId === job.id;
                    return (
                      <button
                        key={`${job.id}-${idx}`}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`h-8 px-3 rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shrink-0 ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs font-semibold ring-2 ring-teal-500/40"
                            : "bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 font-medium border border-slate-200/60"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            job.state === "REPUTATION_UPDATED" || job.state === "RELEASED"
                              ? "bg-emerald-400"
                              : job.state === "FUNDED"
                              ? "bg-blue-400"
                              : "bg-amber-400"
                          }`}
                        />
                        <span className="whitespace-nowrap font-medium">{job.title}</span>
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-white/15 text-teal-200 font-semibold"
                              : "bg-white/80 text-slate-600 font-medium border border-slate-200/60"
                          }`}
                        >
                          ${job.amountUSDC} USDC
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <span
                  className={`h-7 px-3 rounded-full text-[10px] sm:text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center ${
                    activeJob?.state === "REPUTATION_UPDATED" || activeJob?.state === "RELEASED"
                      ? "badge-emerald"
                      : activeJob?.state === "FUNDED"
                      ? "badge-sapphire"
                      : activeJob?.state === "DELIVERABLE_SUBMITTED"
                      ? "badge-amber"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {activeJob?.state.replace("_", " ")}
                </span>
                <button
                  onClick={fetchJobs}
                  className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/60 transition cursor-pointer flex items-center justify-center shrink-0"
                  title="Refresh Milestones"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
                </button>
              </div>
            </div>

            {activeJob ? (
              <>
                {/* Milestone Overview Card */}
                <div className="premium-card p-4 sm:p-6 lg:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.15em] text-teal-700 font-bold block mb-1">
                        Contract Agreement · Arc-5042002
                      </span>
                      <h1 className="text-xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 tracking-tight leading-[1.2]">
                        {activeJob.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                        <span>
                          Contractor:{" "}
                          <span className="font-mono text-slate-800 font-medium">
                            {activeJob.worker.substring(0, 6)}...{activeJob.worker.substring(38)}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Client:{" "}
                          <span className="font-mono text-slate-800 font-medium">
                            {activeJob.client.substring(0, 6)}...{activeJob.client.substring(38)}
                          </span>
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="font-mono text-slate-400 hidden sm:inline">ID: {activeJob.id}</span>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 font-semibold block">
                        Escrow Balance
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight tabular-nums">
                          ${activeJob.amountUSDC.toFixed(2)}
                        </span>
                        <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 tracking-wide">
                          USDC
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Step Guided Stepper Navigation */}
                  <div className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {/* Step 1 Pill */}
                      <button
                        onClick={() => setWizardStep(1)}
                        className={`text-left p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer ${
                          wizardStep === 1
                            ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                            : activeJob.state !== "CREATED"
                            ? "bg-emerald-50/50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center sm:items-start gap-2 sm:gap-3">
                          <span
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold tracking-tight shrink-0 ${
                              wizardStep === 1
                                ? "bg-teal-600 text-white shadow-2xs"
                                : activeJob.state !== "CREATED"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {activeJob.state !== "CREATED" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "01"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] sm:text-xs lg:text-sm font-sans font-bold text-slate-900 tracking-tight leading-tight block">
                              <span className="hidden xs:inline">1. </span>Fund<span className="hidden sm:inline"> Escrow</span>
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block truncate">
                              Lock {activeJob.amountUSDC} USDC on Arc
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Step 2 Pill */}
                      <button
                        onClick={() => setWizardStep(2)}
                        className={`text-left p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer ${
                          wizardStep === 2
                            ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                            : ["DELIVERABLE_SUBMITTED", "VERIFYING", "RELEASED", "REPUTATION_UPDATED"].includes(activeJob.state)
                            ? "bg-emerald-50/50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center sm:items-start gap-2 sm:gap-3">
                          <span
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold tracking-tight shrink-0 ${
                              wizardStep === 2
                                ? "bg-teal-600 text-white shadow-2xs"
                                : ["DELIVERABLE_SUBMITTED", "VERIFYING", "RELEASED", "REPUTATION_UPDATED"].includes(activeJob.state)
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {["DELIVERABLE_SUBMITTED", "VERIFYING", "RELEASED", "REPUTATION_UPDATED"].includes(activeJob.state) ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              "02"
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] sm:text-xs lg:text-sm font-sans font-bold text-slate-900 tracking-tight leading-tight block">
                              <span className="hidden xs:inline">2. </span>Submit<span className="hidden sm:inline"> Work</span>
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block truncate">
                              Upload code or report
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Step 3 Pill */}
                      <button
                        onClick={() => setWizardStep(3)}
                        className={`text-left p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer ${
                          wizardStep === 3
                            ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                            : activeJob.state === "REPUTATION_UPDATED" || activeJob.state === "RELEASED"
                            ? "bg-emerald-50/50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center sm:items-start gap-2 sm:gap-3">
                          <span
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold tracking-tight shrink-0 ${
                              wizardStep === 3
                                ? "bg-teal-600 text-white shadow-2xs"
                                : activeJob.state === "REPUTATION_UPDATED" || activeJob.state === "RELEASED"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {activeJob.state === "REPUTATION_UPDATED" || activeJob.state === "RELEASED" ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              "03"
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] sm:text-xs lg:text-sm font-sans font-bold text-slate-900 tracking-tight leading-tight block">
                              <span className="hidden xs:inline">3. </span>Settle<span className="hidden sm:inline"> Escrow</span>
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block truncate">
                              AI reasoning & payout
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Actor & Role Context Bar */}
                    <div className="mt-3 sm:mt-4 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold shrink-0">Acting Role:</span>
                        {wizardStep === 1 && (
                          <span className="px-2.5 py-0.5 rounded-md badge-teal font-mono text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                            <span>Client ({activeJob.client.substring(0, 6)}...{activeJob.client.substring(38)})</span>
                          </span>
                        )}
                        {wizardStep === 2 && (
                          <span className="px-2.5 py-0.5 rounded-md badge-sapphire font-mono text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                            <span>Contractor ({activeJob.worker.substring(0, 6)}...{activeJob.worker.substring(38)})</span>
                          </span>
                        )}
                        {wizardStep === 3 && (
                          <span className="px-2.5 py-0.5 rounded-md badge-amber font-mono text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse shrink-0"></span>
                            <span>Veris Oracle (Groq + Arc Chain)</span>
                          </span>
                        )}
                      </div>

                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 uppercase text-[10px] shrink-0">Objective:</span>
                        <span className="font-semibold text-slate-800 leading-tight">
                          {wizardStep === 1
                            ? activeJob.state === "CREATED"
                              ? `Deposit $${activeJob.amountUSDC} USDC into Arc escrow contract`
                              : "Principal deposited · Proceed to Step 2"
                            : wizardStep === 2
                            ? activeJob.deliverable
                              ? "Deliverable hashed · Ready for verification in Step 3"
                              : "Submit completed work meeting all acceptance criteria"
                            : activeJob.verifierOutput
                            ? "Deliverable verified · Escrow settled on Arc Testnet"
                            : "Run Groq AI compliance check & deterministic payout"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTIVE WIZARD STEP PANEL */}

                {/* STEP 1: FUND ESCROW */}
                {wizardStep === 1 && (
                  <div className="premium-card p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 tracking-tight">Step 1: Escrow Deposit</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Deposit and lock funds in the Arc Testnet escrow smart contract.
                        </p>
                      </div>
                      <span className="badge-sapphire px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-medium">
                        Arc: 5042002
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Principal Amount</span>
                        <div className="mt-2">
                          <span className="text-xl sm:text-2xl font-serif font-bold text-slate-900 block tabular-nums leading-tight">
                            ${activeJob.amountUSDC}.00
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 block mt-0.5">Locked in Escrow</span>
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Gas Asset</span>
                        <div className="mt-2">
                          <span className="text-xl sm:text-2xl font-serif font-bold text-slate-900 block tracking-tight leading-tight">
                            Native USDC
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-teal-700 block mt-0.5">Medium Priority Fee</span>
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Authority Model</span>
                        <div className="mt-2">
                          <span className="text-xl sm:text-2xl font-serif font-bold text-slate-900 block tracking-tight leading-tight">
                            Deterministic
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 block mt-0.5">Fail-Closed Verification</span>
                        </div>
                      </div>
                    </div>

                    {/* Funding Status & Action */}
                    {activeJob.state === "CREATED" ? (
                      <div className="p-4 sm:p-5 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3.5">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                          <div className="text-xs text-teal-950 leading-relaxed">
                            <span className="font-bold block text-sm">
                              Awaiting Escrow Funding
                            </span>
                            Deposit {activeJob.amountUSDC} USDC into the escrow smart contract on Arc Testnet. Funds remain locked until the deliverable is verified.
                          </div>
                        </div>

                        <button
                          onClick={() => handleFundJob(activeJob.id)}
                          disabled={actionLoading}
                          className="w-full py-3.5 btn-accent text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold tracking-[-0.01em]"
                        >
                          <Lock className="w-4 h-4" />
                          <span>
                            {actionLoading ? "Locking Escrow on Arc..." : `Deposit $${activeJob.amountUSDC} USDC into Escrow`}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-bold text-slate-900">
                              Escrow Successfully Funded
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-700 font-bold">
                            ${activeJob.amountUSDC} USDC Locked
                          </span>
                        </div>

                        {activeJob.fundingTxHash && (
                          <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-emerald-200 gap-2">
                            <span className="text-slate-500 shrink-0">Arc Tx Hash:</span>
                            <span className="text-teal-700 font-bold truncate max-w-[140px] xs:max-w-[220px] sm:max-w-sm">
                              {activeJob.fundingTxHash}
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => setWizardStep(2)}
                          className="mt-2 w-full py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                        >
                          <span>Proceed to Step 2: Submit Work</span>
                          <ArrowRight className="w-4 h-4 text-teal-600" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: SUBMIT WORK */}
                {wizardStep === 2 && (
                  <div className="premium-card p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">Step 2: Deliverable Submission</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Submit the completed code or deliverable for cryptographic hashing and verification.
                        </p>
                      </div>
                      <span className="badge-teal px-3 py-1 rounded-full text-[11px] font-mono font-medium">
                        Immutable Evidence
                      </span>
                    </div>

                    {/* Interactive Acceptance Criteria Rubric */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-700" />
                          <span>Agreed Acceptance Criteria Rubric</span>
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Strict Rule-Check</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeJob.criteria
                          .split("\n")
                          .map((c) => c.trim())
                          .filter((c) => c.length > 0 && !c.toLowerCase().startsWith("criteria:"))
                          .map((criterion, idx, arr) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg bg-white border border-slate-200/70 text-xs flex items-start gap-2.5 shadow-2xs h-full ${
                                idx === arr.length - 1 && arr.length % 2 !== 0 ? "sm:col-span-2" : ""
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                              <span className="text-slate-700 text-[11px] font-mono leading-relaxed">{criterion}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Submission Form or Evidence Display */}
                    {activeJob.deliverable ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Submitted Deliverable:</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Submitted {new Date(activeJob.deliverable.submittedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="relative">
                          <pre className="text-xs font-mono text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                            {activeJob.deliverable.content}
                          </pre>
                          <button
                            onClick={() => handleCopy(activeJob.deliverable!.content, "Deliverable Code")}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
                            title="Copy Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {activeJob.deliverable.notes && (
                          <p className="text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-900">Contractor Note:</span> {activeJob.deliverable.notes}
                          </p>
                        )}

                        <button
                          onClick={() => setWizardStep(3)}
                          className="w-full py-3.5 btn-accent text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs font-semibold tracking-[-0.01em]"
                        >
                          <span>Proceed to Step 3: Run AI Verifier</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : activeJob.state === "FUNDED" ? (
                      <div className="space-y-4">
                        {/* 1-Click Fill Buttons for Reviewers */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 block">
                              Instant Demo Deliverable Presets:
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Load tested sample code to see passing vs failing verification logic.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={loadQuickGoodDeliverable}
                              className="flex-1 sm:flex-initial h-8 px-3 rounded-lg badge-emerald text-xs font-semibold transition cursor-pointer shadow-2xs hover:brightness-95 tracking-[-0.01em] flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Good Code (Passes)</span>
                            </button>
                            <button
                              onClick={loadQuickBadDeliverable}
                              className="flex-1 sm:flex-initial h-8 px-3 rounded-lg badge-rose text-xs font-semibold transition cursor-pointer shadow-2xs hover:brightness-95 tracking-[-0.01em] flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Broken Code (Fails)</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-900">
                              Deliverable Source Code / Audit Report
                            </label>
                            {deliverableContent && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {deliverableContent.split("\n").length} lines · {deliverableContent.length} chars
                              </span>
                            )}
                          </div>
                          <textarea
                            value={deliverableContent}
                            onChange={(e) => setDeliverableContent(e.target.value)}
                            placeholder="Paste the contractor's TypeScript code, audit report, or deliverable here..."
                            rows={7}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white leading-relaxed shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-900 block mb-1.5">
                            Optional Contractor Submission Notes
                          </label>
                          <input
                            type="text"
                            value={deliverableNotes}
                            onChange={(e) => setDeliverableNotes(e.target.value)}
                            placeholder="e.g. Verified with Foundry benchmarks"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                          />
                        </div>

                        <button
                          onClick={() => handleSubmitDeliverable(activeJob.id)}
                          disabled={actionLoading || !deliverableContent.trim()}
                          className="w-full py-3.5 btn-accent text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold tracking-[-0.01em]"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit Deliverable for AI Verification</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                        Escrow must be funded in Step 1 before deliverable submission.
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: VERIFY & SETTLE */}
                {wizardStep === 3 && (
                  <div className="premium-card p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">Step 3: Verification & Payout</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Autonomous AI verification check and deterministic settlement execution.
                        </p>
                      </div>
                      <span className="badge-sapphire px-3 py-1 rounded-full text-[11px] font-mono font-medium">
                        Groq gpt-oss-120b
                      </span>
                    </div>

                    {/* Live Telemetry Progress Terminal (Shown during active autonomous verification) */}
                    {(verifyingStage > 0 || (actionLoading && wizardStep === 3)) && (
                      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-teal-50/50 via-white to-slate-50/70 border border-teal-200/90 space-y-3.5 shadow-xs relative overflow-hidden animate-in fade-in duration-300">
                        {/* Top Accent Gradient Line */}
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500" />

                        <div className="flex items-center justify-between border-b border-teal-100/90 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600" />
                            </span>
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-teal-700" />
                              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase">
                                Veris Autonomous Verification Engine
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="badge-sapphire px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium hidden sm:inline">
                              Deterministic Pipeline
                            </span>
                            <span className="badge-teal px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold">
                              Phase {verifyingStage || 1} of 5
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-0.5">
                          {[
                            { num: "01", text: "Hashing deliverable payload with SHA-256 for non-repudiation..." },
                            { num: "02", text: "Querying Groq gpt-oss-120b with zero-bias criteria audit prompt..." },
                            { num: "03", text: "Checking confidence calibration against threshold (≥ 70% required)..." },
                            { num: "04", text: `Executing deterministic Arc settlement & releasing $${activeJob.amountUSDC} USDC...` },
                            { num: "05", text: "State finalized: ReputationRegistry record minted on Arc Testnet." },
                          ].map((step, idx) => {
                            const stepStage = idx + 1;
                            const isDone = verifyingStage > stepStage || (verifyingStage === 5 && stepStage === 5);
                            const isCurrent = verifyingStage === stepStage;

                            return (
                              <div
                                key={step.num}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 ${
                                  isCurrent
                                    ? "bg-teal-50/90 border border-teal-300 text-teal-950 font-semibold shadow-2xs ring-1 ring-teal-400/20"
                                    : isDone
                                    ? "bg-slate-50/80 border border-slate-200/70 text-slate-800"
                                    : "border border-transparent text-slate-400 opacity-60"
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isDone
                                      ? "bg-teal-600 text-white"
                                      : isCurrent
                                      ? "bg-teal-100 text-teal-800 border border-teal-400 animate-pulse"
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {isDone ? "✓" : isCurrent ? "▶" : "·"}
                                </span>
                                <span className="truncate flex-1">
                                  [{step.num}/05] {step.text}
                                </span>
                                {isCurrent && (
                                  <span className="flex items-center gap-1 text-[10px] text-teal-700 font-sans font-medium shrink-0 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                    Executing
                                  </span>
                                )}
                                {isDone && (
                                  <span className="text-[10px] text-teal-700 font-sans font-medium shrink-0">
                                    Verified
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Verification Status Banner */}
                    {activeJob.verifierOutput ? (
                      <div className="space-y-5">
                        {/* Outcome Header Box */}
                        <div
                          className={`p-4 sm:p-5 rounded-xl border flex flex-col xs:flex-row xs:items-center justify-between gap-3.5 ${
                            activeJob.deterministicResult?.decision === "APPROVED"
                              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                              : "bg-rose-50/70 border-rose-300 text-rose-950"
                          }`}
                        >
                          <div className="flex items-start xs:items-center gap-3">
                            {activeJob.deterministicResult?.decision === "APPROVED" ? (
                              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0 mt-0.5 xs:mt-0" />
                            ) : (
                              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0 mt-0.5 xs:mt-0" />
                            )}
                            <div>
                              <span className="text-sm font-serif font-bold block text-slate-900 tracking-tight">
                                {activeJob.deterministicResult?.decision === "APPROVED"
                                  ? "Deliverable Approved — Escrow Released"
                                  : "Deliverable Rejected — Criteria Breach"}
                              </span>
                              <span className="text-xs text-slate-600 mt-0.5 block leading-relaxed">
                                {activeJob.verifierOutput.reasoning}
                              </span>
                            </div>
                          </div>

                          <div className="xs:text-right pt-2 xs:pt-0 border-t xs:border-t-0 xs:pl-4 xs:border-l border-current/15 shrink-0 flex xs:flex-col items-center xs:items-end justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-wider block text-slate-500 font-bold">
                              Confidence
                            </span>
                            <span className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tabular-nums">
                              {(activeJob.verifierOutput.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Confidence Meter Gauge with 70% Threshold Bar */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <Cpu className="w-3.5 h-3.5 text-teal-600" />
                              <span>Autonomous Confidence Calibration</span>
                              <span className="text-slate-400 font-normal hidden sm:inline">(≥70% required for automatic escrow release)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {(activeJob.verifierOutput.confidence * 100).toFixed(0)}%
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  activeJob.verifierOutput.confidence >= 0.7
                                    ? "badge-emerald"
                                    : "badge-rose"
                                }`}
                              >
                                {activeJob.verifierOutput.confidence >= 0.7 ? "Threshold Satisfied" : "Threshold Breached"}
                              </span>
                            </div>
                          </div>

                          {/* Visual Meter Bar */}
                          <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full transition-all duration-700 rounded-full ${
                                activeJob.verifierOutput.confidence >= 0.7
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-600"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, activeJob.verifierOutput.confidence * 100))}%` }}
                            />
                            {/* 70% threshold bar line */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
                              style={{ left: "70%" }}
                              title="Threshold Line: 70%"
                            />
                          </div>
                          <div className="relative text-[10px] font-mono text-slate-500 h-4">
                            <span className="absolute left-0">0% (Reject)</span>
                            <span className="absolute -translate-x-1/2 font-bold text-slate-800 whitespace-nowrap" style={{ left: "70%" }}>
                              ▲ 70% Release Threshold
                            </span>
                            <span className="absolute right-0">100% (Certainty)</span>
                          </div>
                        </div>

                        {/* Granular Criteria Breakdown */}
                        {activeJob.verifierOutput.criteriaBreakdown && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-900 block">
                              Detailed Criteria Audit:
                            </span>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                              {activeJob.verifierOutput.criteriaBreakdown.map((item, idx) => (
                                <div key={idx} className="p-3.5 flex items-start gap-3 text-xs">
                                  {item.status === "MET" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <span className="font-semibold text-slate-900 block">
                                      {item.criterion}
                                    </span>
                                    <span className="text-slate-500 text-[11px] mt-0.5 block leading-relaxed">
                                      {item.evidence}
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.status === "MET"
                                        ? "badge-emerald"
                                        : "badge-rose"
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* On-Chain Settlement Proof */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                          <span className="font-bold text-slate-900 block">On-Chain Delivery Proof & State:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Evidence Hash (SHA-256)</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(activeJob.verifierOutput?.evidenceHash || "", "Evidence Hash")}
                                  className="text-slate-400 hover:text-teal-600 transition"
                                >
                                  {copiedText === activeJob.verifierOutput?.evidenceHash ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <span className="font-mono text-slate-900 font-bold truncate block mt-0.5 text-[11px]">
                                {activeJob.verifierOutput.evidenceHash}
                              </span>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                              <span className="text-[10px] text-slate-400 block font-mono uppercase font-semibold">ReputationRegistry Delta</span>
                              <span
                                className={`font-mono font-bold mt-0.5 block ${
                                  activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                                  ? "+1 Point Recorded on Arc"
                                  : "-1 Point (Breach)"}
                              </span>
                            </div>
                          </div>

                        {/* Veris Autonomous Verification Engine - Execution Record */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/40 via-white to-slate-50/60 border border-teal-200/90 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              <span className="font-mono font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                                Veris Autonomous Verification Engine
                              </span>
                            </div>
                            <span className="badge-teal px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
                              All 5 Phases Executed
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-600">
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/70">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span>[01/05] SHA-256 Non-Repudiation Hash</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/70">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span>[02/05] Groq gpt-oss-120b Criteria Audit</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/70">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span>[03/05] Calibration Threshold Evaluated</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/70">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span>[04/05] Deterministic Settlement Executed</span>
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200/70">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span>[05/05] ReputationRegistry Minted on Arc</span>
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Shortcut to Contractor Profile */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("contractors");
                              setLookupAddress(activeJob.worker);
                              fetchReputation(activeJob.worker);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/90 text-teal-900 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            <span>Inspect Contractor&apos;s On-Chain Reputation Profile ({activeJob.worker.slice(0, 6)}...{activeJob.worker.slice(-4)}) &rarr;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (activeJob.state === "DELIVERABLE_SUBMITTED" || activeJob.state === "VERIFYING") ? (
                    <div className="p-6 sm:p-7 rounded-xl bg-gradient-to-br from-teal-50/40 via-white to-slate-50/60 border border-teal-200/90 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-100/80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/80 shadow-2xs">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 font-serif tracking-tight">
                                Veris Autonomous Verification Engine
                              </h3>
                              <span className="badge-teal px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold">
                                Ready to Audit
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Contractor deliverable has been submitted and queued for zero-bias AI audit and deterministic Arc settlement.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleVerifyAndSettle(activeJob.id)}
                          disabled={actionLoading}
                          className="px-5 py-3 btn-accent text-xs shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 font-semibold tracking-[-0.01em]"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{actionLoading ? "Evaluating Deliverable..." : "⚡ Run Verification & Settle Escrow"}</span>
                        </button>
                      </div>

                      {/* Pipeline Preview */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase font-bold text-slate-600 tracking-wider block">
                          Deterministic Execution Pipeline (5 Phases):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2 text-slate-700 shadow-2xs">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">1</span>
                            <span>SHA-256 Non-Repudiation Hash</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2 text-slate-700 shadow-2xs">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">2</span>
                            <span>Groq gpt-oss-120b Criteria Audit</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2 text-slate-700 shadow-2xs">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">3</span>
                            <span>Confidence Calibration (&ge; 70%)</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2 text-slate-700 shadow-2xs">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">4</span>
                            <span>Arc Settlement (${activeJob.amountUSDC} USDC)</span>
                          </div>
                          <div className="sm:col-span-2 p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center gap-2 text-slate-700 shadow-2xs">
                            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">5</span>
                            <span>ReputationRegistry On-Chain Minting</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                      Awaiting deliverable submission in Step 2 to perform verification.
                    </div>
                  )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 premium-card">
                No active milestones found.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONTRACTOR REPUTATION DIRECTORY */}
        {activeTab === "contractors" && (
          <div className="space-y-6">
            <div className="premium-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">Contractor Delivery Reputation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Query verified delivery track records stored on the Arc Testnet smart contract.
                  </p>
                </div>

                {/* Address Lookup Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => setLookupAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-64 h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                  <button
                    onClick={() => fetchReputation(lookupAddress)}
                    disabled={repLoading}
                    className="h-9 px-4 btn-accent text-xs font-semibold cursor-pointer tracking-[-0.01em] flex items-center justify-center shrink-0"
                  >
                    {repLoading ? "Querying..." : "Search"}
                  </button>
                </div>
              </div>

              {/* Quick Profile Shortcuts */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Quick Addresses:</span>
                <button
                  type="button"
                  onClick={() => {
                    const addr = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
                    setLookupAddress(addr);
                    fetchReputation(addr);
                  }}
                  className={`h-7 px-3 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center ${
                    lookupAddress.toLowerCase() === "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7".toLowerCase()
                      ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Contractor (0x8920...43e7)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const addr = "0x71C84167608922C0E63691C74B224E825a0b77A4";
                    setLookupAddress(addr);
                    fetchReputation(addr);
                  }}
                  className={`h-7 px-3 rounded-full text-[11px] font-mono border transition cursor-pointer flex items-center ${
                    lookupAddress.toLowerCase() === "0x71C84167608922C0E63691C74B224E825a0b77A4".toLowerCase()
                      ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Client (0x71C8...77A4)
                </button>
              </div>

              {reputationData && (
                <div className="space-y-6">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Trust Score</span>
                      <span className={`text-3xl font-serif font-bold mt-1.5 block tabular-nums ${
                        reputationData.score > 0 ? "text-emerald-600" : reputationData.score < 0 ? "text-rose-600" : "text-slate-800"
                      }`}>
                        {reputationData.score > 0 ? `+${reputationData.score}` : reputationData.score}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Success Rate</span>
                      <span className="text-3xl font-serif font-bold text-slate-900 mt-1.5 block tabular-nums">
                        {reputationData.successRate}%
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Milestones Completed</span>
                      <span className="text-3xl font-serif font-bold text-slate-900 mt-1.5 block tabular-nums">
                        {reputationData.totalJobs}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">Fulfilled / Breached</span>
                      <span className="text-3xl font-serif font-bold text-slate-900 mt-1.5 block tabular-nums">
                        <span className="text-emerald-600">{reputationData.successCount}</span> <span className="text-slate-300 font-normal">/</span>{" "}
                        <span className="text-rose-600">{reputationData.failCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Delivery History Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 text-[11px] font-medium mr-1">Filter:</span>
                      <button
                        onClick={() => setContractorFilter("ALL")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          contractorFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        All ({reputationData.history.length})
                      </button>
                      <button
                        onClick={() => setContractorFilter("SUCCESS")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          contractorFilter === "SUCCESS" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Fulfilled (+1)
                      </button>
                      <button
                        onClick={() => setContractorFilter("FAIL")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          contractorFilter === "FAIL" ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Breached (-1)
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Click any row to inspect cryptographic proof & rationale
                    </span>
                  </div>

                  {/* Delivery History Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50/30">
                    <table className="min-w-[620px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3.5 text-[11px] font-mono uppercase tracking-wider">Job ID</th>
                          <th className="p-3.5 text-[11px] font-mono uppercase tracking-wider">Delta</th>
                          <th className="p-3.5 text-[11px] font-mono uppercase tracking-wider">Outcome Summary</th>
                          <th className="p-3.5 text-[11px] font-mono uppercase tracking-wider">Evidence Hash</th>
                          <th className="p-3.5 text-[11px] font-mono uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {reputationData.history.filter((h) => {
                          if (contractorFilter === "SUCCESS") return h.scoreDelta > 0;
                          if (contractorFilter === "FAIL") return h.scoreDelta <= 0;
                          return true;
                        }).length > 0 ? (
                          reputationData.history
                            .filter((h) => {
                              if (contractorFilter === "SUCCESS") return h.scoreDelta > 0;
                              if (contractorFilter === "FAIL") return h.scoreDelta <= 0;
                              return true;
                            })
                            .map((h, idx) => {
                              const isExpanded = expandedRecordId === h.jobId;
                              return (
                                <React.Fragment key={idx}>
                                  <tr
                                    onClick={() => setExpandedRecordId(isExpanded ? null : h.jobId)}
                                    className={`hover:bg-slate-50/80 cursor-pointer transition ${
                                      isExpanded ? "bg-slate-50/90 font-medium" : ""
                                    }`}
                                  >
                                    <td className="p-3.5 text-teal-700 font-semibold flex items-center gap-1.5">
                                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? "rotate-90 text-teal-700" : ""}`} />
                                      <span>{h.jobId}</span>
                                    </td>
                                    <td className="p-3.5">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                          h.scoreDelta > 0
                                            ? "badge-emerald"
                                            : "badge-rose"
                                        }`}
                                      >
                                        {h.scoreDelta > 0 ? `+${h.scoreDelta}` : h.scoreDelta}
                                      </span>
                                    </td>
                                    <td className="p-3.5 font-sans text-slate-700 max-w-xs truncate">{h.reason}</td>
                                    <td className="p-3.5 text-slate-500 max-w-[140px] truncate">{h.evidenceHash}</td>
                                    <td className="p-3.5 text-slate-400">
                                      {new Date(h.timestamp).toLocaleDateString()}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="bg-slate-50/60 border-y border-teal-100">
                                      <td colSpan={5} className="p-4 space-y-3 font-sans text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                                              <span className="font-semibold uppercase">Cryptographic SHA-256 Proof</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopy(h.evidenceHash, "Evidence Hash");
                                                }}
                                                className="text-slate-400 hover:text-teal-600 transition"
                                              >
                                                {copiedText === h.evidenceHash ? (
                                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                  <Copy className="w-3.5 h-3.5" />
                                                )}
                                              </button>
                                            </div>
                                            <span className="font-mono text-slate-800 text-[11px] break-all block">
                                              {h.evidenceHash}
                                            </span>
                                          </div>
                                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                                              On-Chain State
                                            </span>
                                            <span className="text-slate-800 text-xs block">
                                              Settled on Arc Testnet &middot; Score Impact:{" "}
                                              <span className={h.scoreDelta > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                                {h.scoreDelta > 0 ? `+${h.scoreDelta} Point` : `${h.scoreDelta} Point`}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                                            Auditor Decision Notes
                                          </span>
                                          <p className="text-slate-700 leading-relaxed text-xs">
                                            {h.reason}
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                              No delivery records match the selected filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="premium-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">Cryptographic Audit Ledger</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Append-only audit stream tracking all milestone events, hashes, and on-chain settlements.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                  <span>Refresh Ledger</span>
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    Stage:
                  </span>
                  {[
                    { label: "All", val: "ALL" },
                    { label: "Funded", val: "FUNDED" },
                    { label: "Submitted", val: "DELIVERABLE_SUBMITTED" },
                    { label: "Approved", val: "VERIFIED_APPROVED" },
                    { label: "Rejected", val: "VERIFIED_REJECTED" },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      onClick={() => setAuditFilter(chip.val)}
                      className={`h-8 px-3 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center ${
                        auditFilter === chip.val
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search actor, stage, summary..."
                    className="w-full h-8 bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                  {auditSearch && (
                    <button
                      onClick={() => setAuditSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Ledger Table */}
              {(() => {
                const filtered = auditLogs.filter((log) => {
                  const matchesFilter = auditFilter === "ALL" || log.stage === auditFilter;
                  const q = auditSearch.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    log.stage.toLowerCase().includes(q) ||
                    log.actor.toLowerCase().includes(q) ||
                    log.inputSummary.toLowerCase().includes(q) ||
                    log.result.toLowerCase().includes(q);
                  return matchesFilter && matchesSearch;
                });

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Showing {filtered.length} of {auditLogs.length} cryptographic events</span>
                      {(auditFilter !== "ALL" || auditSearch) && (
                        <button
                          onClick={() => {
                            setAuditFilter("ALL");
                            setAuditSearch("");
                          }}
                          className="text-teal-600 hover:underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50/30">
                      <table className="min-w-[620px] w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                          <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">Lifecycle Event</th>
                            <th className="p-3">Actor</th>
                            <th className="p-3">Summary</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.length > 0 ? (
                            filtered.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/60">
                                <td className="p-3 text-slate-500 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                                    {log.stage}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 max-w-[120px] truncate" title={log.actor}>
                                  {log.actor.slice(0, 6)}...{log.actor.slice(-4)}
                                </td>
                                <td className="p-3 font-sans text-slate-700 max-w-sm truncate" title={log.inputSummary}>
                                  {log.inputSummary}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`font-semibold ${
                                      log.result === "SUCCESS" ? "text-emerald-600" : "text-rose-600"
                                    }`}
                                  >
                                    {log.result}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                                No audit events match your filter criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Veris Protocol Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md mt-16 sm:mt-20">
        <div className="w-full px-4 sm:px-8 lg:px-10 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-slate-200/70">
            {/* Col 1: Brand & Mission */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-sans font-extrabold text-base text-slate-900 tracking-tight block leading-tight">
                    Veris
                  </span>
                  <span className="text-[10px] text-teal-800/90 font-mono uppercase tracking-[0.14em] font-semibold block">
                    Autonomous Milestone Escrow
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Next-generation programmatic milestone escrow with deterministic AI evaluation, native USDC gas settlement, and on-chain contractor reputation on Arc Testnet.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span className="text-[11px] font-mono font-medium text-slate-600">
                  Arc Testnet · Chain 5042002 Operational
                </span>
              </div>
            </div>

            {/* Col 2: Protocol Architecture */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-900 tracking-wider">
                Protocol Architecture
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Arc USDC Gas Abstraction</span>
                </li>
                <li className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Groq gpt-oss-120b Autonomous Verifier</span>
                </li>
                <li className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Deterministic SHA-256 Non-Repudiation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>ReputationRegistry.sol On-Chain Minting</span>
                </li>
              </ul>
            </div>

            {/* Col 3: Quick Navigation */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-900 tracking-wider">
                Platform Workflows
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("wizard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-slate-600 hover:text-teal-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>&rarr;</span>
                    <span>Milestone Escrow Wizard</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("contractors");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-slate-600 hover:text-teal-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>&rarr;</span>
                    <span>Contractor Delivery Directory</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("audit");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-slate-600 hover:text-teal-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>&rarr;</span>
                    <span>Immutable Audit Ledger ({auditLogs.length})</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-teal-700 font-semibold hover:text-teal-900 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+</span>
                    <span>Create New Milestone</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: On-Chain Security & Finality */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-900 tracking-wider">
                Settlement Security
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Confidence Threshold</span>
                  <span className="font-bold text-slate-900">&ge; 70%</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Arc Settlement Speed</span>
                  <span className="font-bold text-emerald-700">&lt; 1 Second</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Audit Trail</span>
                  <span className="font-bold text-slate-900">Cryptographic SHA-256</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Veris Protocol</span>
              <span>·</span>
              <span>Autonomous Milestone Escrow &amp; Delivery Reputation</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-slate-400">Arc Testnet v1.0</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer transition"
              >
                Back to Top &uarr;
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="font-serif font-bold text-lg text-slate-900 tracking-tight">Create New Milestone Escrow</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-900 font-semibold block mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Arc Escrow Transfer Module"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-900 font-semibold block mb-1">USDC Amount</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-900 font-semibold block mb-1">Contractor Address</label>
                  <input
                    type="text"
                    value={newWorker}
                    onChange={(e) => setNewWorker(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-900 font-semibold block mb-1">
                  Acceptance Criteria (Evaluated by Verifier Agent)
                </label>
                <textarea
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  placeholder="1. Must export typed transfer function&#10;2. Must validate hex addresses&#10;3. Must include error handling"
                  rows={4}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono focus:outline-none focus:border-teal-600 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 btn-accent text-xs cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {actionLoading ? "Creating..." : "Create Escrow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

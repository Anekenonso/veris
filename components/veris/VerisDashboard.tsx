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
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  Coins,
  Send,
  Cpu,
  Clock,
  ChevronRight,
  Award,
  History,
  FileCode,
  FileText,
  FileBadge,
  Layers,
  Zap,
  Lock,
  UserCheck,
  Flame,
  ArrowUpRight,
  TrendingUp,
  CheckCheck,
  Code,
  SlidersHorizontal,
  Info,
} from "lucide-react";

const STAGES: { key: JobState; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "CREATED", label: "Spec Created", desc: "Criteria defined", icon: FileText },
  { key: "FUNDED", label: "USDC Locked", desc: "Native gas escrow", icon: Lock },
  { key: "DELIVERABLE_SUBMITTED", label: "Delivered", desc: "Evidence queued", icon: FileCode },
  { key: "VERIFYING", label: "AI Reasoning", desc: "Ambiguity check", icon: Cpu },
  { key: "RELEASED", label: "Settled", desc: "Deterministic payout", icon: Coins },
  { key: "REPUTATION_UPDATED", label: "On-Chain Rep", desc: "Registry updated", icon: Award },
];

export default function VerisDashboard() {
  const [activeTab, setActiveTab] = useState<"lifecycle" | "reputation" | "audit">("lifecycle");
  const [jobs, setJobs] = useState<EscrowJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // New Milestone Form State
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

  // Audit Logs State & Filter
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");

  // Fetch initial jobs
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
      toast.error("Failed to fetch jobs");
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
      toast.error("Failed to fetch on-chain reputation");
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

  const handleCopy = (text: string, label: string = "Hash") => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Actions
  const handleFundJob = async (jobId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/veris/jobs/${jobId}/fund`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Escrow funded! ${data.job.amountUSDC} USDC locked on Arc Testnet.`);
        await fetchJobs();
        await fetchAuditLogs();
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
      toast.error("Please provide deliverable content or code.");
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
        toast.success("Deliverable evidence submitted and queued for verification!");
        setDeliverableContent("");
        setDeliverableNotes("");
        await fetchJobs();
        await fetchAuditLogs();
      } else {
        toast.error(data.error || "Failed to submit deliverable");
      }
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndSettle = async (jobId: string) => {
    try {
      setActionLoading(true);
      toast.info("Running AI verifier and deterministic authority settlement...");
      const res = await fetch(`/api/veris/jobs/${jobId}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const decision = data.job.deterministicResult?.decision;
        if (decision === "APPROVED") {
          toast.success("Verification passed! USDC released & on-chain reputation awarded.");
        } else if (decision === "REJECTED") {
          toast.error("Verification rejected! Deliverable failed acceptance criteria.");
        } else {
          toast.warning("Verification flagged ambiguity — escalated to dispute.");
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

  // Quick Preset Scenarios
  const loadQuickGoodDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Implemented strictly with typed interfaces, regex verification, and comprehensive error handling.");
    setDeliverableContent(`import { CircleClient } from "@circle-fin/developer-controlled-wallets";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function transferEscrowFunds(
  recipient: string,
  amountUSDC: number,
  client: CircleClient
): Promise<string> {
  if (!ETH_ADDRESS_REGEX.test(recipient)) {
    throw new Error(\`Invalid recipient address format: "\${recipient}". Must be 42-char hex starting with 0x.\`);
  }
  if (typeof amountUSDC !== "number" || isNaN(amountUSDC) || amountUSDC <= 0) {
    throw new Error(\`Invalid transfer amount: "\${amountUSDC}". Must be a positive number greater than 0.\`);
  }

  try {
    const tx = await client.createTransaction({
      destinationAddress: recipient,
      amounts: [amountUSDC.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } }
    });
    return tx.data.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown transaction error";
    throw new Error(\`Failed to execute escrow transfer to \${recipient}: \${message}\`);
  }
}`);
    toast.success("Loaded Good Code deliverable template (Pass scenario)");
  };

  const loadQuickBadDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Unfinished stub missing input validation and error handling.");
    setDeliverableContent(`// Stub implementation missing parameter types and validations
export function transferEscrowFunds(recipient: any, amount: any) {
  // TODO: validate inputs
  console.log("Mock transfer");
  return "0xdummy_placeholder";
}`);
    toast.info("Loaded Broken Code deliverable template (Fail scenario)");
  };

  const filteredLogs = auditFilter === "ALL" 
    ? auditLogs 
    : auditLogs.filter(l => l.stage.includes(auditFilter));

  return (
    <div className="min-h-screen text-[#F1F5F9] flex flex-col font-sans relative overflow-x-hidden">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#070A14]/80 backdrop-blur-2xl sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-all">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-10 h-10 rounded-[14px] bg-[#0B1020] flex items-center justify-center border border-white/10 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight gradient-text-hero">
                VERIS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest font-bold">
                Arc Escrow
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight flex items-center gap-1.5 font-medium">
              <span>Autonomous Milestone Escrow</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400">Deterministic Authority</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">Portable Reputation</span>
            </p>
          </div>
        </div>

        {/* Live Network & Action Badges */}
        <div className="flex items-center gap-3">
          {/* Arc Testnet Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel-subtle text-xs font-mono border border-emerald-500/20 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">Arc Testnet:</span>
            <span className="text-emerald-300 font-bold">5042002</span>
          </div>

          {/* USDC Gas Token Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel-subtle text-xs font-mono border border-cyan-500/20 text-cyan-300">
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Gas:</span>
            <span className="font-bold">Native USDC</span>
          </div>

          {/* Create Milestone Modal Trigger */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ New Milestone</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs */}
      <div className="border-b border-white/[0.06] bg-[#070A14]/50 backdrop-blur-xl px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-panel-subtle border border-white/[0.08]">
          <button
            onClick={() => setActiveTab("lifecycle")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "lifecycle"
                ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Escrow Lifecycle</span>
          </button>

          <button
            onClick={() => setActiveTab("reputation")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "reputation"
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-200 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Reputation Registry</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Cryptographic Audit Trail</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Protocol Spec Badges */}
        <div className="hidden lg:flex items-center gap-2.5 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ARC CHAIN: 5042002</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>VERIFIER: Groq gpt-oss-120b</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>EVIDENCE: SHA-256</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* TAB 1: ESCROW LIFECYCLE */}
        {activeTab === "lifecycle" && (
          <div className="space-y-6">
            {/* Active Milestones Selector Bar */}
            <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Active Milestones:
                </span>
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer ${
                      selectedJobId === job.id
                        ? "bg-cyan-950/70 border-cyan-500/80 text-white shadow-md shadow-cyan-950/40 scale-[1.01]"
                        : "glass-panel-subtle text-slate-400 hover:text-slate-200 hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        job.state === "REPUTATION_UPDATED"
                          ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                          : job.state === "REFUNDED"
                          ? "bg-rose-400 shadow-sm shadow-rose-400"
                          : job.state === "ESCALATED"
                          ? "bg-amber-400 shadow-sm shadow-amber-400"
                          : "bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse"
                      }`}
                    />
                    <span className="font-semibold">{job.title}</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      ${job.amountUSDC} USDC
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={fetchJobs}
                className="p-2.5 rounded-xl glass-panel-subtle hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/[0.08]"
                title="Refresh jobs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>

            {activeJob ? (
              <>
                {/* Horizontal Lifecycle Stepper Card */}
                <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-extrabold tracking-tight text-white">
                          {activeJob.title}
                        </h2>
                        <span className="text-xs font-mono px-3 py-0.5 rounded-full bg-[#0B1020] text-cyan-400 border border-cyan-500/30 font-semibold">
                          ID: {activeJob.id}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                        <span>Client: <span className="text-slate-300 font-semibold">{activeJob.client.substring(0, 6)}...{activeJob.client.substring(38)}</span></span>
                        <span>•</span>
                        <span>Contractor: <span className="text-slate-300 font-semibold">{activeJob.worker.substring(0, 6)}...{activeJob.worker.substring(38)}</span></span>
                        <span>•</span>
                        <span className="text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          {activeJob.amountUSDC} USDC Locked
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">STATUS:</span>
                      <span
                        className={`text-xs font-mono font-bold px-3.5 py-1 rounded-full uppercase tracking-wider border shadow-md ${
                          activeJob.state === "REPUTATION_UPDATED"
                            ? activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-950/50 glow-emerald"
                              : "bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-950/50 glow-rose"
                            : activeJob.state === "ESCALATED"
                            ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-amber-950/50 glow-amber"
                            : "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-cyan-950/50 glow-cyan"
                        }`}
                      >
                        {activeJob.state.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Lifecycle Steps */}
                  <div className="pt-8 pb-3 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[760px] relative px-4">
                      {/* Connecting Line */}
                      <div className="absolute top-5 left-12 right-12 h-[2px] bg-slate-800 -z-0" />

                      {STAGES.map((stage, idx) => {
                        const isCurrent = activeJob.state === stage.key;
                        const isPast =
                          (stage.key === "CREATED" && activeJob.state !== "CREATED") ||
                          (stage.key === "FUNDED" && ["DELIVERABLE_SUBMITTED", "VERIFYING", "RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "DELIVERABLE_SUBMITTED" && ["VERIFYING", "RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "VERIFYING" && ["RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "RELEASED" && ["REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "REPUTATION_UPDATED" && activeJob.state === "REPUTATION_UPDATED");

                        const IconComp = stage.icon;

                        return (
                          <div key={stage.key} className="flex-1 flex flex-col items-center relative z-10 px-2">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                                isPast
                                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 scale-100"
                                  : isCurrent
                                  ? "bg-gradient-to-r from-cyan-400 to-indigo-500 text-black ring-4 ring-cyan-500/30 shadow-xl shadow-cyan-500/40 scale-110"
                                  : "bg-[#090D1A] text-slate-500 border border-white/[0.08]"
                              }`}
                            >
                              {isPast ? <Check className="w-5 h-5 stroke-[3]" /> : <IconComp className="w-4 h-4" />}
                            </div>
                            <span
                              className={`text-xs font-semibold mt-3 text-center ${
                                isCurrent
                                  ? "text-cyan-300 font-bold"
                                  : isPast
                                  ? "text-slate-200"
                                  : "text-slate-500"
                              }`}
                            >
                              {stage.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 text-center">
                              {stage.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2-Column Inspector Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Criteria & Deliverable */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Acceptance Criteria Card */}
                    <div className="glass-panel rounded-3xl p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-bold text-sm text-slate-100">
                            Milestone Acceptance Criteria
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                          Immutable Agreement
                        </span>
                      </div>
                      <pre className="mt-4 text-xs font-mono text-slate-300 bg-[#050814]/90 p-4 rounded-2xl border border-white/[0.08] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {activeJob.criteria}
                      </pre>
                    </div>

                    {/* Submitted Deliverable Card */}
                    <div className="glass-panel rounded-3xl p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <FileCode className="w-4 h-4 text-indigo-400" />
                          <h3 className="font-bold text-sm text-slate-100">
                            Submitted Deliverable Evidence
                          </h3>
                        </div>
                        {activeJob.deliverable && (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 uppercase font-semibold">
                            {activeJob.deliverable.type}
                          </span>
                        )}
                      </div>

                      {activeJob.deliverable ? (
                        <div className="mt-4 space-y-3">
                          <div className="relative">
                            <pre className="text-xs font-mono text-cyan-200/90 bg-[#050814]/90 p-4 rounded-2xl border border-white/[0.08] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                              {activeJob.deliverable.content}
                            </pre>
                            <button
                              onClick={() => handleCopy(activeJob.deliverable!.content, "Deliverable Code")}
                              className="absolute top-3 right-3 p-1.5 rounded-lg glass-panel-subtle hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
                              title="Copy code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {activeJob.deliverable.notes && (
                            <p className="text-xs text-slate-400 italic bg-[#070A18]/60 p-3 rounded-xl border border-white/[0.06]">
                              Contractor Note: {activeJob.deliverable.notes}
                            </p>
                          )}
                        </div>
                      ) : activeJob.state === "FUNDED" ? (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">1-Click Test Deliverables:</span>
                            <div className="flex gap-2">
                              <button
                                onClick={loadQuickGoodDeliverable}
                                className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                              >
                                + Good Code (Pass)
                              </button>
                              <button
                                onClick={loadQuickBadDeliverable}
                                className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                              >
                                + Broken Code (Fail)
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={deliverableContent}
                            onChange={(e) => setDeliverableContent(e.target.value)}
                            placeholder="Enter deliverable code, document, or report..."
                            rows={6}
                            className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all leading-relaxed"
                          />

                          <input
                            type="text"
                            value={deliverableNotes}
                            onChange={(e) => setDeliverableNotes(e.target.value)}
                            placeholder="Optional submission note..."
                            className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
                          />

                          <button
                            onClick={() => handleSubmitDeliverable(activeJob.id)}
                            disabled={actionLoading || !deliverableContent.trim()}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs transition-all shadow-xl shadow-cyan-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <Send className="w-4 h-4" />
                            <span>Submit Deliverable for AI Verification</span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 p-8 border border-dashed border-white/[0.08] rounded-2xl text-center text-xs text-slate-500">
                          {activeJob.state === "CREATED"
                            ? "Escrow must be funded with USDC before deliverable submission."
                            : "Deliverable evidence recorded on chain."}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Verifier & Authority Settlement */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Verifier Reasoning Card */}
                    <div className="glass-panel rounded-3xl p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-bold text-sm text-slate-100">
                            Verifier Intelligence & Calibration
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                          AI: Ambiguity | Code: Authority
                        </span>
                      </div>

                      {activeJob.verifierOutput ? (
                        <div className="mt-4 space-y-4">
                          {/* Radial / Stat Banner */}
                          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#050814]/90 border border-white/[0.08]">
                            <div className="flex items-center gap-3.5">
                              {/* Circular Confidence Meter with Gradient */}
                              <div className="relative w-14 h-14 flex items-center justify-center">
                                <svg className="w-14 h-14 transform -rotate-90">
                                  <defs>
                                    <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#38bdf8" />
                                      <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                  </defs>
                                  <circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    stroke="rgba(255, 255, 255, 0.08)"
                                    strokeWidth="4.5"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    stroke="url(#meterGradient)"
                                    strokeWidth="4.5"
                                    strokeDasharray={138.2}
                                    strokeDashoffset={138.2 - (138.2 * activeJob.verifierOutput.confidence)}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                    fill="transparent"
                                  />
                                </svg>
                                <span className="absolute font-mono font-bold text-xs text-white">
                                  {(activeJob.verifierOutput.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                                  Confidence
                                </span>
                                <span className="text-xs font-bold text-slate-200">
                                  {activeJob.verifierOutput.confidence >= 0.85
                                    ? "High Calibration"
                                    : "Moderate Confidence"}
                                </span>
                              </div>
                            </div>

                            <div className="border-l border-white/[0.08] pl-4 flex flex-col justify-center">
                              <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                                Authority Decision
                              </span>
                              <span
                                className={`text-base font-extrabold font-mono mt-0.5 ${
                                  activeJob.deterministicResult?.decision === "APPROVED"
                                    ? "text-emerald-400 glow-emerald"
                                    : activeJob.deterministicResult?.decision === "REJECTED"
                                    ? "text-rose-400 glow-rose"
                                    : "text-amber-400 glow-amber"
                                }`}
                              >
                                {activeJob.deterministicResult?.decision}
                              </span>
                            </div>
                          </div>

                          {/* Reasoning Summary */}
                          <div>
                            <span className="text-xs font-semibold text-slate-300">
                              LLM Reasoning Breakdown:
                            </span>
                            <p className="mt-1.5 text-xs text-slate-300 bg-[#070A18]/80 p-4 rounded-2xl border border-white/[0.08] leading-relaxed">
                              {activeJob.verifierOutput.reasoning}
                            </p>
                          </div>

                          {/* Criteria Breakdown */}
                          {activeJob.verifierOutput.criteriaBreakdown && (
                            <div>
                              <span className="text-xs font-semibold text-slate-300">
                                Granular Criteria Check:
                              </span>
                              <div className="mt-2 space-y-2">
                                {activeJob.verifierOutput.criteriaBreakdown.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl bg-[#050814]/70 border border-white/[0.06] flex items-start gap-3 text-xs"
                                  >
                                    {item.status === "MET" ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    ) : item.status === "PARTIAL" ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                      <span className="font-semibold text-slate-200">
                                        {item.criterion}
                                      </span>
                                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                        {item.evidence}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Evidence Hash Banner */}
                          <div className="p-3.5 rounded-2xl bg-[#050814]/90 border border-white/[0.08] flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                                Cryptographic SHA-256 Evidence Hash
                              </span>
                              <span className="font-mono text-xs text-cyan-300 truncate block mt-0.5">
                                {activeJob.verifierOutput.evidenceHash}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(activeJob.verifierOutput!.evidenceHash, "Evidence Hash")}
                              className="p-2 rounded-xl glass-panel-subtle hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                              title="Copy Evidence Hash"
                            >
                              {copiedText === activeJob.verifierOutput.evidenceHash ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-8 border border-dashed border-white/[0.08] rounded-2xl text-center text-xs text-slate-500">
                          {activeJob.state === "DELIVERABLE_SUBMITTED" ? (
                            <div className="space-y-4">
                              <p className="text-slate-300 text-sm">
                                Deliverable ready for autonomous verification.
                              </p>
                              <button
                                onClick={() => handleVerifyAndSettle(activeJob.id)}
                                disabled={actionLoading}
                                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 hover:scale-[1.02] text-white font-bold text-xs transition-all shadow-xl shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading ? "Evaluating Deliverable..." : "⚡ Run AI Verifier & Settle Escrow"}
                              </button>
                            </div>
                          ) : (
                            "Awaiting deliverable submission to initiate evaluation."
                          )}
                        </div>
                      )}
                    </div>

                    {/* Settlement & On-Chain Reputation Action */}
                    <div className="glass-panel rounded-3xl p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <FileBadge className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-bold text-sm text-slate-100">
                            On-Chain Settlement Outcome
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                          ReputationRegistry.sol
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#050814]/90 border border-white/[0.08] text-xs">
                          <span className="text-slate-400">Escrow Settlement:</span>
                          <span className="font-mono font-bold text-white">
                            {activeJob.state === "RELEASED" || activeJob.state === "REPUTATION_UPDATED"
                              ? activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                                ? "✅ Released to Contractor"
                                : "↩️ Refunded to Client"
                              : "Funds Locked in Escrow"}
                          </span>
                        </div>

                        {activeJob.reputationTxHash && (
                          <div className="p-3.5 rounded-2xl bg-[#050814]/90 border border-white/[0.08] flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">On-Chain Tx Hash:</span>
                            <span className="text-cyan-300 font-bold truncate max-w-[220px]">
                              {activeJob.reputationTxHash}
                            </span>
                          </div>
                        )}

                        {activeJob.reputationScoreDelta !== undefined && (
                          <div className="p-3.5 rounded-2xl bg-[#050814]/90 border border-white/[0.08] flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Reputation Delta:</span>
                            <span
                              className={`font-bold px-2.5 py-0.5 rounded-full ${
                                activeJob.reputationScoreDelta > 0
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-950 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {activeJob.reputationScoreDelta > 0 ? "+1 Point" : "-1 Point"}
                            </span>
                          </div>
                        )}

                        {activeJob.state === "CREATED" && (
                          <button
                            onClick={() => handleFundJob(activeJob.id)}
                            disabled={actionLoading}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-600/20 disabled:opacity-50 hover:scale-[1.01]"
                          >
                            Deposit & Fund Escrow ({activeJob.amountUSDC} USDC)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500">No active milestones found.</div>
            )}
          </div>
        )}

        {/* TAB 2: REPUTATION REGISTRY EXPLORER */}
        {activeTab === "reputation" && (
          <div className="space-y-6">
            {/* Address Search Bar */}
            <div className="glass-panel rounded-3xl p-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-cyan-400 ml-2" />
              <input
                type="text"
                value={lookupAddress}
                onChange={(e) => setLookupAddress(e.target.value)}
                placeholder="Enter contractor wallet address (0x...)"
                className="flex-1 bg-transparent border-none text-xs font-mono text-white focus:outline-none placeholder:text-slate-600"
              />
              <button
                onClick={() => fetchReputation(lookupAddress)}
                disabled={repLoading}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
              >
                {repLoading ? "Querying Arc..." : "Query On-Chain"}
              </button>
            </div>

            {reputationData && (
              <>
                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Cumulative Trust Score
                    </span>
                    <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                      {reputationData.score > 0 ? `+${reputationData.score}` : reputationData.score}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      ReputationRegistry.sol
                    </span>
                  </div>

                  <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Delivery Success Rate
                    </span>
                    <div className="text-3xl font-extrabold font-mono text-cyan-300 mt-2">
                      {reputationData.successRate}%
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      Verified deliverable fulfillment
                    </span>
                  </div>

                  <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Total Deliveries
                    </span>
                    <div className="text-3xl font-extrabold font-mono text-white mt-2">
                      {reputationData.totalJobs}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      Completed milestones
                    </span>
                  </div>

                  <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Fulfilled / Refunded
                    </span>
                    <div className="text-3xl font-extrabold font-mono mt-2 flex items-center gap-2">
                      <span className="text-emerald-400">{reputationData.successCount}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-400">{reputationData.failCount}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      Full delivery track record
                    </span>
                  </div>
                </div>

                {/* Verified Delivery Records Table */}
                <div className="glass-panel rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <h3 className="font-bold text-sm text-slate-200">
                      Verified On-Chain Delivery History
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Target: {lookupAddress.substring(0, 8)}...{lookupAddress.substring(36)}
                    </span>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/[0.08] pb-2">
                          <th className="pb-3">Job ID</th>
                          <th className="pb-3">Score Delta</th>
                          <th className="pb-3">Outcome Summary</th>
                          <th className="pb-3">Evidence Hash</th>
                          <th className="pb-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {reputationData.history.length > 0 ? (
                          reputationData.history.map((h, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-3.5 text-cyan-300 font-bold">{h.jobId}</td>
                              <td className="py-3.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                                    h.scoreDelta > 0
                                      ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                                      : "bg-rose-950 text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {h.scoreDelta > 0 ? `+${h.scoreDelta}` : h.scoreDelta}
                                </span>
                              </td>
                              <td className="py-3.5 text-slate-300 max-w-xs truncate">{h.reason}</td>
                              <td className="py-3.5 text-slate-400 max-w-[160px] truncate font-mono">
                                {h.evidenceHash}
                              </td>
                              <td className="py-3.5 text-slate-500 whitespace-nowrap">
                                {new Date(h.timestamp).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-500 font-mono">
                              No on-chain delivery history recorded for this address.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="font-extrabold text-base text-white">Cryptographic Audit Trail</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Append-only JSONL proof stream capturing every state transition, verifier reasoning, and tx hash
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3.5 py-2 rounded-2xl glass-panel-subtle hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#070A18] text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3.5">Time</th>
                      <th className="p-3.5">Lifecycle Stage</th>
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Action & Input Summary</th>
                      <th className="p-3.5">Evidence Hash</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Env</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/[0.08] text-cyan-300 font-bold text-[11px]">
                            {log.stage}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300 max-w-[120px] truncate">{log.actor}</td>
                        <td className="p-3.5 text-slate-200 max-w-sm truncate">{log.inputSummary}</td>
                        <td className="p-3.5 text-cyan-300 max-w-[130px] truncate font-mono">
                          {log.evidenceHash || "—"}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`font-bold ${
                              log.result === "SUCCESS"
                                ? "text-emerald-400"
                                : log.result === "FAILED"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-white/[0.08]">
                            {log.environment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-white/[0.12]">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <h3 className="font-extrabold text-base text-white">Create New Escrow Milestone</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Audit Escrow Smart Contract"
                  required
                  className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">USDC Amount</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contractor Address</label>
                  <input
                    type="text"
                    value={newWorker}
                    onChange={(e) => setNewWorker(e.target.value)}
                    required
                    className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-xl p-3 font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Acceptance Criteria (Evaluated by Verifier Agent)
                </label>
                <textarea
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  placeholder="1. Must include full Slither audit report&#10;2. Zero critical findings&#10;3. Bytecode gas optimizations included"
                  rows={4}
                  required
                  className="w-full bg-[#050814]/90 border border-white/[0.08] rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-500/60 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl glass-panel-subtle hover:bg-white/[0.08] text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20 hover:scale-[1.02]"
                >
                  {actionLoading ? "Creating..." : "Create Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

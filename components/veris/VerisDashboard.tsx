"use client";

import React, { useState, useEffect } from "react";
import { EscrowJob, JobState } from "@/lib/orchestrator/jobStore";
import { AuditEntry } from "@/lib/audit/auditLogger";
import { ReputationSummary, OnChainJobRecord } from "@/lib/contracts/reputationRegistry";
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
} from "lucide-react";

const STAGES: { key: JobState; label: string }[] = [
  { key: "CREATED", label: "Created" },
  { key: "FUNDED", label: "Funded (USDC)" },
  { key: "DELIVERABLE_SUBMITTED", label: "Delivered" },
  { key: "VERIFYING", label: "AI Verifying" },
  { key: "RELEASED", label: "Released" },
  { key: "REPUTATION_UPDATED", label: "Reputation On-Chain" },
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
  const [newAmount, setNewAmount] = useState("200");
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

  // Fetch initial jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/veris/jobs");
      const data = await res.json();
      if (data.success && data.jobs.length > 0) {
        setJobs(data.jobs);
        if (!selectedJobId) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Actions
  const handleFundJob = async (jobId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/veris/jobs/${jobId}/fund`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
        await fetchAuditLogs();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDeliverable = async (jobId: string) => {
    if (!deliverableContent.trim()) return;
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
        setDeliverableContent("");
        setDeliverableNotes("");
        await fetchJobs();
        await fetchAuditLogs();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndSettle = async (jobId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/veris/jobs/${jobId}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
        await fetchAuditLogs();
        if (activeJob) {
          await fetchReputation(activeJob.worker);
        }
      }
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
        setShowCreateModal(false);
        setNewTitle("");
        setNewCriteria("");
        await fetchJobs();
        setSelectedJobId(data.job.id);
        await fetchAuditLogs();
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Quick preset loaders
  const loadQuickGoodDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Implemented with 100% test coverage and strict TypeScript hex validation.");
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
  };

  const loadQuickBadDeliverable = () => {
    setDeliverableType("code");
    setDeliverableNotes("Quick unfinished draft.");
    setDeliverableContent(`// Incomplete draft
export function transferEscrowFunds(recipient: any, amount: any) {
  // TODO: validate inputs
  console.log("Mock transfer");
  return "0xdummy";
}`);
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0A0E1A]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0B0F1E] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                VERIS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-700/50 uppercase tracking-wider font-semibold">
                Autonomous Escrow
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              AI Verification + Deterministic Settlement + On-Chain Reputation
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Network:</span>
            <span className="text-slate-200 font-semibold">Arc Testnet (5042002)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-xs font-mono">
            <Coins className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-indigo-300">Gas:</span>
            <span className="text-white font-semibold">Native USDC</span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ New Milestone</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800/80 bg-[#080C17] px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("lifecycle")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "lifecycle"
                ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Milestone Lifecycle</span>
          </button>

          <button
            onClick={() => setActiveTab("reputation")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "reputation"
                ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>On-Chain Reputation Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Proof Surface</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] text-slate-300">
              {auditLogs.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
          <span className="text-emerald-400 font-semibold">● TESTNET</span>
          <span>|</span>
          <span className="text-cyan-400 font-semibold">● MEASURED</span>
          <span>|</span>
          <span className="text-indigo-400 font-semibold">● REAL</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: MILESTONE LIFECYCLE */}
        {activeTab === "lifecycle" && (
          <div className="space-y-6">
            {/* Job Selector Bar */}
            <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                <span className="text-xs font-mono text-slate-400 font-semibold whitespace-nowrap">
                  ACTIVE JOBS:
                </span>
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer ${
                      selectedJobId === job.id
                        ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-900/20"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        job.state === "REPUTATION_UPDATED"
                          ? "bg-emerald-400"
                          : job.state === "REFUNDED"
                          ? "bg-rose-400"
                          : job.state === "ESCALATED"
                          ? "bg-amber-400"
                          : "bg-cyan-400"
                      }`}
                    />
                    <span className="font-semibold">{job.title}</span>
                    <span className="font-mono text-slate-400">({job.amountUSDC} USDC)</span>
                  </button>
                ))}
              </div>

              <button
                onClick={fetchJobs}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                title="Refresh jobs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {activeJob ? (
              <>
                {/* State Progress Stepper */}
                <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold tracking-tight text-white">
                          {activeJob.title}
                        </h2>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          ID: {activeJob.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                        <span>Client: {activeJob.client.substring(0, 8)}...{activeJob.client.substring(36)}</span>
                        <span>•</span>
                        <span>Worker: {activeJob.worker.substring(0, 8)}...{activeJob.worker.substring(36)}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-bold">{activeJob.amountUSDC} USDC</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">STATUS:</span>
                      <span
                        className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                          activeJob.state === "REPUTATION_UPDATED"
                            ? activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                              : "bg-rose-950/80 border-rose-500 text-rose-300"
                            : activeJob.state === "ESCALATED"
                            ? "bg-amber-950/80 border-amber-500 text-amber-300"
                            : "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                        }`}
                      >
                        {activeJob.state.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Lifecycle Steps */}
                  <div className="pt-6 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[700px] relative">
                      {STAGES.map((stage, idx) => {
                        const isCurrent = activeJob.state === stage.key;
                        const isPast =
                          (stage.key === "CREATED" && activeJob.state !== "CREATED") ||
                          (stage.key === "FUNDED" && ["DELIVERABLE_SUBMITTED", "VERIFYING", "RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "DELIVERABLE_SUBMITTED" && ["VERIFYING", "RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "VERIFYING" && ["RELEASED", "REFUNDED", "REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "RELEASED" && ["REPUTATION_UPDATED"].includes(activeJob.state)) ||
                          (stage.key === "REPUTATION_UPDATED" && activeJob.state === "REPUTATION_UPDATED");

                        return (
                          <div key={stage.key} className="flex-1 flex flex-col items-center relative z-10">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all ${
                                isPast
                                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                                  : isCurrent
                                  ? "bg-cyan-500 text-black ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/40 animate-pulse"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                            >
                              {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] font-semibold mt-2 text-center ${
                                isCurrent
                                  ? "text-cyan-400 font-bold"
                                  : isPast
                                  ? "text-slate-200"
                                  : "text-slate-500"
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Criteria & Deliverable Inspector */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Acceptance Criteria Card */}
                    <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-semibold text-sm text-slate-200">
                            Agreed Acceptance Criteria
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Locked in Escrow
                        </span>
                      </div>
                      <pre className="mt-3 text-xs font-mono text-slate-300 bg-slate-950/70 p-4 rounded-xl border border-slate-800/70 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {activeJob.criteria}
                      </pre>
                    </div>

                    {/* Submitted Deliverable Card */}
                    <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-indigo-400" />
                          <h3 className="font-semibold text-sm text-slate-200">
                            Submitted Deliverable
                          </h3>
                        </div>
                        {activeJob.deliverable && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 uppercase">
                            {activeJob.deliverable.type}
                          </span>
                        )}
                      </div>

                      {activeJob.deliverable ? (
                        <div className="mt-3 space-y-3">
                          <pre className="text-xs font-mono text-cyan-200/90 bg-slate-950/70 p-4 rounded-xl border border-slate-800/70 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                            {activeJob.deliverable.content}
                          </pre>
                          {activeJob.deliverable.notes && (
                            <p className="text-xs text-slate-400 italic bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                              Contractor note: {activeJob.deliverable.notes}
                            </p>
                          )}
                        </div>
                      ) : activeJob.state === "FUNDED" ? (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Quick-load sample deliverables:</span>
                            <div className="flex gap-2">
                              <button
                                onClick={loadQuickGoodDeliverable}
                                className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 text-xs font-medium cursor-pointer"
                              >
                                + Good Code
                              </button>
                              <button
                                onClick={loadQuickBadDeliverable}
                                className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 hover:bg-rose-900 text-xs font-medium cursor-pointer"
                              >
                                + Incomplete Code
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={deliverableContent}
                            onChange={(e) => setDeliverableContent(e.target.value)}
                            placeholder="Paste your completed work, code, or article here..."
                            rows={6}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />

                          <input
                            type="text"
                            value={deliverableNotes}
                            onChange={(e) => setDeliverableNotes(e.target.value)}
                            placeholder="Optional notes for verifier agent..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />

                          <button
                            onClick={() => handleSubmitDeliverable(activeJob.id)}
                            disabled={actionLoading || !deliverableContent.trim()}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Deliverable for Verification</span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                          {activeJob.state === "CREATED"
                            ? "Escrow must be funded with USDC before deliverable submission."
                            : "Deliverable details recorded."}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Verifier & Settlement Authority */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Verifier Reasoning Card */}
                    <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <h3 className="font-semibold text-sm text-slate-200">
                            Verifier Intelligence & Decision
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                          AI: Ambiguity | Code: Authority
                        </span>
                      </div>

                      {activeJob.verifierOutput ? (
                        <div className="mt-4 space-y-4">
                          {/* Confidence & Decision Header */}
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                VERIFIER CONFIDENCE
                              </span>
                              <div className="text-xl font-bold font-mono text-cyan-400">
                                {(activeJob.verifierOutput.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                DETERMINISTIC RESULT
                              </span>
                              <div
                                className={`text-sm font-bold font-mono ${
                                  activeJob.deterministicResult?.decision === "APPROVED"
                                    ? "text-emerald-400"
                                    : activeJob.deterministicResult?.decision === "REJECTED"
                                    ? "text-rose-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {activeJob.deterministicResult?.decision}
                              </div>
                            </div>
                          </div>

                          {/* Reasoning */}
                          <div>
                            <span className="text-xs font-semibold text-slate-300">
                              Reasoning Summary:
                            </span>
                            <p className="mt-1.5 text-xs text-slate-300 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                              {activeJob.verifierOutput.reasoning}
                            </p>
                          </div>

                          {/* Criteria Breakdown */}
                          {activeJob.verifierOutput.criteriaBreakdown && (
                            <div>
                              <span className="text-xs font-semibold text-slate-300">
                                Criteria Breakdown:
                              </span>
                              <div className="mt-2 space-y-2">
                                {activeJob.verifierOutput.criteriaBreakdown.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 flex items-start gap-2.5 text-xs"
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
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {item.evidence}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Evidence Hash */}
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="text-[10px] font-mono text-slate-500 uppercase block">
                                SHA256 Evidence Hash (Locked on-chain)
                              </span>
                              <span className="font-mono text-xs text-cyan-400 truncate block">
                                {activeJob.verifierOutput.evidenceHash}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(activeJob.verifierOutput!.evidenceHash)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                            >
                              {copiedText === activeJob.verifierOutput.evidenceHash ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                          {activeJob.state === "DELIVERABLE_SUBMITTED" ? (
                            <div className="space-y-3">
                              <p className="text-slate-300">
                                Deliverable submitted and queued for Verifier Agent.
                              </p>
                              <button
                                onClick={() => handleVerifyAndSettle(activeJob.id)}
                                disabled={actionLoading}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading ? "Evaluating Deliverable..." : "⚡ Run Verifier & Settle Escrow"}
                              </button>
                            </div>
                          ) : (
                            "Awaiting deliverable submission to initiate evaluation."
                          )}
                        </div>
                      )}
                    </div>

                    {/* Settlement & Reputation Settlement Card */}
                    <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <FileBadge className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-semibold text-sm text-slate-200">
                            On-Chain Settlement & Reputation Event
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                          Arc Testnet
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <span className="text-slate-400">Escrow Action:</span>
                          <span className="font-mono font-semibold text-white">
                            {activeJob.state === "RELEASED" || activeJob.state === "REPUTATION_UPDATED"
                              ? activeJob.reputationScoreDelta && activeJob.reputationScoreDelta > 0
                                ? "✅ Released to Worker"
                                : "↩️ Refunded to Client"
                              : "Funds Locked in Escrow"}
                          </span>
                        </div>

                        {activeJob.reputationTxHash && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">ReputationRegistry Tx:</span>
                            <span className="text-cyan-400 truncate max-w-[200px]">
                              {activeJob.reputationTxHash}
                            </span>
                          </div>
                        )}

                        {activeJob.reputationScoreDelta !== undefined && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Reputation Delta:</span>
                            <span
                              className={`font-bold ${
                                activeJob.reputationScoreDelta > 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {activeJob.reputationScoreDelta > 0 ? "+1" : "-1"} Points
                            </span>
                          </div>
                        )}

                        {activeJob.state === "CREATED" && (
                          <button
                            onClick={() => handleFundJob(activeJob.id)}
                            disabled={actionLoading}
                            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
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
              <div className="p-12 text-center text-slate-500">No active jobs found.</div>
            )}
          </div>
        )}

        {/* TAB 2: REPUTATION EXPLORER */}
        {activeTab === "reputation" && (
          <div className="space-y-6">
            {/* Search Address Bar */}
            <div className="bg-[#0B1020] border border-slate-800/90 rounded-2xl p-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 ml-2" />
              <input
                type="text"
                value={lookupAddress}
                onChange={(e) => setLookupAddress(e.target.value)}
                placeholder="Enter contractor address (0x...)"
                className="flex-1 bg-transparent border-none text-xs font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => fetchReputation(lookupAddress)}
                disabled={repLoading}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                {repLoading ? "Querying..." : "Query On-Chain"}
              </button>
            </div>

            {reputationData && (
              <>
                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Cumulative Score
                    </span>
                    <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">
                      {reputationData.score > 0 ? `+${reputationData.score}` : reputationData.score}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      ReputationRegistry.sol
                    </span>
                  </div>

                  <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Success Rate
                    </span>
                    <div className="text-3xl font-bold font-mono text-cyan-400 mt-2">
                      {reputationData.successRate}%
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Verified deliverable fulfillment
                    </span>
                  </div>

                  <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Total Deliveries
                    </span>
                    <div className="text-3xl font-bold font-mono text-white mt-2">
                      {reputationData.totalJobs}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Completed milestones
                    </span>
                  </div>

                  <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Success / Refunded
                    </span>
                    <div className="text-3xl font-bold font-mono mt-2 flex items-center gap-2">
                      <span className="text-emerald-400">{reputationData.successCount}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-400">{reputationData.failCount}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Full delivery track record
                    </span>
                  </div>
                </div>

                {/* Delivery History Table */}
                <div className="bg-[#0B1020] border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-sm text-slate-200 pb-3 border-b border-slate-800">
                    Verified On-Chain Delivery Events
                  </h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 pb-2">
                          <th className="pb-2">Job ID</th>
                          <th className="pb-2">Delta</th>
                          <th className="pb-2">Reason / Outcome</th>
                          <th className="pb-2">Evidence Hash</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {reputationData.history.length > 0 ? (
                          reputationData.history.map((h, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="py-3 text-cyan-300 font-semibold">{h.jobId}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold ${
                                    h.scoreDelta > 0
                                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                      : "bg-rose-950 text-rose-400 border border-rose-800"
                                  }`}
                                >
                                  {h.scoreDelta > 0 ? `+${h.scoreDelta}` : h.scoreDelta}
                                </span>
                              </td>
                              <td className="py-3 text-slate-300 max-w-xs truncate">{h.reason}</td>
                              <td className="py-3 text-slate-400 max-w-[150px] truncate">
                                {h.evidenceHash}
                              </td>
                              <td className="py-3 text-slate-500">
                                {new Date(h.timestamp).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No delivery records found for this address.
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
                <h3 className="font-bold text-base text-white">Cryptographic Audit Trail</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Append-only JSONL event stream capturing every state transition and tx hash
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="bg-[#0B1020] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Summary</th>
                      <th className="p-3">Evidence Hash</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">Env</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
                            {log.stage}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 max-w-[120px] truncate">{log.actor}</td>
                        <td className="p-3 text-slate-200 max-w-sm truncate">{log.inputSummary}</td>
                        <td className="p-3 text-cyan-400 max-w-[120px] truncate">
                          {log.evidenceHash || "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold ${
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
                        <td className="p-3 text-slate-400">{log.environment}</td>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1020] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Escrow Milestone</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Audit Escrow Smart Contract"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">USDC Amount</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Worker Address</label>
                  <input
                    type="text"
                    value={newWorker}
                    onChange={(e) => setNewWorker(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Acceptance Criteria (Evaluated by Verifier Agent)
                </label>
                <textarea
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  placeholder="1. Must include Slither audit report&#10;2. Zero critical findings&#10;3. Gas optimization suggestions included"
                  rows={4}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold cursor-pointer disabled:opacity-50"
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

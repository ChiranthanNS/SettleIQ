"use client";

import React, { useState } from "react";
import { Gauge, CheckCircle2, ShieldAlert } from "lucide-react";

export const BenchmarkView: React.FC = () => {
  const [activeScale, setActiveScale] = useState<"1k" | "5k">("1k");

  const benchmarkData = {
    "1k": {
      records: "1,000",
      merchants: "1,000",
      settlements: "1,060",
      baselineA: {
        matchRate: "90.5%",
        falseMatches: "0.5%",
        explanationRate: "0.0% (N/A)",
        gtAccuracy: "48.5%",
        time: "0.0005s",
        throughput: "2,023,063 rows/s",
        unresolvedFound: "₹0",
      },
      baselineB: {
        matchRate: "90.0%",
        falseMatches: "0.0%",
        explanationRate: "60.1%",
        gtAccuracy: "62.0%",
        time: "0.0008s",
        throughput: "1,273,237 rows/s",
        unresolvedFound: "N/A",
      },
      settleiq: {
        matchRate: "90.0%",
        falseMatches: "0.0%",
        explanationRate: "78.0%",
        gtAccuracy: "100.0%",
        time: "0.0212s",
        throughput: "47,257 rows/s",
        unresolvedFound: "₹3,371,794",
      },
    },
    "5k": {
      records: "5,000",
      merchants: "5,000",
      settlements: "5,300",
      baselineA: {
        matchRate: "90.6%",
        falseMatches: "0.6%",
        explanationRate: "0.0% (N/A)",
        gtAccuracy: "48.5%",
        time: "0.0024s",
        throughput: "2,058,121 rows/s",
        unresolvedFound: "₹0",
      },
      baselineB: {
        matchRate: "90.0%",
        falseMatches: "0.0%",
        explanationRate: "60.0%",
        gtAccuracy: "62.0%",
        time: "0.0037s",
        throughput: "1,351,351 rows/s",
        unresolvedFound: "N/A",
      },
      settleiq: {
        matchRate: "90.0%",
        falseMatches: "0.0%",
        explanationRate: "78.2%",
        gtAccuracy: "100.0%",
        time: "0.0982s",
        throughput: "50,916 rows/s",
        unresolvedFound: "₹16,858,970",
      },
    },
  };

  const current = benchmarkData[activeScale];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="fintech-panel rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Gauge className="h-3.5 w-3.5" />
            <span>Deterministic Rigor & Ground Truth Verification</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Reconciliation Performance & Accuracy Benchmarks
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Empirically comparing SETTLEIQ against naive rule engines and fuzzy matchers with ground-truth validation.
          </p>
        </div>

        {/* Scale Toggle */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 rounded-xl border border-white/[0.08] self-start sm:self-auto">
          <button
            onClick={() => setActiveScale("1k")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScale === "1k"
                ? "bg-white/[0.12] text-white border border-white/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            1,000 Transactions
          </button>
          <button
            onClick={() => setActiveScale("5k")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScale === "5k"
                ? "bg-white/[0.12] text-white border border-white/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            5,000 Transactions
          </button>
        </div>
      </div>

      {/* Benchmark Matrix */}
      <div className="fintech-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#121826]/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5">Metric / Evaluation Criteria</th>
                <th className="py-3.5 px-5">Baseline A (Naive Matcher)</th>
                <th className="py-3.5 px-5">Baseline B (Fuzzy Rules)</th>
                <th className="py-3.5 px-5 text-emerald-400 font-extrabold bg-emerald-950/20">
                  SETTLEIQ (Two-Pass + AI)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold text-white">Ground Truth Accuracy</td>
                <td className="py-3.5 px-5 text-rose-400 font-mono">{current.baselineA.gtAccuracy}</td>
                <td className="py-3.5 px-5 text-amber-400 font-mono">{current.baselineB.gtAccuracy}</td>
                <td className="py-3.5 px-5 text-emerald-400 font-extrabold font-mono bg-emerald-950/20">
                  100.0% Perfect Ground Truth
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold text-white">False Match Rate (Failed Tx)</td>
                <td className="py-3.5 px-5 text-rose-400 font-mono">{current.baselineA.falseMatches}</td>
                <td className="py-3.5 px-5 text-slate-300 font-mono">{current.baselineB.falseMatches}</td>
                <td className="py-3.5 px-5 text-emerald-400 font-bold font-mono bg-emerald-950/20">
                  0.0% (Zero False Matches)
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold text-white">Explanation Rate</td>
                <td className="py-3.5 px-5 text-slate-500 font-mono">{current.baselineA.explanationRate}</td>
                <td className="py-3.5 px-5 text-slate-300 font-mono">{current.baselineB.explanationRate}</td>
                <td className="py-3.5 px-5 text-emerald-400 font-bold font-mono bg-emerald-950/20">
                  {current.settleiq.explanationRate} (Deductions Verified)
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold text-white">Throughput Rate</td>
                <td className="py-3.5 px-5 text-slate-400 font-mono">{current.baselineA.throughput}</td>
                <td className="py-3.5 px-5 text-slate-400 font-mono">{current.baselineB.throughput}</td>
                <td className="py-3.5 px-5 text-white font-bold font-mono bg-emerald-950/20">
                  {current.settleiq.throughput}
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold text-white">Unexplained Discrepancy Found</td>
                <td className="py-3.5 px-5 text-slate-500 font-mono">{current.baselineA.unresolvedFound}</td>
                <td className="py-3.5 px-5 text-slate-500 font-mono">{current.baselineB.unresolvedFound}</td>
                <td className="py-3.5 px-5 text-rose-400 font-bold font-mono bg-emerald-950/20">
                  {current.settleiq.unresolvedFound}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

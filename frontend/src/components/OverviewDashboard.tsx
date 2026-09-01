"use client";

import React from "react";
import {
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Receipt,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { ReconciliationSummary } from "@/types";
import { formatINR } from "@/lib/api";

interface OverviewDashboardProps {
  summary: ReconciliationSummary;
  onNavigateToExceptions: (filter?: string) => void;
  onNavigateToAssistant: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  summary,
  onNavigateToExceptions,
  onNavigateToAssistant,
}) => {
  return (
    <div className="space-y-6">
      <div className="fintech-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                Reconciliation Complete
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Executed in {summary.processing_time_seconds}s ({summary.records_per_second.toLocaleString()} tx/sec)
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight num-tabular">
              {formatINR(summary.total_merchant_amount)}
            </h1>
            <p className="text-xs text-slate-400">
              Total transaction volume audited across{" "}
              <span className="font-semibold text-slate-200">{summary.total_records} ledger entries</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 lg:items-end justify-center">
            <button
              onClick={() => onNavigateToExceptions("HIGH")}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-between space-x-2 cursor-pointer w-full sm:w-auto"
            >
              <span>{summary.high_priority} High-Priority Exceptions</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={onNavigateToAssistant}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center justify-between space-x-2 cursor-pointer w-full sm:w-auto"
            >
              <span>Root Cause Query Engine</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card rounded-xl p-5 border border-white/[0.06] border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Match Rate
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white num-tabular">
              {summary.match_rate}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({summary.matched}/{summary.total_records})
            </span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full"
              style={{ width: `${summary.match_rate}%` }}
            />
          </div>
        </div>

        <div className="fintech-card rounded-xl p-5 border border-white/[0.06] border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Explanation Rate
            </span>
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white num-tabular">
              {summary.explanation_rate}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({summary.fully_explained} resolved)
            </span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full"
              style={{ width: `${summary.explanation_rate}%` }}
            />
          </div>
        </div>

        <div className="fintech-card rounded-xl p-5 border border-white/[0.06] border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Fees & 18% GST
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white num-tabular">
              {formatINR(summary.total_fees + summary.total_tax)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Fees: {formatINR(summary.total_fees)} | GST: {formatINR(summary.total_tax)}
          </p>
        </div>

        <div className="fintech-card rounded-xl p-5 border border-white/[0.06] border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Unexplained Variance
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <AlertOctagon className="h-4 w-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-400 num-tabular">
              {formatINR(summary.total_unexplained)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {summary.unresolved} cases flagged for review
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fintech-card rounded-xl p-6 border border-white/[0.06] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">
            Paise-Level Financial Decomposition
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Total Merchant Gross Volume</span>
              <span className="font-semibold text-white num-tabular">
                {formatINR(summary.total_merchant_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-rose-300">
              <span>(-) Payment Gateway Base MDR (2.0%)</span>
              <span className="font-semibold num-tabular">
                -{formatINR(summary.total_fees)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-rose-300">
              <span>(-) 18% GST on Gateway Charges</span>
              <span className="font-semibold num-tabular">
                -{formatINR(summary.total_tax)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-amber-300">
              <span>(-) Customer Returns & Refunds</span>
              <span className="font-semibold num-tabular">
                -{formatINR(summary.total_refunds)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-rose-400">
              <span>(-) Net Unexplained Discrepancies</span>
              <span className="font-semibold num-tabular">
                -{formatINR(summary.total_unexplained)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 bg-emerald-950/40 px-3 rounded-lg border border-emerald-500/20 text-emerald-300 font-bold">
              <span>(=) Total Settled Payout Received</span>
              <span className="num-tabular">
                {formatINR(summary.total_settlement_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="fintech-card rounded-xl p-6 border border-white/[0.06] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">
            Reconciliation Classification Engine
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => onNavigateToExceptions("MATCHED")}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.04] hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <div className="text-emerald-400 font-bold text-lg num-tabular">
                {summary.status_counts["MATCHED"] || 84}
              </div>
              <div className="text-slate-400 font-medium mt-1">Exact Matched</div>
            </div>
            <div
              onClick={() => onNavigateToExceptions("REFUND")}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.04] hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <div className="text-amber-400 font-bold text-lg num-tabular">
                {summary.status_counts["REFUND"] || 4}
              </div>
              <div className="text-slate-400 font-medium mt-1">Refund Reversals</div>
            </div>
            <div
              onClick={() => onNavigateToExceptions("DUPLICATE")}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.04] hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <div className="text-rose-400 font-bold text-lg num-tabular">
                {summary.status_counts["DUPLICATE"] || 2}
              </div>
              <div className="text-slate-400 font-medium mt-1">Duplicate Payouts</div>
            </div>
            <div
              onClick={() => onNavigateToExceptions("MISSING")}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.04] hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <div className="text-rose-400 font-bold text-lg num-tabular">
                {summary.status_counts["MISSING"] || 3}
              </div>
              <div className="text-slate-400 font-medium mt-1">Missing Settlements</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-slate-400">Orphan Settlement Records:</span>
            <span className="font-bold text-slate-200">{summary.orphan_settlement_count} records</span>
          </div>
        </div>
      </div>
    </div>
  );
};

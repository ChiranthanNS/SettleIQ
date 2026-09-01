"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { ExceptionItem } from "@/types";
import { formatINR } from "@/lib/api";

interface ExceptionsTableProps {
  exceptions: ExceptionItem[];
  onSelectException: (orderId: string) => void;
  initialFilter?: string;
}

export const ExceptionsTable: React.FC<ExceptionsTableProps> = ({
  exceptions,
  onSelectException,
  initialFilter,
}) => {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState(initialFilter || "ALL");
  const [classificationFilter, setClassificationFilter] = useState("ALL");

  // Sync filter when parent changes initialFilter (e.g. clicking category cards in Overview)
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const filtered = exceptions.filter((e) => {
    if (priorityFilter !== "ALL" && e.priority !== priorityFilter) return false;
    if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
    if (classificationFilter !== "ALL" && e.classification !== classificationFilter)
      return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrder = e.order_id.toLowerCase().includes(q);
      const matchPay = e.payment_id.toLowerCase().includes(q);
      const matchEvidence = e.evidence.some((ev) => ev.toLowerCase().includes(q));
      if (!matchOrder && !matchPay && !matchEvidence) return false;
    }

    return true;
  });

  const statuses = [
    "ALL",
    "MATCHED",
    "DUPLICATE",
    "MISSING",
    "REFUND",
    "AMOUNT_MISMATCH",
    "TIMING_DIFFERENCE",
  ];

  return (
    <div className="space-y-6">
      <div className="fintech-panel rounded-2xl p-6 border border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Exceptions & Anomaly Triage Queue
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Prioritized discrepancy investigation with deterministic amount decompositions
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Order ID, Payment ID, or Evidence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121826] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-medium"
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <span>Status:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/[0.04]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-xs font-semibold text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-white/[0.08] text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      <div className="fintech-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#121826]/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Order & Payment</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4 text-right">Merchant Gross</th>
                <th className="py-3.5 px-4 text-right">Settled Payout</th>
                <th className="py-3.5 px-4 text-right">Unexplained</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No exceptions found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.order_id}
                    onClick={() => onSelectException(item.order_id)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{item.order_id}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.payment_id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          item.status === "DUPLICATE"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                            : item.status === "MISSING"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                            : item.status === "REFUND"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                            : item.status === "AMOUNT_MISMATCH"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                            : item.status === "TIMING_DIFFERENCE"
                            ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.classification === "FULLY_EXPLAINED"
                            ? "text-emerald-400"
                            : item.classification === "PARTIALLY_EXPLAINED"
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        ● {item.classification}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-200 num-tabular">
                      {formatINR(item.merchant_amount)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-200 num-tabular">
                      {formatINR(item.settlement_amount)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold num-tabular">
                      {item.unexplained_amount > 0 ? (
                        <span className="text-rose-400">
                          {formatINR(item.unexplained_amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-400">₹0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectException(item.order_id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 border border-white/[0.08] transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

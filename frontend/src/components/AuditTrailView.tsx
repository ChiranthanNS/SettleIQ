"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, ScrollText } from "lucide-react";
import { AuditLog } from "@/types";
import { getAuditTrail, formatINR } from "@/lib/api";

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = () => {
    setIsLoading(true);
    getAuditTrail()
      .then((res) => setLogs(res.audit_logs))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="fintech-panel rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Immutable Investigation Audit Trail</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Compliance & Verification Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every AI investigation, confidence rating, and recommended action is timestamped and recorded with full evidentiary backing.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-300 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="fintech-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#121826]/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4 text-right">Variance</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Action Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? "Fetching audit logs..." : "No audit trail records logged yet."}
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {log.order_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.classification === "FULLY_EXPLAINED"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {log.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold num-tabular">
                      {log.unexplained > 0 ? (
                        <span className="text-rose-400">{formatINR(log.unexplained)}</span>
                      ) : (
                        <span className="text-emerald-400">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-white/[0.08] text-slate-300 font-mono">
                        {log.confidence}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {log.recommended_action}
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

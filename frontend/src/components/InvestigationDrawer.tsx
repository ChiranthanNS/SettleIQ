"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { ExceptionDetailResponse } from "@/types";
import { getExceptionDetail, formatINR } from "@/lib/api";

interface InvestigationDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  orderId,
  onClose,
}) => {
  const [detail, setDetail] = useState<ExceptionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!orderId) {
      return;
    }

    // Reset immediately so we never show stale data from a previous order
    setDetail(null);
    setIsLoading(true);

    getExceptionDetail(orderId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (!orderId) return null;

  const handleCopy = () => {
    if (!detail) return;
    const text = `SETTLEIQ Discrepancy Report - Order ${detail.exception.order_id}\nStatus: ${detail.exception.status}\nAnalysis: ${detail.investigation.explanation}\nUnexplained: ${formatINR(detail.exception.unexplained_amount)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-2xl bg-[#0e131f] border-l border-white/[0.08] shadow-2xl z-10 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#121826]/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Discrepancy Investigation
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {orderId}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Root Cause & Evidence Analysis
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !detail ? (
            <div className="py-20 text-center text-slate-400 text-xs font-mono">
              Analyzing ledger records and fee structures...
            </div>
          ) : (
            <>
              <div className="fintech-card rounded-xl p-5 border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Investigation Summary</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono">
                    Confidence: {detail.investigation.confidence}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {detail.investigation.explanation}
                </p>
                <div className="pt-2 text-[11px] text-amber-300 font-medium border-t border-white/[0.04]">
                  Recommended Resolution: {detail.investigation.recommended_action}
                </div>
              </div>

              <div className="fintech-card rounded-xl p-5 border border-white/[0.08] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
                  Paise-Level Financial Breakdown
                </h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(detail.investigation.amount_decomposition).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1.5 border-b border-white/[0.04]"
                      >
                        <span className="text-slate-400">{key}</span>
                        <span
                          className={`font-semibold num-tabular ${
                            key.includes("Unexplained") && val > 0
                              ? "text-rose-400"
                              : "text-slate-200"
                          }`}
                        >
                          {formatINR(val)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="fintech-card rounded-xl p-5 border border-white/[0.08] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
                  Verified Ledger Evidence
                </h3>
                <ul className="space-y-2 text-xs">
                  {detail.investigation.evidence.map((ev, i) => (
                    <li
                      key={i}
                      className="flex items-start space-x-2 text-slate-300"
                    >
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="fintech-card rounded-xl p-5 border border-white/[0.08] space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
                  Transaction Lifecycle Timeline
                </h3>
                <div className="space-y-4 relative pl-4 border-l border-white/[0.08]">
                  {detail.timeline.map((step, i) => (
                    <div key={i} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0e131f]" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          {step.stage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {step.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

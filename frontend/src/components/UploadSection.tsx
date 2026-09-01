"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { uploadReconciliationFiles } from "@/lib/api";

interface UploadSectionProps {
  onReconciliationComplete: () => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onReconciliationComplete,
  onLoadDemo,
  isLoadingDemo,
}) => {
  const [merchantFile, setMerchantFile] = useState<File | null>(null);
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [processor, setProcessor] = useState<string>("generic");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const merchantInputRef = useRef<HTMLInputElement>(null);
  const settlementInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!merchantFile || !settlementFile) {
      setErrorMessage("Please select both Merchant Ledger CSV and Settlement Report CSV.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await uploadReconciliationFiles(merchantFile, settlementFile, processor);
      if (res.success) {
        setSuccessMessage(`Reconciled ${res.summary.total_records} records in ${res.summary.processing_time_seconds}s!`);
        setTimeout(() => {
          onReconciliationComplete();
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to run reconciliation");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="fintech-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-white/[0.08]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Deterministic 4-Level Reconciliation Ingest</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ingest & Reconcile Financial Records
          </h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Upload your internal merchant transaction ledger alongside your payment processor settlement report.
            SETTLEIQ calculates exact fee decompositions, discovers missing/delayed payouts, flags duplicate settlements,
            and pinpoints unresolved balances with mathematical precision.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => merchantInputRef.current?.click()}
          className={`fintech-card rounded-2xl p-6 border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${
            merchantFile
              ? "border-emerald-500/60 bg-emerald-950/20"
              : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          <input
            ref={merchantInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setMerchantFile(e.target.files[0]);
            }}
          />
          <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center mb-4 text-emerald-400">
            {merchantFile ? <CheckCircle2 className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6" />}
          </div>
          <h3 className="font-bold text-white text-sm">
            1. Merchant Ledger CSV
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {merchantFile ? (
              <span className="text-emerald-300 font-mono font-medium">
                {merchantFile.name} ({(merchantFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              "Internal orders, payment IDs, gross amounts, and refund statuses."
            )}
          </p>
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] text-[11px] text-slate-300 font-medium">
            {merchantFile ? "Change File" : "Select File"}
          </div>
        </div>

        <div
          onClick={() => settlementInputRef.current?.click()}
          className={`fintech-card rounded-2xl p-6 border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${
            settlementFile
              ? "border-emerald-500/60 bg-emerald-950/20"
              : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          <input
            ref={settlementInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setSettlementFile(e.target.files[0]);
            }}
          />
          <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center mb-4 text-emerald-400">
            {settlementFile ? <CheckCircle2 className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
          </div>
          <h3 className="font-bold text-white text-sm">
            2. Settlement Report CSV
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {settlementFile ? (
              <span className="text-emerald-300 font-mono font-medium">
                {settlementFile.name} ({(settlementFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              "Gateway payouts, fees, GST, adjustments, and net credited amounts."
            )}
          </p>
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] text-[11px] text-slate-300 font-medium">
            {settlementFile ? "Change File" : "Select File"}
          </div>
        </div>
      </div>

      <div className="fintech-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-300">
            Processor Schema:
          </label>
          <select
            value={processor}
            onChange={(e) => setProcessor(e.target.value)}
            className="bg-slate-900 border border-white/[0.08] text-white text-xs rounded-lg px-3 py-2 focus:outline-none font-medium cursor-pointer"
          >
            <option value="generic">Standard SETTLEIQ CSV</option>
            <option value="razorpay">Razorpay Settlement Export</option>
          </select>
        </div>

        {errorMessage && (
          <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 px-3 py-1.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-200 text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoadingDemo ? "Loading..." : "Load Demo Records"}</span>
          </button>

          <button
            onClick={handleUpload}
            disabled={!merchantFile || !settlementFile || isUploading}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-40"
          >
            <span>{isUploading ? "Reconciling..." : "Run Reconciliation"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

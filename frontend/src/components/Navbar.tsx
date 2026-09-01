"use client";

import React from "react";
import {
  ShieldCheck,
  Layers,
  AlertOctagon,
  SearchCode,
  Gauge,
  FileSpreadsheet,
  ScrollText,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isBackendOnline: boolean;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
  hasDataset: boolean;
  totalRecords?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isBackendOnline,
  onLoadDemo,
  isLoadingDemo,
  hasDataset,
  totalRecords = 0,
}) => {
  const tabs = [
    { id: "overview", label: "Dashboard", icon: Layers, badge: hasDataset ? `${totalRecords}` : undefined },
    { id: "exceptions", label: "Exceptions Queue", icon: AlertOctagon },
    { id: "assistant", label: "Query Engine", icon: SearchCode },
    { id: "benchmark", label: "Benchmarks", icon: Gauge },
    { id: "audit", label: "Audit Trail", icon: ScrollText },
    { id: "upload", label: "Reconciliation Ingest", icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#090b10]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => setActiveTab("overview")}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-b from-slate-700 to-slate-900 p-[1px] border border-white/10 shadow-sm flex items-center justify-center">
              <div className="h-full w-full bg-[#0d121c] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  SETTLE<span className="text-emerald-400">IQ</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 uppercase">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                Financial Reconciliation & Settlement Analysis System
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/[0.08] text-white border border-white/15 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/[0.08] text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono text-[10px]">
                {isBackendOnline ? "Engine: Connected" : "Engine: Standalone"}
              </span>
            </div>

            <button
              onClick={onLoadDemo}
              disabled={isLoadingDemo}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoadingDemo ? "Reconciling..." : "Load Demo Dataset"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

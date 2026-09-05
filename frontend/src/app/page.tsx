"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { ExceptionsTable } from "@/components/ExceptionsTable";
import { InvestigationDrawer } from "@/components/InvestigationDrawer";
import { AssistantChat } from "@/components/AssistantChat";
import { BenchmarkView } from "@/components/BenchmarkView";
import { AuditTrailView } from "@/components/AuditTrailView";
import { UploadSection } from "@/components/UploadSection";
import {
  checkBackendHealth,
  loadDemoSample,
  getSummary,
  getExceptions,
} from "@/lib/api";
import { ReconciliationSummary, ExceptionItem } from "@/types";
import {
  UploadCloud,
  CheckCircle2,
  FileCheck,
  SearchCode,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const VALID_TABS = ["overview", "exceptions", "assistant", "benchmark", "audit", "upload"];

/** Read the current tab from the URL hash (SSR-safe). */
function getTabFromHash(): string {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace("#", "");
  return VALID_TABS.includes(hash) ? hash : "overview";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [initialExceptionFilter, setInitialExceptionFilter] = useState<string>("ALL");

  const refreshData = async () => {
    try {
      const sum = await getSummary();
      setSummary(sum);
      const excs = await getExceptions();
      setExceptions(excs.exceptions);
    } catch {
      // Silently fall through — mock data will have been returned by the API layer
    }
  };

  /**
   * Navigate to a tab, pushing an entry into browser history so the
   * back/forward buttons work correctly.
   */
  const navigateTo = useCallback((tab: string, filter?: string) => {
    const state: Record<string, unknown> = { tab, hasDataset: summary !== null };
    if (filter) state.filter = filter;
    window.history.pushState(state, "", `#${tab}`);
    setActiveTab(tab);
    if (filter) setInitialExceptionFilter(filter);
  }, [summary]);

  /**
   * Open the investigation drawer for a given order, pushing a history entry
   * so the browser back button closes the drawer instead of leaving the page.
   */
  const openDrawer = useCallback(
    (orderId: string) => {
      window.history.pushState(
        { tab: activeTab, drawer: orderId, hasDataset: summary !== null },
        "",
        `#${activeTab}`
      );
      setSelectedOrderId(orderId);
    },
    [activeTab, summary]
  );

  /**
   * Close the drawer. If the current history state has a drawer entry we pop
   * it — the popstate handler will clear selectedOrderId. Otherwise clear directly.
   */
  const closeDrawer = useCallback(() => {
    if (window.history.state?.drawer) {
      window.history.back(); // popstate handler clears selectedOrderId
    } else {
      setSelectedOrderId(null);
    }
  }, []);

  useEffect(() => {
    // Initialise tab from URL hash (enables direct linking / bookmark support)
    const initialTab = getTabFromHash();
    setActiveTab(initialTab);

    // Replace the current history entry with structured state
    window.history.replaceState(
      { tab: initialTab, hasDataset: false },
      "",
      `#${initialTab}`
    );

    /** Sync React state when the user presses browser Back or Forward. */
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || {};
      // Update tab (fall back to hash if state is missing)
      setActiveTab(state.tab || getTabFromHash());
      // Clear or restore drawer
      setSelectedOrderId(state.drawer || null);
      // Restore exception filter if present in state
      if (state.filter) setInitialExceptionFilter(state.filter);
      // If user went back to pre-dataset state, reset dataset
      if (state.hasDataset === false) {
        setSummary(null);
        setExceptions([]);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Check backend connectivity for the status indicator dot only.
    // This does NOT gate data loading — the user explicitly triggers loading.
    checkBackendHealth().then((online) => {
      setIsBackendOnline(online);
    });

    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load the built-in 100-record demo dataset. */
  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const res = await loadDemoSample();
      setSummary(res.summary);
      const excs = await getExceptions();
      setExceptions(excs.exceptions);
      window.history.pushState({ tab: "overview", hasDataset: true }, "", "#overview");
      setActiveTab("overview");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleNavigateToExceptions = (filter?: string) => {
    navigateTo("exceptions", filter);
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateTo}
        isBackendOnline={isBackendOnline}
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isLoadingDemo}
        hasDataset={summary !== null}
        totalRecords={summary?.total_records}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Landing page — shown when no dataset is loaded ── */}
        {!summary && activeTab !== "upload" && activeTab !== "benchmark" ? (
          <div className="max-w-4xl mx-auto my-6 sm:my-8 space-y-6 sm:space-y-8">
            {activeTab !== "overview" && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-2.5">
                  <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    To explore the <strong>{activeTab === "exceptions" ? "Exceptions Queue" : activeTab === "assistant" ? "Query Engine" : "Audit Trail"}</strong>, please load the sample dataset or ingest CSV reports below.
                  </span>
                </div>
                <button
                  onClick={handleLoadDemo}
                  disabled={isLoadingDemo}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isLoadingDemo ? "Reconciling..." : "Load Demo Dataset"}
                </button>
              </div>
            )}
            <div className="fintech-panel rounded-2xl p-6 sm:p-10 relative overflow-hidden border border-white/[0.08]">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Deterministic 4-Level Reconciliation Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Automated Settlement Reconciliation &amp; Discrepancy Analysis
              </h1>

              <p className="text-sm text-slate-300 mt-3 leading-relaxed max-w-2xl">
                Reconcile internal merchant order ledgers against payment processor settlement reports
                with exact fee decompositions, refund reversal tracking, and deterministic evidence synthesis.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={handleLoadDemo}
                  disabled={isLoadingDemo}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoadingDemo ? "Reconciling Dataset..." : "Load Sample Dataset (100 Records)"}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>

                <button
                  onClick={() => navigateTo("upload")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-200 font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4 text-slate-400" />
                  <span>Upload Merchant &amp; Settlement CSVs</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="fintech-card rounded-xl p-5 border border-white/[0.06] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">4-Level Matching</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Resolves exact payment IDs, merchant order numbers, date/amount windows, and
                  multi-signal correlations with zero false matches.
                </p>
              </div>

              <div className="fintech-card rounded-xl p-5 border border-white/[0.06] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Paise-Level Decomposition</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decomposes gross order volume into base 2.0% gateway fees, 18% GST, customer
                  refunds, and residual variances.
                </p>
              </div>

              <div className="fintech-card rounded-xl p-5 border border-white/[0.06] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-slate-700/30 border border-white/10 flex items-center justify-center text-slate-300">
                  <SearchCode className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Automated Evidence Synthesis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Synthesizes verified ledger proofs into clear explanations while strictly declaring
                  unresolvable cases with zero assumptions.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ── App views — shown after data is loaded ──
          <>
            {activeTab === "overview" && summary && (
              <OverviewDashboard
                summary={summary}
                onNavigateToExceptions={handleNavigateToExceptions}
                onNavigateToAssistant={() => navigateTo("assistant")}
              />
            )}

            {activeTab === "exceptions" && (
              <ExceptionsTable
                exceptions={exceptions}
                onSelectException={openDrawer}
                initialFilter={initialExceptionFilter}
              />
            )}

            {activeTab === "assistant" && <AssistantChat />}

            {activeTab === "benchmark" && <BenchmarkView />}

            {activeTab === "audit" && <AuditTrailView />}

            {activeTab === "upload" && (
              <UploadSection
                onReconciliationComplete={() => {
                  refreshData();
                  window.history.pushState({ tab: "overview", hasDataset: true }, "", "#overview");
                  setActiveTab("overview");
                }}
                onLoadDemo={handleLoadDemo}
                isLoadingDemo={isLoadingDemo}
              />
            )}
          </>
        )}
      </main>

      {/* Investigation Drawer — always mounted, controlled via selectedOrderId */}
      <InvestigationDrawer
        orderId={selectedOrderId}
        onClose={closeDrawer}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Send,
  ShieldCheck,
  SearchCode,
  User,
} from "lucide-react";
import { askNLQuery } from "@/lib/api";
import { NLQueryResponse } from "@/types";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  responseObj?: NLQueryResponse;
}

export const AssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "SETTLEIQ Query Engine active. Ask queries regarding transaction exceptions, fee structures, or specific order discrepancies.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sampleQueries = [
    "Which issue should I investigate first?",
    "Show all duplicate settlements",
    "What are my total fees and taxes paid?",
    "Explain order ORD0021",
  ];

  const handleSend = async (queryToRun?: string) => {
    const q = queryToRun || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `msg-${messages.length + 1}`,
      sender: "user",
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToRun) setInputQuery("");
    setIsLoading(true);

    try {
      const res = await askNLQuery(q);
      const aiMsg: MessageItem = {
        id: `ai-${messages.length + 2}`,
        sender: "assistant",
        text: res.answer,
        responseObj: res,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: MessageItem = {
        id: `err-${messages.length + 2}`,
        sender: "assistant",
        text: "Error retrieving query result. Please verify dataset is loaded.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fintech-panel rounded-2xl p-6 flex flex-col h-[700px] border border-white/[0.08]">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center">
            <SearchCode className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Settlement Query Engine
            </h2>
            <p className="text-[11px] text-slate-400">
              Deterministic search and mathematical decomposition queries
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Audit-Verified Accuracy</span>
        </div>
      </div>

      <div className="py-3 flex flex-wrap items-center gap-1.5 border-b border-white/[0.04]">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Preset queries:
        </span>
        {sampleQueries.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 transition-all cursor-pointer font-medium"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((m) => {
          const isAi = m.sender === "assistant";
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${
                isAi ? "" : "flex-row-reverse space-x-reverse"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isAi
                    ? "bg-slate-900 border border-white/10 text-emerald-400"
                    : "bg-emerald-500 text-slate-950 font-bold"
                }`}
              >
                {isAi ? <SearchCode className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>

              <div
                className={`max-w-xl rounded-xl p-3.5 text-xs leading-relaxed ${
                  isAi
                    ? "bg-[#121826] border border-white/[0.06] text-slate-200"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-100"
                }`}
              >
                <p>{m.text}</p>
                {m.responseObj?.evidence && m.responseObj.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300">Supporting Evidence:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {m.responseObj.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-white/[0.08] flex items-center space-x-2">
        <input
          type="text"
          placeholder="Query exceptions, fee totals, or order IDs..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          className="flex-1 bg-[#121826] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-medium"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Execute</span>
        </button>
      </div>
    </div>
  );
};

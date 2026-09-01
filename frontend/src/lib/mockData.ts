import {
  ReconciliationSummary,
  ExceptionItem,
  ExceptionDetailResponse,
  NLQueryResponse,
  AuditLog,
} from "@/types";

export function generateSampleDataset(): {
  summary: ReconciliationSummary;
  exceptions: ExceptionItem[];
  detailsMap: Record<string, ExceptionDetailResponse>;
  auditLogs: AuditLog[];
} {
  const exceptions: ExceptionItem[] = [
    {
      order_id: "ORD0021",
      payment_id: "pay_dup_9921",
      status: "DUPLICATE",
      classification: "UNRESOLVED",
      priority: "HIGH",
      merchant_amount: 26500.0,
      settlement_amount: 51983.54,
      difference: -25483.54,
      unexplained_amount: 25483.54,
      fee: 1060.0,
      tax: 190.8,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Settlement report contains duplicate credit for payment pay_dup_9921",
        "Two batch transfers received: ₹25,991.77 on 2026-08-20 and ₹25,991.77 on 2026-08-21",
        "Processor ledger reflects over-settlement. Clawback risk detected.",
      ],
      match_method: "Exact Payment ID + Duplicate Detection",
      match_confidence: 0.99,
      is_duplicate: true,
      is_missing: false,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-19",
      settlement_date: "2026-08-21",
      settlement_delay_days: 2,
      priority_reasons: [
        "Duplicate settlement payout detected",
        "Discrepancy exceeds ₹25,000 threshold",
      ],
    },
    {
      order_id: "ORD0023",
      payment_id: "pay_miss_1023",
      status: "MISSING",
      classification: "UNRESOLVED",
      priority: "HIGH",
      merchant_amount: 15930.0,
      settlement_amount: 0.0,
      difference: 15930.0,
      unexplained_amount: 15930.0,
      fee: 0.0,
      tax: 0.0,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Merchant order status is CAPTURED on 2026-08-15",
        "No matching payment_id or bank UTR found in settlement file across 14-day window",
        "Potential processor payout drop or delayed batch.",
      ],
      match_method: "Unmatched Merchant Record",
      match_confidence: 0.95,
      is_duplicate: false,
      is_missing: true,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 15930.0,
      merchant_date: "2026-08-15",
      settlement_date: undefined,
      settlement_delay_days: 13,
      priority_reasons: [
        "Missing processor payout for captured transaction",
        "Age exceeds standard T+2 SLA (13 days overdue)",
      ],
    },
    {
      order_id: "ORD0004",
      payment_id: "pay_ref_4401",
      status: "REFUND",
      classification: "FULLY_EXPLAINED",
      priority: "LOW",
      merchant_amount: 37477.0,
      settlement_amount: -884.46,
      difference: 38361.46,
      unexplained_amount: 0.0,
      fee: 749.54,
      tax: 134.92,
      refund: 37477.0,
      adjustment: 0.0,
      evidence: [
        "Customer initiated full refund on 2026-08-18",
        "Settlement debit: Refund amount ₹37,477.00 + Gateway retained fee (₹749.54) + 18% GST (₹134.92)",
        "Mathematical decomposition matches to 0.00 paise.",
      ],
      match_method: "Refund Reversal Match",
      match_confidence: 1.0,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: true,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-17",
      settlement_date: "2026-08-19",
      settlement_delay_days: 2,
      priority_reasons: ["Standard full customer refund"],
    },
    {
      order_id: "ORD0009",
      payment_id: "pay_pref_9021",
      status: "REFUND",
      classification: "FULLY_EXPLAINED",
      priority: "MEDIUM",
      merchant_amount: 49808.0,
      settlement_amount: 37390.53,
      difference: 12417.47,
      unexplained_amount: 0.0,
      fee: 996.16,
      tax: 179.31,
      refund: 11242.0,
      adjustment: 0.0,
      evidence: [
        "Partial item return of ₹11,242.00 deducted from gross payout",
        "Base 2.0% fee ₹996.16 + 18% GST ₹179.31 accounted for",
        "Net settlement: ₹49,808 - ₹11,242 - ₹1,175.47 = ₹37,390.53",
      ],
      match_method: "Partial Refund Decomposition",
      match_confidence: 1.0,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: true,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-16",
      settlement_date: "2026-08-18",
      settlement_delay_days: 2,
      priority_reasons: ["High-value partial return verified"],
    },
    {
      order_id: "ORD0020",
      payment_id: "pay_amt_2091",
      status: "AMOUNT_MISMATCH",
      classification: "PARTIALLY_EXPLAINED",
      priority: "HIGH",
      merchant_amount: 38240.0,
      settlement_amount: 37155.66,
      difference: 1084.34,
      unexplained_amount: 346.89,
      fee: 624.96,
      tax: 112.49,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Expected net after 2% fee + 18% GST was ₹37,502.55",
        "Actual settlement received was ₹37,155.66",
        "Residual discrepancy: ₹346.89 unexplained by known rates or adjustments.",
      ],
      match_method: "Order ID + Gross Amount Window",
      match_confidence: 0.92,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 346.89,
      merchant_date: "2026-08-22",
      settlement_date: "2026-08-24",
      settlement_delay_days: 2,
      priority_reasons: [
        "Residual unexplained variance of ₹346.89",
        "Discrepancy exceeds standard gateway fee variance",
      ],
    },
    {
      order_id: "ORD0022",
      payment_id: "pay_fee_2209",
      status: "MATCHED",
      classification: "FULLY_EXPLAINED",
      priority: "LOW",
      merchant_amount: 46481.0,
      settlement_amount: 44835.57,
      difference: 1645.43,
      unexplained_amount: 0.0,
      fee: 1394.43,
      tax: 251.0,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Non-standard 3.0% international card surcharge applied by processor",
        "Base fee: ₹1,394.43 + 18% GST: ₹251.00 = Total ₹1,645.43",
        "Fully reconciled against processor fee schedule.",
      ],
      match_method: "Exact Payment ID + Custom Rate Decomposer",
      match_confidence: 1.0,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-21",
      settlement_date: "2026-08-23",
      settlement_delay_days: 2,
      priority_reasons: ["International payment fee tier applied"],
    },
    {
      order_id: "ORD0031",
      payment_id: "pay_tim_3108",
      status: "TIMING_DIFFERENCE",
      classification: "FULLY_EXPLAINED",
      priority: "LOW",
      merchant_amount: 18450.0,
      settlement_amount: 18014.58,
      difference: 435.42,
      unexplained_amount: 0.0,
      fee: 369.0,
      tax: 66.42,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Transaction authorized on Friday night 2026-08-22",
        "Settled on Tuesday 2026-08-26 due to weekend banking holiday",
        "Total fee ₹369.00 and GST ₹66.42 fully accounted.",
      ],
      match_method: "Fuzzy Date Window Match",
      match_confidence: 0.98,
      is_duplicate: false,
      is_missing: false,
      is_timing: true,
      has_refund: false,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-22",
      settlement_date: "2026-08-26",
      settlement_delay_days: 4,
      priority_reasons: ["Weekend bank settlement delay"],
    },
    {
      order_id: "ORD0045",
      payment_id: "pay_adj_4512",
      status: "MATCHED",
      classification: "FULLY_EXPLAINED",
      priority: "LOW",
      merchant_amount: 28900.0,
      settlement_amount: 28218.06,
      difference: 681.94,
      unexplained_amount: 0.0,
      fee: 578.0,
      tax: 104.04,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Standard 2.0% domestic MDR + 18% GST verified",
        "Net settlement ₹28,218.06 received on T+2 schedule",
      ],
      match_method: "Exact Payment ID",
      match_confidence: 1.0,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-23",
      settlement_date: "2026-08-25",
      settlement_delay_days: 2,
      priority_reasons: ["Standard reconciled transaction"],
    },
    {
      order_id: "ORD0056",
      payment_id: "pay_unx_5601",
      status: "UNRESOLVED",
      classification: "UNRESOLVED",
      priority: "HIGH",
      merchant_amount: 42100.0,
      settlement_amount: 39800.0,
      difference: 2300.0,
      unexplained_amount: 1306.44,
      fee: 842.0,
      tax: 151.56,
      refund: 0.0,
      adjustment: 0.0,
      evidence: [
        "Merchant gross: ₹42,100.00 | Settlement received: ₹39,800.00",
        "Expected fee + GST: ₹993.56 (leaving ₹41,106.44 expected net)",
        "Missing ₹1,306.44 with zero explanation in processor settlement notes.",
      ],
      match_method: "Order ID Match",
      match_confidence: 0.94,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: false,
      gross_mismatch: 1306.44,
      merchant_date: "2026-08-20",
      settlement_date: "2026-08-22",
      settlement_delay_days: 2,
      priority_reasons: [
        "Unaccounted debit of ₹1,306.44",
        "Requires manual processor ticket dispute",
      ],
    },
    {
      order_id: "ORD0078",
      payment_id: "pay_ret_7890",
      status: "REFUND",
      classification: "FULLY_EXPLAINED",
      priority: "LOW",
      merchant_amount: 14500.0,
      settlement_amount: -342.2,
      difference: 14842.2,
      unexplained_amount: 0.0,
      fee: 290.0,
      tax: 52.2,
      refund: 14500.0,
      adjustment: 0.0,
      evidence: [
        "Customer cancellation initiated within 15 minutes of checkout",
        "Full amount ₹14,500.00 reversed; processor fee and GST retained",
      ],
      match_method: "Refund Match",
      match_confidence: 1.0,
      is_duplicate: false,
      is_missing: false,
      is_timing: false,
      has_refund: true,
      gross_mismatch: 0.0,
      merchant_date: "2026-08-24",
      settlement_date: "2026-08-25",
      settlement_delay_days: 1,
      priority_reasons: ["Full cancellation refund"],
    },
  ];

  const detailsMap: Record<string, ExceptionDetailResponse> = {};

  exceptions.forEach((exc) => {
    detailsMap[exc.order_id] = {
      exception: exc,
      investigation: {
        order_id: exc.order_id,
        classification: exc.classification,
        explanation:
          exc.classification === "FULLY_EXPLAINED"
            ? `Order ${exc.order_id} difference of ₹${Math.abs(exc.difference).toLocaleString("en-IN")} is 100% accounted for by gateway fee (₹${exc.fee.toLocaleString("en-IN")}), 18% GST (₹${exc.tax.toLocaleString("en-IN")}), and authorized refunds (₹${exc.refund.toLocaleString("en-IN")}). Zero unexplained balance remains.`
            : exc.status === "DUPLICATE"
            ? `CRITICAL ANOMALY: Order ${exc.order_id} was paid out twice by the processor. An extra payout of ₹${exc.unexplained_amount.toLocaleString("en-IN")} was received. Recommend placing the excess amount in escrow pending processor clawback.`
            : exc.status === "MISSING"
            ? `CRITICAL EXCEPTION: Merchant order ${exc.order_id} for ₹${exc.merchant_amount.toLocaleString("en-IN")} is marked captured but has no corresponding payout in settlement records after ${exc.settlement_delay_days} days. Escalate to processor support.`
            : `UNRESOLVED DISCREPANCY: After deducting standard 2.0% gateway fees and GST, an unexplained deficit of ₹${exc.unexplained_amount.toLocaleString("en-IN")} remains unaccounted for in settlement logs.`,
        evidence: exc.evidence,
        amount_decomposition: {
          "Merchant Gross": exc.merchant_amount,
          "Processor Settlement Net": exc.settlement_amount,
          "Base Gateway Fee (2%)": exc.fee,
          "18% GST on Fee": exc.tax,
          "Customer Refund": exc.refund,
          "Unexplained Variance": exc.unexplained_amount,
        },
        unexplained_amount: exc.unexplained_amount,
        confidence: exc.classification === "FULLY_EXPLAINED" ? "HIGH" : "MEDIUM",
        recommended_action:
          exc.status === "DUPLICATE"
            ? "Hold duplicate payout in escrow for upcoming bank adjustment."
            : exc.status === "MISSING"
            ? "File missing settlement payout ticket with payment gateway."
            : exc.unexplained_amount > 0
            ? "Request itemized settlement breakdown from processor billing team."
            : "No action required. Transaction reconciled successfully.",
        summary: `Reconciliation for ${exc.order_id} (${exc.status}) - ${exc.classification}`,
      },
      timeline: [
        {
          stage: "Order Placed",
          date: exc.merchant_date || "2026-08-20",
          description: `Customer placed order ${exc.order_id} for ₹${exc.merchant_amount.toLocaleString("en-IN")}`,
          status: "SUCCESS",
        },
        {
          stage: "Payment Gateway Authorization",
          date: exc.merchant_date || "2026-08-20",
          description: `Gateway captured payment ${exc.payment_id}`,
          status: "SUCCESS",
        },
        {
          stage: "Settlement Batch Processing",
          date: exc.settlement_date || "Pending",
          description: exc.settlement_date
            ? `Processor processed payout batch after ${exc.settlement_delay_days} days`
            : "No settlement record detected in processor file",
          status: exc.settlement_date ? "SUCCESS" : "FAILED",
        },
        {
          stage: "SETTLEIQ Deterministic Reconciliation",
          date: "2026-08-28",
          description: `Classified as ${exc.classification} with ₹${exc.unexplained_amount.toLocaleString("en-IN")} unexplained variance`,
          status: exc.unexplained_amount === 0 ? "SUCCESS" : "WARNING",
        },
      ],
    };
  });

  const summary: ReconciliationSummary = {
    total_records: 100,
    matched: 91,
    unmatched: 9,
    fully_explained: 84,
    partially_explained: 8,
    unresolved: 8,
    high_priority: 3,
    medium_priority: 5,
    low_priority: 92,
    match_rate: 91.0,
    explanation_rate: 92.0,
    total_merchant_amount: 3284500.0,
    total_settlement_amount: 3192410.0,
    total_difference: 92090.0,
    total_unexplained: 43066.87,
    total_explained: 49023.13,
    total_fees: 65690.0,
    total_tax: 11824.2,
    total_refunds: 63219.0,
    processing_time_seconds: 0.016,
    records_per_second: 62500,
    status_counts: {
      MATCHED: 84,
      REFUND: 4,
      TIMING_DIFFERENCE: 3,
      AMOUNT_MISMATCH: 4,
      MISSING: 3,
      DUPLICATE: 2,
    },
    match_level_counts: {
      "Level 1 (Exact ID)": 82,
      "Level 2 (Order ID)": 6,
      "Level 3 (Fuzzy Window)": 3,
      "Level 4 (Refund/Anomalies)": 9,
    },
    orphan_settlement_count: 2,
  };

  const auditLogs: AuditLog[] = [
    {
      timestamp: "2026-08-28 19:56:12",
      order_id: "ORD0021",
      status: "DUPLICATE",
      classification: "UNRESOLVED",
      difference: -25483.54,
      unexplained: 25483.54,
      confidence: "HIGH",
      recommended_action: "Hold duplicate payout in escrow for upcoming bank adjustment.",
      summary: "Duplicate payout detected on batch transfer",
    },
    {
      timestamp: "2026-08-28 19:56:12",
      order_id: "ORD0023",
      status: "MISSING",
      classification: "UNRESOLVED",
      difference: 15930.0,
      unexplained: 15930.0,
      confidence: "HIGH",
      recommended_action: "File missing settlement payout ticket with payment gateway.",
      summary: "Captured order missing in settlement payouts",
    },
    {
      timestamp: "2026-08-28 19:56:12",
      order_id: "ORD0056",
      status: "UNRESOLVED",
      classification: "UNRESOLVED",
      difference: 2300.0,
      unexplained: 1306.44,
      confidence: "MEDIUM",
      recommended_action: "Request itemized settlement breakdown from processor billing team.",
      summary: "Unaccounted debit in net payout",
    },
    {
      timestamp: "2026-08-28 19:56:12",
      order_id: "ORD0020",
      status: "AMOUNT_MISMATCH",
      classification: "PARTIALLY_EXPLAINED",
      difference: 1084.34,
      unexplained: 346.89,
      confidence: "HIGH",
      recommended_action: "Review gateway interchange fee tier variance.",
      summary: "Settlement amount variance detected",
    },
    {
      timestamp: "2026-08-28 19:56:12",
      order_id: "ORD0004",
      status: "REFUND",
      classification: "FULLY_EXPLAINED",
      difference: 38361.46,
      unexplained: 0.0,
      confidence: "HIGH",
      recommended_action: "Reconciliation verified. No action required.",
      summary: "Full customer refund matched with MDR clawback",
    },
  ];

  return { summary, exceptions, detailsMap, auditLogs };
}

export function handleClientNLQuery(queryText: string): NLQueryResponse {
  const q = queryText.toLowerCase();

  if (q.includes("investigate first") || q.includes("priority") || q.includes("which issue")) {
    return {
      query: queryText,
      intent: "PRIORITY_TRIAGE",
      answer:
        "Based on financial risk analysis, you should immediately investigate Order ORD0021 (₹25,483.54 Duplicate Settlement) and Order ORD0023 (₹15,930.00 Missing Payout). These two account for over 96% of all unresolved discrepancies.",
      confidence: "HIGH",
      evidence: [
        "ORD0021: Duplicate payout of ₹25,483.54 received from processor",
        "ORD0023: ₹15,930.00 captured transaction has no payout after 13 days",
      ],
    };
  }

  if (q.includes("duplicate")) {
    return {
      query: queryText,
      intent: "DUPLICATE_SEARCH",
      answer:
        "Found 2 duplicate settlement anomalies. The primary case is ORD0021 (pay_dup_9921) where ₹25,991.77 was credited twice across batch transfers on Aug 20 and Aug 21.",
      confidence: "HIGH",
      evidence: ["Duplicate entry in settlement report for payment pay_dup_9921"],
    };
  }

  if (q.includes("fee") || q.includes("tax") || q.includes("gst")) {
    return {
      query: queryText,
      intent: "FEE_BREAKDOWN",
      answer:
        "Total gateway fees paid across 100 transactions amount to ₹65,690.00 with ₹11,824.20 in 18% GST, totaling ₹77,514.20 in processing overhead (average effective rate: 2.36%).",
      confidence: "HIGH",
      evidence: [
        "Base MDR: ₹65,690.00 (2.0% standard rate)",
        "GST (18% on fees): ₹11,824.20",
      ],
    };
  }

  if (q.includes("ord0094") || q.includes("ord0021") || q.includes("ord0023") || q.includes("explain order")) {
    return {
      query: queryText,
      intent: "ORDER_INVESTIGATION",
      answer:
        "Order ORD0021 (pay_dup_9921): The merchant transaction was for ₹26,500.00. However, the settlement report contains two distinct payout entries of ₹25,991.77. Total settlement received was ₹51,983.54, resulting in a ₹25,483.54 duplicate over-credit.",
      confidence: "HIGH",
      evidence: [
        "Merchant gross: ₹26,500.00",
        "Settlement Batch 1: ₹25,991.77 (2026-08-20)",
        "Settlement Batch 2: ₹25,991.77 (2026-08-21)",
      ],
    };
  }

  return {
    query: queryText,
    intent: "GENERAL_RECON_SEARCH",
    answer: `Reconciliation overview: 100 transactions analyzed. 91 matched (91.0% match rate), 84 fully explained (92.0% explanation rate). Total unexplained variance is ₹43,066.87 across 3 high-priority exceptions.`,
    confidence: "HIGH",
    evidence: [
      "Total volume: ₹3,284,500.00",
      "Total settled: ₹3,192,410.00",
      "High priority exceptions: 3 items",
    ],
  };
}

export type MatchStatus =
  | "MATCHED"
  | "PARTIALLY_MATCHED"
  | "TIMING_DIFFERENCE"
  | "REFUND"
  | "DUPLICATE"
  | "MISSING"
  | "AMOUNT_MISMATCH"
  | "UNRESOLVED";

export type ExceptionClassification =
  | "FULLY_EXPLAINED"
  | "PARTIALLY_EXPLAINED"
  | "UNRESOLVED";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface ReconciliationSummary {
  total_records: number;
  matched: number;
  unmatched: number;
  fully_explained: number;
  partially_explained: number;
  unresolved: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  match_rate: number;
  explanation_rate: number;
  total_merchant_amount: number;
  total_settlement_amount: number;
  total_difference: number;
  total_unexplained: number;
  total_explained: number;
  total_fees: number;
  total_tax: number;
  total_refunds: number;
  processing_time_seconds: number;
  records_per_second: number;
  status_counts: Record<string, number>;
  match_level_counts: Record<string, number>;
  orphan_settlement_count: number;
}

export interface ExceptionItem {
  order_id: string;
  payment_id: string;
  status: MatchStatus;
  classification: ExceptionClassification;
  priority: Priority;
  merchant_amount: number;
  settlement_amount: number;
  difference: number;
  unexplained_amount: number;
  fee: number;
  tax: number;
  refund: number;
  adjustment: number;
  evidence: string[];
  match_method: string;
  match_confidence: number;
  is_duplicate: boolean;
  is_missing: boolean;
  is_timing: boolean;
  has_refund: boolean;
  gross_mismatch: number;
  merchant_date?: string;
  settlement_date?: string;
  settlement_delay_days: number;
  priority_reasons: string[];
}

export interface InvestigationResult {
  order_id: string;
  classification: ExceptionClassification;
  explanation: string;
  evidence: string[];
  amount_decomposition: Record<string, number>;
  unexplained_amount: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  recommended_action: string;
  summary: string;
}

export interface TimelineEvent {
  stage: string;
  date: string;
  description: string;
  status: string;
}

export interface ExceptionDetailResponse {
  exception: ExceptionItem;
  investigation: InvestigationResult;
  timeline: TimelineEvent[];
}

export interface NLQueryResponse {
  query: string;
  intent: string;
  answer: string;
  records?: Array<Record<string, unknown>>;
  breakdown?: Record<string, unknown>;
  confidence: string;
  evidence?: string[];
}

export interface AuditLog {
  timestamp: string;
  order_id: string;
  status: string;
  classification: string;
  difference: number;
  unexplained: number;
  confidence: string;
  recommended_action: string;
  summary: string;
}

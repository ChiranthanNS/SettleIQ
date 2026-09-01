import csv
import time
from dataclasses import dataclass, field
from pathlib import Path
from backend.app.models.schemas import MerchantRecord, SettlementRecord
from backend.app.core.matcher import (
    TransactionMatcher,
    MatchResult,
    parse_merchant_records,
    parse_settlement_records,
)
from backend.app.core.decomposer import FinancialDecomposer, DecompositionResult, round_inr
from backend.app.core.exceptions import ExceptionDetector, ExceptionItem


@dataclass
class ReconciliationSummary:
    total_records: int = 0
    matched: int = 0
    unmatched: int = 0
    fully_explained: int = 0
    partially_explained: int = 0
    unresolved: int = 0
    high_priority: int = 0
    medium_priority: int = 0
    low_priority: int = 0
    match_rate: float = 0.0
    explanation_rate: float = 0.0
    total_merchant_amount: float = 0.0
    total_settlement_amount: float = 0.0
    total_difference: float = 0.0
    total_unexplained: float = 0.0
    total_explained: float = 0.0
    total_fees: float = 0.0
    total_tax: float = 0.0
    total_refunds: float = 0.0
    processing_time_seconds: float = 0.0
    records_per_second: float = 0.0
    status_counts: dict[str, int] = field(default_factory=dict)
    match_level_counts: dict[str, int] = field(default_factory=dict)
    orphan_settlement_count: int = 0


@dataclass
class ReconciliationResult:
    merchants: list[MerchantRecord]
    settlements: list[SettlementRecord]
    matches: list[MatchResult]
    decompositions: list[DecompositionResult]
    exceptions: list[ExceptionItem]
    orphan_settlements: list[SettlementRecord]
    summary: ReconciliationSummary


class ReconciliationEngine:
    def reconcile_from_files(self, merchant_csv: str | Path, settlement_csv: str | Path) -> ReconciliationResult:
        merchant_path = Path(merchant_csv)
        settlement_path = Path(settlement_csv)

        with open(merchant_path, newline="", encoding="utf-8") as f:
            merchant_rows = list(csv.DictReader(f))

        with open(settlement_path, newline="", encoding="utf-8") as f:
            settlement_rows = list(csv.DictReader(f))

        merchants = parse_merchant_records(merchant_rows)
        settlements = parse_settlement_records(settlement_rows)
        return self.reconcile(merchants, settlements)

    def reconcile(self, merchants: list[MerchantRecord], settlements: list[SettlementRecord]) -> ReconciliationResult:
        start_time = time.perf_counter()

        matcher = TransactionMatcher(merchants, settlements)
        matches, orphan_settlements = matcher.match_all()

        decomposer = FinancialDecomposer(settlements)
        decompositions = decomposer.decompose_all(merchants, matches)

        detector = ExceptionDetector(settlements)
        exceptions = detector.detect_all(merchants, matches, decompositions)
        exceptions = ExceptionDetector.sort_by_priority(exceptions)

        elapsed = time.perf_counter() - start_time
        summary = self._compute_summary(merchants, settlements, matches, decompositions, exceptions, orphan_settlements, elapsed)

        return ReconciliationResult(
            merchants=merchants,
            settlements=settlements,
            matches=matches,
            decompositions=decompositions,
            exceptions=exceptions,
            orphan_settlements=orphan_settlements,
            summary=summary,
        )

    def _compute_summary(self, merchants, settlements, matches, decompositions, exceptions, orphan_settlements, elapsed) -> ReconciliationSummary:
        total = len(merchants)
        matched = sum(1 for m in matches if m.matched)
        unmatched = total - matched

        fully_explained = sum(1 for e in exceptions if e.classification == "FULLY_EXPLAINED")
        partially_explained = sum(1 for e in exceptions if e.classification == "PARTIALLY_EXPLAINED")
        unresolved = sum(1 for e in exceptions if e.classification == "UNRESOLVED")

        high_p = sum(1 for e in exceptions if e.priority == "HIGH")
        medium_p = sum(1 for e in exceptions if e.priority == "MEDIUM")
        low_p = sum(1 for e in exceptions if e.priority == "LOW")

        match_rate = matched / total if total > 0 else 0.0
        explanation_rate = (fully_explained / total) if total > 0 else 0.0

        total_merchant = round_inr(sum(m.amount for m in merchants))
        total_settlement = round_inr(sum(d.actual_net for d in decompositions))
        total_diff = round_inr(sum(abs(d.difference) for d in decompositions))
        total_unexp = round_inr(sum(abs(d.unexplained) for d in decompositions))
        total_expl = round_inr(sum(d.explained_total for d in decompositions))
        total_fees = round_inr(sum(d.total_fee for d in decompositions))
        total_tax = round_inr(sum(d.total_tax for d in decompositions))
        total_refunds = round_inr(sum(d.total_refund for d in decompositions))

        status_counts: dict[str, int] = {}
        for e in exceptions:
            status_counts[e.status] = status_counts.get(e.status, 0) + 1

        match_level_counts: dict[str, int] = {}
        for m in matches:
            key = m.match_method if m.match_method else "NO_MATCH"
            match_level_counts[key] = match_level_counts.get(key, 0) + 1

        rps = total / elapsed if elapsed > 0 else 0.0

        return ReconciliationSummary(
            total_records=total,
            matched=matched,
            unmatched=unmatched,
            fully_explained=fully_explained,
            partially_explained=partially_explained,
            unresolved=unresolved,
            high_priority=high_p,
            medium_priority=medium_p,
            low_priority=low_p,
            match_rate=round(match_rate, 4),
            explanation_rate=round(explanation_rate, 4),
            total_merchant_amount=total_merchant,
            total_settlement_amount=total_settlement,
            total_difference=total_diff,
            total_unexplained=total_unexp,
            total_explained=total_expl,
            total_fees=total_fees,
            total_tax=total_tax,
            total_refunds=total_refunds,
            processing_time_seconds=round(elapsed, 4),
            records_per_second=round(rps, 1),
            status_counts=status_counts,
            match_level_counts=match_level_counts,
            orphan_settlement_count=len(orphan_settlements),
        )

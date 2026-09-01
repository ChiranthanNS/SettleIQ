from dataclasses import dataclass, field
from datetime import date
from typing import Optional
from backend.app.models.schemas import MerchantRecord, SettlementRecord
from backend.app.core.matcher import MatchResult
from backend.app.core.decomposer import DecompositionResult, round_inr


@dataclass
class ExceptionItem:
    order_id: str
    payment_id: str
    status: str
    classification: str
    priority: str
    merchant_amount: float
    settlement_amount: float
    difference: float
    unexplained_amount: float
    fee: float = 0.0
    tax: float = 0.0
    refund: float = 0.0
    adjustment: float = 0.0
    evidence: list[str] = field(default_factory=list)
    match_method: str = ""
    match_confidence: float = 0.0
    is_duplicate: bool = False
    is_missing: bool = False
    is_timing: bool = False
    has_refund: bool = False
    gross_mismatch: float = 0.0
    merchant_date: Optional[date] = None
    settlement_date: Optional[date] = None
    settlement_delay_days: int = 0
    priority_reasons: list[str] = field(default_factory=list)


class ExceptionDetector:
    def __init__(self, settlements: list[SettlementRecord]):
        self.settlements = settlements
        self._stl_by_id = {s.settlement_id: s for s in settlements}

    def detect_all(self, merchants: list[MerchantRecord], matches: list[MatchResult], decompositions: list[DecompositionResult]) -> list[ExceptionItem]:
        return [self.detect_single(m, match, d) for m, match, d in zip(merchants, matches, decompositions)]

    def detect_single(self, merchant: MerchantRecord, match: MatchResult, decomp: DecompositionResult) -> ExceptionItem:
        matched_stls = [self._stl_by_id[sid] for sid in match.settlement_ids if sid in self._stl_by_id]
        status = self._classify_status(merchant, match, decomp, matched_stls)
        classification = self._classify_completeness(decomp, status)

        delay_days = 0
        stl_date = None
        if matched_stls:
            stl_date = matched_stls[0].settlement_date
            delay_days = max(0, (stl_date - merchant.transaction_date).days)

        is_dup = decomp.event_count > 1 and any(s.event_type == "PAYMENT" for s in matched_stls[1:])
        has_ref = decomp.total_refund > 0 or any(s.event_type == "REFUND" for s in matched_stls)

        priority, priority_reasons = self._compute_priority(merchant, match, decomp, status, classification, is_dup)

        return ExceptionItem(
            order_id=merchant.order_id,
            payment_id=merchant.payment_id,
            status=status,
            classification=classification,
            priority=priority,
            merchant_amount=decomp.merchant_amount,
            settlement_amount=decomp.actual_net,
            difference=decomp.difference,
            unexplained_amount=decomp.unexplained,
            fee=decomp.total_fee,
            tax=decomp.total_tax,
            refund=decomp.total_refund,
            adjustment=decomp.total_adjustment,
            evidence=list(match.evidence),
            match_method=match.match_method,
            match_confidence=match.confidence,
            is_duplicate=is_dup,
            is_missing=(status == "MISSING"),
            is_timing=(status == "TIMING_DIFFERENCE"),
            has_refund=has_ref,
            gross_mismatch=decomp.gross_difference,
            merchant_date=merchant.transaction_date,
            settlement_date=stl_date,
            settlement_delay_days=delay_days,
            priority_reasons=priority_reasons,
        )

    def _classify_status(self, merchant: MerchantRecord, match: MatchResult, decomp: DecompositionResult, matched_stls: list[SettlementRecord]) -> str:
        if not match.matched or not matched_stls:
            return "MISSING"

        payment_events = [s for s in matched_stls if s.event_type == "PAYMENT"]
        if len(payment_events) > 1:
            return "DUPLICATE"

        has_refund = decomp.total_refund > 0 or any(s.event_type == "REFUND" for s in matched_stls)
        if has_refund:
            return "REFUND"

        if matched_stls:
            delay = (matched_stls[0].settlement_date - merchant.transaction_date).days
            if delay > 3 and abs(decomp.unexplained) <= 1.0:
                return "TIMING_DIFFERENCE"

        if abs(decomp.unexplained) > 1.0 or abs(decomp.gross_difference) > 1.0:
            return "AMOUNT_MISMATCH"

        return "MATCHED"

    def _classify_completeness(self, decomp: DecompositionResult, status: str) -> str:
        if status == "MISSING":
            return "UNRESOLVED"
        if abs(decomp.unexplained) <= 1.0:
            return "FULLY_EXPLAINED"
        if decomp.explained_total > 0 and abs(decomp.unexplained) > 1.0:
            return "PARTIALLY_EXPLAINED"
        return "UNRESOLVED"

    def _compute_priority(self, merchant: MerchantRecord, match: MatchResult, decomp: DecompositionResult, status: str, classification: str, is_dup: bool) -> tuple[str, list[str]]:
        score = 0
        reasons = []

        unexp = decomp.unexplained
        if unexp > 5000:
            score += 3
            reasons.append(f"₹{unexp:,.2f} unexplained (above ₹5,000 threshold)")
        elif unexp > 1000:
            score += 2
            reasons.append(f"₹{unexp:,.2f} unexplained (above ₹1,000 threshold)")
        elif unexp > 1:
            score += 1
            reasons.append(f"₹{unexp:,.2f} unexplained difference")

        if is_dup or status == "DUPLICATE":
            score += 3
            reasons.append("Duplicate settlement detected — risk of double payment")

        if status == "MISSING":
            score += 3
            reasons.append(f"Missing settlement for {merchant.status} payment")

        if classification == "UNRESOLVED":
            score += 2
            reasons.append("No evidence available to explain difference")
        elif classification == "PARTIALLY_EXPLAINED":
            score += 1
            reasons.append("Only partially explained")

        if abs(decomp.gross_difference) > 1.0:
            score += 1
            reasons.append(f"Gross amount mismatch: ₹{decomp.gross_difference:,.2f}")

        if score >= 4:
            return "HIGH", reasons
        elif score >= 2:
            return "MEDIUM", reasons
        return "LOW", reasons

    @staticmethod
    def sort_by_priority(exceptions: list[ExceptionItem]) -> list[ExceptionItem]:
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        return sorted(exceptions, key=lambda e: (priority_order.get(e.priority, 3), -e.unexplained_amount, -abs(e.difference)))

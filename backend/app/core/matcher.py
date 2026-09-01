from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from backend.app.models.schemas import MerchantRecord, SettlementRecord


def parse_date(date_str: str) -> date:
    if isinstance(date_str, date):
        return date_str
    if not date_str:
        return date.today()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date string: {date_str!r}")


def parse_merchant_records(rows: list[dict]) -> list[MerchantRecord]:
    records = []
    for r in rows:
        records.append(
            MerchantRecord(
                order_id=str(r["order_id"]),
                payment_id=str(r["payment_id"]),
                customer_reference=str(r.get("customer_reference", "")),
                amount=float(r["amount"]),
                currency=str(r.get("currency", "INR")),
                transaction_date=parse_date(str(r["transaction_date"])),
                status=str(r.get("status", "SUCCESS")).upper(),
                refund_amount=float(r.get("refund_amount", 0.0)),
            )
        )
    return records


def parse_settlement_records(rows: list[dict]) -> list[SettlementRecord]:
    records = []
    for r in rows:
        records.append(
            SettlementRecord(
                settlement_id=str(r["settlement_id"]),
                payment_id=str(r["payment_id"]),
                order_id=str(r["order_id"]),
                event_type=str(r.get("event_type", "PAYMENT")).upper(),
                gross_amount=float(r["gross_amount"]),
                fee=float(r.get("fee", 0.0)),
                tax=float(r.get("tax", 0.0)),
                refund_amount=float(r.get("refund_amount", 0.0)),
                adjustment_amount=float(r.get("adjustment_amount", 0.0)),
                net_amount=float(r["net_amount"]),
                settlement_date=parse_date(str(r["settlement_date"])),
            )
        )
    return records


@dataclass
class MatchResult:
    order_id: str
    payment_id: str
    match_level: int
    match_method: str
    confidence: float
    evidence: list[str] = field(default_factory=list)
    settlement_ids: list[str] = field(default_factory=list)
    matched: bool = False


class TransactionMatcher:
    DATE_WINDOW = 7

    def __init__(self, merchants: list[MerchantRecord], settlements: list[SettlementRecord]):
        self.merchants = merchants
        self.settlements = settlements
        self._stl_by_payment_id: dict[str, list[SettlementRecord]] = {}
        self._stl_by_order_id: dict[str, list[SettlementRecord]] = {}
        self._used_settlement_ids: set[str] = set()

        for stl in settlements:
            self._stl_by_payment_id.setdefault(stl.payment_id, []).append(stl)
            self._stl_by_order_id.setdefault(stl.order_id, []).append(stl)

    def match_all(self) -> tuple[list[MatchResult], list[SettlementRecord]]:
        results: list[MatchResult] = [None] * len(self.merchants)  # type: ignore

        # Pass 1: Exact matches
        for i, merchant in enumerate(self.merchants):
            result = self._try_exact_match(merchant)
            if result.matched:
                results[i] = result
                self._used_settlement_ids.update(result.settlement_ids)

        # Pass 2: Fuzzy matches for unmatched non-failed
        for i, merchant in enumerate(self.merchants):
            if results[i] is not None:
                continue
            results[i] = self._try_fuzzy_match(merchant)

        matched_stl_ids = set()
        for r in results:
            matched_stl_ids.update(r.settlement_ids)

        orphan_settlements = [stl for stl in self.settlements if stl.settlement_id not in matched_stl_ids]
        return results, orphan_settlements

    def _try_exact_match(self, merchant: MerchantRecord) -> MatchResult:
        # Level 1: Payment ID
        stl_matches = self._stl_by_payment_id.get(merchant.payment_id, [])
        if stl_matches:
            stl_ids = [s.settlement_id for s in stl_matches]
            return MatchResult(
                order_id=merchant.order_id,
                payment_id=merchant.payment_id,
                match_level=1,
                match_method="LEVEL_1_PAYMENT_ID",
                confidence=1.0,
                evidence=[f"Exact payment_id match: {merchant.payment_id}", f"Found {len(stl_matches)} settlement event(s)"],
                settlement_ids=stl_ids,
                matched=True,
            )

        # Level 2: Order ID
        stl_matches = self._stl_by_order_id.get(merchant.order_id, [])
        if stl_matches:
            stl_ids = [s.settlement_id for s in stl_matches]
            return MatchResult(
                order_id=merchant.order_id,
                payment_id=merchant.payment_id,
                match_level=2,
                match_method="LEVEL_2_ORDER_ID",
                confidence=0.9,
                evidence=[f"Exact order_id match: {merchant.order_id}"],
                settlement_ids=stl_ids,
                matched=True,
            )

        return MatchResult(order_id=merchant.order_id, payment_id=merchant.payment_id, match_level=0, match_method="", confidence=0.0, matched=False)

    def _try_fuzzy_match(self, merchant: MerchantRecord) -> MatchResult:
        if merchant.status == "FAILED":
            return MatchResult(
                order_id=merchant.order_id,
                payment_id=merchant.payment_id,
                match_level=0,
                match_method="NO_MATCH",
                confidence=0.0,
                evidence=["Payment status is FAILED — no settlement expected"],
                matched=False,
            )

        # Level 3: Amount + Date
        candidates = []
        for stl in self.settlements:
            if stl.settlement_id in self._used_settlement_ids:
                continue
            if abs(stl.gross_amount - merchant.amount) > 0.01:
                continue
            date_diff = abs((stl.settlement_date - merchant.transaction_date).days)
            if date_diff <= self.DATE_WINDOW:
                candidates.append((stl, date_diff))

        if candidates:
            candidates.sort(key=lambda x: x[1])
            best_stl, best_diff = candidates[0]
            self._used_settlement_ids.add(best_stl.settlement_id)
            return MatchResult(
                order_id=merchant.order_id,
                payment_id=merchant.payment_id,
                match_level=3,
                match_method="LEVEL_3_AMOUNT_DATE",
                confidence=0.7 if best_diff <= 3 else 0.5,
                evidence=[f"Exact gross amount match: ₹{merchant.amount:,.2f}", f"Date diff: {best_diff} days"],
                settlement_ids=[best_stl.settlement_id],
                matched=True,
            )

        return MatchResult(order_id=merchant.order_id, payment_id=merchant.payment_id, match_level=0, match_method="NO_MATCH", confidence=0.0, evidence=["No settlement records found"], matched=False)

from dataclasses import dataclass
from backend.app.models.schemas import MerchantRecord, SettlementRecord
from backend.app.core.matcher import MatchResult


def round_inr(amount: float) -> float:
    return round(amount, 2)


@dataclass
class DecompositionResult:
    order_id: str
    payment_id: str
    merchant_amount: float
    total_gross: float
    total_fee: float
    total_tax: float
    total_refund: float
    total_adjustment: float
    expected_net: float
    actual_net: float
    difference: float
    explained_total: float
    unexplained: float
    gross_difference: float
    event_count: int
    settlement_ids: list[str]


class FinancialDecomposer:
    def __init__(self, settlements: list[SettlementRecord]):
        self.settlements = settlements
        self._stl_by_id = {s.settlement_id: s for s in settlements}

    def decompose_all(self, merchants: list[MerchantRecord], matches: list[MatchResult]) -> list[DecompositionResult]:
        results = []
        for merchant, match in zip(merchants, matches):
            matched_stls = [self._stl_by_id[sid] for sid in match.settlement_ids if sid in self._stl_by_id]
            results.append(self.decompose_single(merchant, matched_stls))
        return results

    def decompose_single(self, merchant: MerchantRecord, matched_settlements: list[SettlementRecord]) -> DecompositionResult:
        if not matched_settlements:
            merchant_amt = round_inr(merchant.amount)
            return DecompositionResult(
                order_id=merchant.order_id,
                payment_id=merchant.payment_id,
                merchant_amount=merchant_amt,
                total_gross=0.0,
                total_fee=0.0,
                total_tax=0.0,
                total_refund=0.0,
                total_adjustment=0.0,
                expected_net=merchant_amt,
                actual_net=0.0,
                difference=merchant_amt,
                explained_total=0.0,
                unexplained=merchant_amt,
                gross_difference=merchant_amt,
                event_count=0,
                settlement_ids=[],
            )

        total_gross = round_inr(sum(s.gross_amount for s in matched_settlements))
        total_fee = round_inr(sum(s.fee for s in matched_settlements))
        total_tax = round_inr(sum(s.tax for s in matched_settlements))
        total_refund = round_inr(sum(s.refund_amount for s in matched_settlements))
        total_adjustment = round_inr(sum(s.adjustment_amount for s in matched_settlements))
        actual_net = round_inr(sum(s.net_amount for s in matched_settlements))

        merchant_amt = round_inr(merchant.amount)
        expected_net = round_inr(merchant_amt - total_fee - total_tax - total_refund + total_adjustment)
        difference = round_inr(merchant_amt - actual_net)
        explained_total = round_inr(total_fee + total_tax + total_refund - total_adjustment)
        unexplained = round_inr(difference - explained_total)

        if abs(unexplained) < 0.02:
            unexplained = 0.0

        gross_diff = round_inr(merchant_amt - total_gross)

        return DecompositionResult(
            order_id=merchant.order_id,
            payment_id=merchant.payment_id,
            merchant_amount=merchant_amt,
            total_gross=total_gross,
            total_fee=total_fee,
            total_tax=total_tax,
            total_refund=total_refund,
            total_adjustment=total_adjustment,
            expected_net=expected_net,
            actual_net=actual_net,
            difference=difference,
            explained_total=explained_total,
            unexplained=unexplained,
            gross_difference=gross_diff,
            event_count=len(matched_settlements),
            settlement_ids=[s.settlement_id for s in matched_settlements],
        )

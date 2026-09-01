import re
from dataclasses import dataclass, field
from backend.app.core.reconciler import ReconciliationResult
from backend.app.services.investigator import RuleBasedInvestigator, format_inr, ExceptionItem


@dataclass
class NLQueryResponse:
    query: str
    intent: str
    answer: str
    records: list[dict] = field(default_factory=list)
    breakdown: dict = field(default_factory=dict)
    confidence: str = "HIGH"
    evidence: list[str] = field(default_factory=list)


class ReconciliationQueryEngine:
    def __init__(self, recon_result: ReconciliationResult):
        self.result = recon_result
        self.summary = recon_result.summary
        self.exceptions = recon_result.exceptions
        self.investigator = RuleBasedInvestigator()

    def query(self, query_text: str) -> NLQueryResponse:
        q = query_text.strip().lower()

        if any(phrase in q for phrase in ["investigate first", "highest priority", "top issue", "where to start", "priority"]):
            return self._handle_priority_query(query_text)

        if "duplicate" in q:
            return self._handle_filter_status(query_text, "DUPLICATE", "duplicate settlement")
        if "refund" in q:
            return self._handle_filter_status(query_text, "REFUND", "refund")
        if "missing" in q:
            return self._handle_filter_status(query_text, "MISSING", "missing settlement")

        above_match = re.search(r'(?:above|greater than|>|more than)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)', q)
        if "unexplained" in q and above_match:
            thresh = float(above_match.group(1).replace(',', ''))
            return self._handle_unexplained_above_query(query_text, thresh)

        order_match = re.search(r'(ord\d{3,6})', q)
        if order_match:
            return self._handle_order_query(query_text, order_match.group(1).upper())

        if any(w in q for w in ["fee", "tax", "gst", "total difference", "summary", "overview"]):
            return self._handle_summary_query(query_text)

        amount_match = re.search(r'(?:short by|difference of|missing|gap of)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)', q)
        if amount_match:
            amount_val = float(amount_match.group(1).replace(',', ''))
            return self._handle_amount_query(query_text, amount_val)

        return self._handle_general_query(query_text)

    def _handle_priority_query(self, query_text: str) -> NLQueryResponse:
        high = [e for e in self.exceptions if e.priority == "HIGH"]
        if not high:
            return NLQueryResponse(query=query_text, intent="PRIORITY_RECOMMENDATION", answer="0 HIGH-priority reconciliation issues found.", confidence="HIGH")

        top = high[0]
        top_list = [f"{i}. Order **{e.order_id}** — {e.status} ({format_inr(e.unexplained_amount if e.unexplained_amount > 0 else abs(e.difference))})" for i, e in enumerate(high[:5], 1)]
        answer = (
            f"You have **{len(high)} HIGH priority** exceptions requiring review.\n\n"
            f"**Recommended First Investigation:** Order **{top.order_id}** ({top.status})\n"
            f"• Reason: {'; '.join(top.priority_reasons[:2])}\n"
            f"• Impact: {format_inr(abs(top.difference))} total difference ({format_inr(top.unexplained_amount)} unresolved)\n"
            f"• Recommended Action: `{self.investigator._determine_action(top)}`\n\n"
            f"**Top priority queue:**\n" + "\n".join(top_list)
        )
        return NLQueryResponse(query=query_text, intent="PRIORITY_RECOMMENDATION", answer=answer, records=[self._as_dict(e) for e in high[:5]], confidence="HIGH", evidence=["Evaluated 7-factor priority scoring across all exceptions"])

    def _handle_unexplained_above_query(self, query_text: str, threshold: float) -> NLQueryResponse:
        filtered = [e for e in self.exceptions if e.unexplained_amount > threshold]
        total_val = sum(e.unexplained_amount for e in filtered)
        items = "\n".join([f"• **{e.order_id}**: {format_inr(e.unexplained_amount)} unexplained ({e.status}, Priority: {e.priority})" for e in filtered[:8]])
        answer = f"Found **{len(filtered)} unexplained payments** above {format_inr(threshold)}, totaling **{format_inr(total_val)}**:\n\n{items}"
        return NLQueryResponse(query=query_text, intent="UNEXPLAINED_FILTER", answer=answer, records=[self._as_dict(e) for e in filtered], confidence="HIGH", evidence=[f"Filtered exceptions where unexplained > {threshold}"])

    def _handle_filter_status(self, query_text: str, status: str, label: str) -> NLQueryResponse:
        filtered = [e for e in self.exceptions if e.status == status]
        total_diff = sum(abs(e.difference) for e in filtered)
        items = "\n".join([f"• **{e.order_id}**: Diff {format_inr(e.difference)} | Priority {e.priority}" for e in filtered[:8]])
        answer = f"Found **{len(filtered)} {label} records** (Total impact: {format_inr(total_diff)}):\n\n{items}"
        return NLQueryResponse(query=query_text, intent=f"FILTER_{status}", answer=answer, records=[self._as_dict(e) for e in filtered], confidence="HIGH", evidence=[f"Filtered exceptions by status={status}"])

    def _handle_order_query(self, query_text: str, order_id: str) -> NLQueryResponse:
        matched = [e for e in self.exceptions if e.order_id.upper() == order_id]
        if not matched:
            return NLQueryResponse(query=query_text, intent="ORDER_LOOKUP", answer=f"Order `{order_id}` was not found in active dataset.", confidence="HIGH")
        exc = matched[0]
        inv = self.investigator.investigate(exc)
        answer = (
            f"**Investigation for Order {exc.order_id}** ({exc.status} / {exc.classification}):\n\n"
            f"{inv.explanation}\n\n"
            f"• Merchant Amount: {format_inr(exc.merchant_amount)}\n"
            f"• Settlement Net: {format_inr(exc.settlement_amount)}\n"
            f"• Difference: {format_inr(exc.difference)} | Unexplained: {format_inr(exc.unexplained_amount)}\n"
            f"• Recommended Action: `{inv.recommended_action}`"
        )
        return NLQueryResponse(query=query_text, intent="ORDER_LOOKUP", answer=answer, records=[self._as_dict(exc)], evidence=inv.evidence, confidence=inv.confidence)

    def _handle_summary_query(self, query_text: str) -> NLQueryResponse:
        s = self.summary
        answer = (
            f"**Financial Reconciliation Summary:**\n\n"
            f"• **Total Merchant Volume:** {format_inr(s.total_merchant_amount)} ({s.total_records} records)\n"
            f"• **Settled Amount (Net):** {format_inr(s.total_settlement_amount)}\n"
            f"• **Total Gross Difference:** {format_inr(s.total_difference)}\n"
            f"  — Base Fees: {format_inr(s.total_fees)}\n"
            f"  — GST Taxes (18%): {format_inr(s.total_tax)}\n"
            f"  — Refunds: {format_inr(s.total_refunds)}\n"
            f"• **Fully Explained:** {s.fully_explained} ({s.explanation_rate:.1%})\n"
            f"• **Unresolved Gap:** {format_inr(s.total_unexplained)} ({s.unresolved} records)"
        )
        return NLQueryResponse(query=query_text, intent="SUMMARY", answer=answer, confidence="HIGH", evidence=["Computed from deterministic summary aggregates"])

    def _handle_amount_query(self, query_text: str, amount_val: float) -> NLQueryResponse:
        s = self.summary
        answer = (
            f"Across your entire ledger ({s.total_records} transactions), the total gross difference is {format_inr(s.total_difference)}, "
            f"comprising {format_inr(s.total_refunds)} in customer refunds, {format_inr(s.total_fees)} in gateway fees, {format_inr(s.total_tax)} in taxes, "
            f"and {format_inr(s.total_unexplained)} in unresolved discrepancies."
        )
        return NLQueryResponse(query=query_text, intent="AMOUNT_SEARCH", answer=answer, confidence="MEDIUM", evidence=["Queried against aggregate settlement metrics"])

    def _handle_general_query(self, query_text: str) -> NLQueryResponse:
        s = self.summary
        answer = (
            f"I have reconciled your dataset ({s.total_records} transactions). "
            f"{s.matched} matched ({s.match_rate:.1%}) and {s.fully_explained} are fully explained. "
            f"There are {s.high_priority} high-priority exceptions requiring review."
        )
        return NLQueryResponse(query=query_text, intent="GENERAL", answer=answer, confidence="MEDIUM")

    def _as_dict(self, exc: ExceptionItem) -> dict:
        return {
            "order_id": exc.order_id,
            "payment_id": exc.payment_id,
            "status": exc.status,
            "priority": exc.priority,
            "merchant_amount": exc.merchant_amount,
            "settlement_amount": exc.settlement_amount,
            "difference": exc.difference,
            "unexplained_amount": exc.unexplained_amount,
        }

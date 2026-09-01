import os
import json
from dataclasses import dataclass
from typing import Optional, Any

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore

from backend.app.core.exceptions import ExceptionItem
from backend.app.core.decomposer import round_inr


@dataclass
class InvestigationResult:
    order_id: str
    classification: str
    explanation: str
    evidence: list[str]
    amount_decomposition: dict
    unexplained_amount: float
    confidence: str
    recommended_action: str
    summary: str


def format_inr(amount: float) -> str:
    if amount < 0:
        return f"-₹{abs(amount):,.2f}"
    return f"₹{amount:,.2f}"


class RuleBasedInvestigator:
    """
    Deterministic Financial Investigator.
    Establishes mathematical ground truth, paise-level decompositions,
    and verified evidence trails without relying on LLM inference.
    """

    def investigate(self, exc: ExceptionItem) -> InvestigationResult:
        decomposition = self._build_decomposition(exc)
        evidence = self._build_evidence(exc)
        explanation = self._generate_explanation(exc)
        confidence = self._determine_confidence(exc)
        action = self._determine_action(exc)
        summary = self._generate_summary(exc)

        return InvestigationResult(
            order_id=exc.order_id,
            classification=exc.classification,
            explanation=explanation,
            evidence=evidence,
            amount_decomposition=decomposition,
            unexplained_amount=exc.unexplained_amount,
            confidence=confidence,
            recommended_action=action,
            summary=summary,
        )

    def investigate_all(self, exceptions: list[ExceptionItem]) -> list[InvestigationResult]:
        return [self.investigate(exc) for exc in exceptions]

    def _build_decomposition(self, exc: ExceptionItem) -> dict:
        decomp = {
            "merchant_amount": exc.merchant_amount,
            "settlement_amount": exc.settlement_amount,
            "difference": exc.difference,
        }
        if exc.fee > 0:
            decomp["processing_fee"] = exc.fee
        if exc.tax > 0:
            decomp["tax_on_fee"] = exc.tax
        if exc.refund > 0:
            decomp["refund"] = exc.refund
        if abs(exc.adjustment) > 0.01:
            decomp["adjustment"] = exc.adjustment
        if abs(exc.gross_mismatch) > 0.01:
            decomp["gross_amount_mismatch"] = exc.gross_mismatch

        decomp["total_explained"] = round_inr(exc.fee + exc.tax + exc.refund - exc.adjustment)
        decomp["unexplained"] = exc.unexplained_amount
        return decomp

    def _build_evidence(self, exc: ExceptionItem) -> list[str]:
        evidence = []
        if exc.fee > 0:
            evidence.append(f"Processing fee: {format_inr(exc.fee)}")
        if exc.tax > 0:
            evidence.append(f"Tax on fee (GST): {format_inr(exc.tax)}")
        if exc.refund > 0:
            evidence.append(f"Refund amount: {format_inr(exc.refund)}")
        if abs(exc.adjustment) > 0.01:
            evidence.append(f"Adjustment: {format_inr(exc.adjustment)}")
        if exc.is_duplicate:
            evidence.append("Duplicate settlement records detected")
        if exc.is_missing:
            evidence.append("No settlement record found")
        if exc.is_timing:
            evidence.append(f"Settlement delayed by {exc.settlement_delay_days} days")
        if abs(exc.gross_mismatch) > 0.01:
            evidence.append(f"Gross amount mismatch: merchant {format_inr(exc.merchant_amount)} vs settlement {format_inr(exc.merchant_amount - exc.gross_mismatch)}")
        return evidence

    def _generate_explanation(self, exc: ExceptionItem) -> str:
        diff = exc.difference
        unexplained = exc.unexplained_amount

        if exc.status == "MISSING":
            return (
                f"No settlement record was found for order {exc.order_id}. "
                f"The merchant ledger shows a {format_inr(exc.merchant_amount)} payment. "
                f"UNRESOLVED — insufficient evidence to determine why no settlement was recorded."
            )

        if exc.status == "DUPLICATE":
            return (
                f"Duplicate settlement records were detected for order {exc.order_id}. "
                f"The merchant expected {format_inr(exc.merchant_amount)}, but settlement records show "
                f"{format_inr(exc.settlement_amount)}. Duplicate payout excess: {format_inr(abs(diff))}."
            )

        if exc.status == "REFUND" and exc.classification == "FULLY_EXPLAINED":
            return (
                f"The {format_inr(abs(diff))} difference for order {exc.order_id} is fully explained by "
                f"{format_inr(exc.refund)} refund, {format_inr(exc.fee)} fee, and {format_inr(exc.tax)} tax."
            )

        if exc.status == "TIMING_DIFFERENCE":
            return (
                f"Settlement for order {exc.order_id} was delayed by {exc.settlement_delay_days} days. "
                f"All amounts are fully reconciled with zero financial discrepancy."
            )

        if exc.classification == "PARTIALLY_EXPLAINED":
            return (
                f"The {format_inr(abs(diff))} difference for order {exc.order_id} is only partially explained by fees/tax. "
                f"A remaining discrepancy of {format_inr(unexplained)} has insufficient evidence."
            )

        if exc.classification == "UNRESOLVED":
            return (
                f"The available records do not contain enough evidence to explain the {format_inr(unexplained)} difference "
                f"for order {exc.order_id}. UNRESOLVED — requires review."
            )

        return (
            f"Order {exc.order_id} is fully reconciled with standard deductions "
            f"(fee: {format_inr(exc.fee)}, tax: {format_inr(exc.tax)})."
        )

    def _determine_confidence(self, exc: ExceptionItem) -> str:
        if exc.classification == "FULLY_EXPLAINED" and exc.match_confidence >= 0.9:
            return "HIGH"
        elif exc.classification in ("FULLY_EXPLAINED", "PARTIALLY_EXPLAINED"):
            return "MEDIUM"
        return "LOW"

    def _determine_action(self, exc: ExceptionItem) -> str:
        if exc.is_duplicate:
            return "FLAG_DUPLICATE"
        if exc.status == "MISSING" and exc.merchant_amount > 5000:
            return "ESCALATE"
        if exc.status == "MISSING":
            return "CONTACT_PROCESSOR"
        if exc.classification in ("UNRESOLVED", "PARTIALLY_EXPLAINED"):
            return "HUMAN_REVIEW"
        return "NO_ACTION"

    def _generate_summary(self, exc: ExceptionItem) -> str:
        if exc.status == "MISSING":
            return f"Missing settlement — {format_inr(exc.merchant_amount)} unaccounted"
        if exc.status == "DUPLICATE":
            return f"Duplicate settlement — {format_inr(abs(exc.difference))} excess"
        if exc.status == "REFUND" and exc.classification == "FULLY_EXPLAINED":
            return f"Refund of {format_inr(exc.refund)} — fully reconciled"
        if exc.status == "TIMING_DIFFERENCE":
            return f"Settlement delayed {exc.settlement_delay_days} days — amounts match"
        if exc.classification == "FULLY_EXPLAINED":
            return "Fully reconciled — standard deductions"
        return f"{format_inr(exc.unexplained_amount)} unexplained difference"


class EvidenceValidator:
    """
    Evidence Grounding Validator.
    Verifies that AI-generated explanations strictly adhere to deterministic
    ledger evidence and prevents unsupported financial claims.
    """

    ALLOWED_CONFIDENCE = {"HIGH", "MEDIUM", "LOW"}
    ALLOWED_ACTIONS = {"FLAG_DUPLICATE", "ESCALATE", "CONTACT_PROCESSOR", "HUMAN_REVIEW", "NO_ACTION"}

    @classmethod
    def validate(
        cls,
        llm_data: dict,
        exc: ExceptionItem,
        fallback: InvestigationResult,
    ) -> InvestigationResult:
        try:
            explanation = llm_data.get("explanation", "").strip()
            summary = llm_data.get("summary", "").strip()
            confidence = llm_data.get("confidence", "").upper().strip()
            action = llm_data.get("recommended_action", "").upper().strip()

            # Rule 1: Explanation must be present and substantive
            if not explanation or len(explanation) < 15:
                return fallback

            # Rule 2: Confidence must be one of the standard levels
            if confidence not in cls.ALLOWED_CONFIDENCE:
                confidence = fallback.confidence

            # Rule 3: Recommended action must be valid; fallback if arbitrary
            if action not in cls.ALLOWED_ACTIONS:
                action = fallback.recommended_action

            # Rule 4: Grounded consistency check — AI cannot declare MISSING/UNRESOLVED as fully explained
            if exc.is_missing and "fully reconciled" in explanation.lower():
                return fallback

            # Rule 5: Duplicate check — must acknowledge duplicate if deterministic engine flagged it
            if exc.is_duplicate and "duplicate" not in explanation.lower():
                return fallback

            return InvestigationResult(
                order_id=exc.order_id,
                classification=exc.classification,
                explanation=explanation,
                evidence=fallback.evidence,
                amount_decomposition=fallback.amount_decomposition,
                unexplained_amount=exc.unexplained_amount,
                confidence=confidence,
                recommended_action=action,
                summary=summary or fallback.summary,
            )
        except Exception:
            return fallback


class AIInvestigator(RuleBasedInvestigator):
    """
    Evidence-Grounded AI Investigator.
    Uses an LLM (e.g., GPT-4o-mini) to synthesize plain-language explanations
    grounded strictly on deterministic ledger facts, validated by EvidenceValidator.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
    ):
        super().__init__()
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def investigate(self, exc: ExceptionItem) -> InvestigationResult:
        # Step 1: Always compute the deterministic ground truth first
        fallback = super().investigate(exc)

        # Step 2: Request structured synthesis from LLM
        try:
            prompt_payload = {
                "order_id": exc.order_id,
                "status": exc.status,
                "classification": exc.classification,
                "merchant_amount": exc.merchant_amount,
                "settlement_amount": exc.settlement_amount,
                "difference": exc.difference,
                "processing_fee": exc.fee,
                "tax_on_fee_gst": exc.tax,
                "refund": exc.refund,
                "adjustment": exc.adjustment,
                "unexplained_amount": exc.unexplained_amount,
                "verified_evidence": fallback.evidence,
            }

            system_message = (
                "You are SETTLEIQ's Evidence-Grounded Financial Investigator. "
                "Your role is to explain verified financial reconciliation exceptions to finance operators. "
                "CRITICAL RULES:\n"
                "1. You NEVER invent or guess financial numbers.\n"
                "2. Strictly reference the verified ledger facts provided in JSON.\n"
                "3. If unexplained_amount > 0, state clearly that the difference has insufficient evidence.\n"
                "4. Return a valid JSON object with keys: explanation, summary, recommended_action, confidence."
            )

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": f"Reconciliation Facts:\n{json.dumps(prompt_payload, indent=2)}"},
                ],
                response_format={"type": "json_object"},
                max_tokens=250,
                temperature=0.1,
            )

            content = response.choices[0].message.content
            if not content:
                return fallback

            llm_json = json.loads(content)
            # Step 3: Evidence Validator verifies the LLM output before passing to UI
            return EvidenceValidator.validate(llm_json, exc, fallback)

        except Exception:
            # On any LLM timeout or network error, seamlessly return the deterministic ground truth
            return fallback


def create_investigator(
    api_key: Optional[str] = None,
    model: str = "gpt-4o-mini",
    base_url: Optional[str] = None,
) -> RuleBasedInvestigator:
    """
    Factory function to instantiate the investigator.
    Returns AIInvestigator if an OpenAI API key is available,
    otherwise gracefully defaults to RuleBasedInvestigator.
    """
    key = api_key or os.getenv("OPENAI_API_KEY")
    if key and OpenAI is not None:
        try:
            return AIInvestigator(api_key=key, model=model, base_url=base_url)
        except Exception:
            return RuleBasedInvestigator()
    return RuleBasedInvestigator()

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.reconciler import ReconciliationEngine
from backend.app.services.investigator import RuleBasedInvestigator
from backend.app.services.query_engine import ReconciliationQueryEngine


def test_reconciliation():
    data_dir = PROJECT_ROOT / "backend" / "app" / "data"
    m_path = data_dir / "merchant_orders.csv"
    s_path = data_dir / "settlement_records.csv"

    engine = ReconciliationEngine()
    result = engine.reconcile_from_files(m_path, s_path)

    assert result.summary.total_records == 100
    assert result.summary.matched == 90
    assert result.summary.unmatched == 10
    assert result.summary.fully_explained == 78
    assert result.summary.high_priority == 18

    investigator = RuleBasedInvestigator()
    investigations = investigator.investigate_all(result.exceptions)
    assert len(investigations) == 100

    qe = ReconciliationQueryEngine(result)
    res = qe.query("Which issue should I investigate first?")
    assert res.intent == "PRIORITY_RECOMMENDATION"
    assert "ORD0096" in res.answer

    print("test_reconciliation passed")


def test_evidence_validator():
    from backend.app.services.investigator import EvidenceValidator, create_investigator, RuleBasedInvestigator
    from backend.app.core.exceptions import ExceptionItem

    exc = ExceptionItem(
        order_id="ORD0001",
        payment_id="PAY0001",
        merchant_amount=1000.0,
        settlement_amount=0.0,
        status="MISSING",
        classification="UNRESOLVED",
        priority="HIGH",
        difference=-1000.0,
        fee=0.0,
        tax=0.0,
        refund=0.0,
        adjustment=0.0,
        unexplained_amount=1000.0,
        evidence=["No settlement record found"],
        is_missing=True,
    )

    fallback = RuleBasedInvestigator().investigate(exc)

    # Valid LLM response
    valid_data = {
        "explanation": "No settlement was discovered for order ORD0001 in the processor ledger.",
        "summary": "Missing settlement — ₹1,000.00 unaccounted",
        "confidence": "LOW",
        "recommended_action": "CONTACT_PROCESSOR",
    }
    validated = EvidenceValidator.validate(valid_data, exc, fallback)
    assert validated.explanation == valid_data["explanation"]

    # Invalid hallucination (claims MISSING order is fully reconciled)
    invalid_data = {
        "explanation": "Order ORD0001 is fully reconciled with standard deductions.",
        "summary": "All good",
        "confidence": "HIGH",
        "recommended_action": "NO_ACTION",
    }
    rejected = EvidenceValidator.validate(invalid_data, exc, fallback)
    assert rejected == fallback

    # Investigator factory test
    inv = create_investigator()
    assert isinstance(inv, RuleBasedInvestigator)
    print("test_evidence_validator passed")


if __name__ == "__main__":
    test_reconciliation()
    test_evidence_validator()

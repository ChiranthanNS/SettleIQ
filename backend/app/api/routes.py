import csv
import io
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from backend.app.core.reconciler import ReconciliationEngine, ReconciliationResult
from backend.app.core.matcher import parse_merchant_records
from backend.app.services.investigator import create_investigator, RuleBasedInvestigator
from backend.app.services.query_engine import ReconciliationQueryEngine
from backend.app.adapters.processors import GenericAdapter, RazorpayAdapter

router = APIRouter(prefix="/api", tags=["Reconciliation"])

CURRENT_RESULT: Optional[ReconciliationResult] = None
AUDIT_TRAIL: list[dict] = []


class NLQueryRequest(BaseModel):
    query: str


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SETTLEIQ API",
        "version": "1.0.0",
        "has_active_dataset": CURRENT_RESULT is not None,
    }


@router.post("/reconcile/upload")
async def reconcile_upload(
    merchant_file: UploadFile = File(...),
    settlement_file: UploadFile = File(...),
    processor: str = Form(default="generic"),
):
    global CURRENT_RESULT, AUDIT_TRAIL

    try:
        merchant_content = (await merchant_file.read()).decode("utf-8")
        settlement_content = (await settlement_file.read()).decode("utf-8")

        merchant_reader = csv.DictReader(io.StringIO(merchant_content))
        merchants = parse_merchant_records(list(merchant_reader))

        if processor.lower() == "razorpay":
            adapter = RazorpayAdapter()
            settlements = adapter.normalize_settlements(settlement_content)
        else:
            adapter = GenericAdapter()
            settlements = adapter.normalize_settlements(settlement_content)

        engine = ReconciliationEngine()
        CURRENT_RESULT = engine.reconcile(merchants, settlements)

        investigator = create_investigator()
        for exc in CURRENT_RESULT.exceptions[:10]:
            inv = investigator.investigate(exc)
            AUDIT_TRAIL.append({
                "timestamp": datetime.utcnow().isoformat(),
                "order_id": exc.order_id,
                "status": exc.status,
                "classification": exc.classification,
                "difference": exc.difference,
                "unexplained": exc.unexplained_amount,
                "confidence": inv.confidence,
                "recommended_action": inv.recommended_action,
                "summary": inv.summary,
            })

        return {
            "success": True,
            "message": f"Successfully reconciled {CURRENT_RESULT.summary.total_records} transactions",
            "summary": CURRENT_RESULT.summary,
            "top_exceptions": CURRENT_RESULT.exceptions[:10],
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reconciliation error: {str(e)}")


@router.post("/demo/load-sample")
def load_sample_dataset():
    global CURRENT_RESULT, AUDIT_TRAIL
    data_dir = Path(__file__).parent.parent / "data"
    m_path = data_dir / "merchant_orders.csv"
    s_path = data_dir / "settlement_records.csv"

    if not m_path.exists() or not s_path.exists():
        raise HTTPException(status_code=404, detail="Sample data files not found.")

    engine = ReconciliationEngine()
    CURRENT_RESULT = engine.reconcile_from_files(m_path, s_path)

    AUDIT_TRAIL.clear()
    investigator = create_investigator()
    for exc in CURRENT_RESULT.exceptions[:15]:
        inv = investigator.investigate(exc)
        AUDIT_TRAIL.append({
            "timestamp": datetime.utcnow().isoformat(),
            "order_id": exc.order_id,
            "status": exc.status,
            "classification": exc.classification,
            "difference": exc.difference,
            "unexplained": exc.unexplained_amount,
            "confidence": inv.confidence,
            "recommended_action": inv.recommended_action,
            "summary": inv.summary,
        })

    return {
        "success": True,
        "message": "Loaded 100-record benchmark dataset.",
        "summary": CURRENT_RESULT.summary,
    }


@router.get("/reconcile/summary")
def get_summary():
    if CURRENT_RESULT is None:
        raise HTTPException(status_code=400, detail="No active dataset. Upload files or load demo data first.")
    return CURRENT_RESULT.summary


@router.get("/reconcile/exceptions")
def list_exceptions(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    classification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    if CURRENT_RESULT is None:
        raise HTTPException(status_code=400, detail="No active dataset.")

    filtered = CURRENT_RESULT.exceptions

    if priority:
        filtered = [e for e in filtered if e.priority.upper() == priority.upper()]
    if status:
        filtered = [e for e in filtered if e.status.upper() == status.upper()]
    if classification:
        filtered = [e for e in filtered if e.classification.upper() == classification.upper()]
    if search:
        s = search.lower()
        filtered = [
            e for e in filtered
            if s in e.order_id.lower() or s in e.payment_id.lower() or any(s in ev.lower() for ev in e.evidence)
        ]

    return {
        "total": len(filtered),
        "exceptions": filtered[:limit],
    }


@router.get("/reconcile/exception/{order_id}")
def get_exception_detail(order_id: str):
    if CURRENT_RESULT is None:
        raise HTTPException(status_code=400, detail="No active dataset.")

    matched_exc = next((e for e in CURRENT_RESULT.exceptions if e.order_id.upper() == order_id.upper()), None)
    if not matched_exc:
        raise HTTPException(status_code=404, detail=f"Exception for order {order_id} not found.")

    investigator = create_investigator()
    investigation = investigator.investigate(matched_exc)

    timeline = []
    if matched_exc.merchant_date:
        timeline.append({
            "stage": "Order Created & Paid",
            "date": matched_exc.merchant_date.isoformat(),
            "description": f"Merchant received order for ₹{matched_exc.merchant_amount:,.2f}",
            "status": "COMPLETED",
        })

    if matched_exc.has_refund:
        timeline.append({
            "stage": "Refund Event",
            "date": matched_exc.settlement_date.isoformat() if matched_exc.settlement_date else "N/A",
            "description": f"Refund processed: ₹{matched_exc.refund:,.2f}",
            "status": "REFUNDED",
        })

    if matched_exc.settlement_date:
        delay_msg = f" (Delayed {matched_exc.settlement_delay_days} days)" if matched_exc.settlement_delay_days > 3 else ""
        timeline.append({
            "stage": "Settlement Batch Received",
            "date": matched_exc.settlement_date.isoformat(),
            "description": f"Settlement net ₹{matched_exc.settlement_amount:,.2f} recorded{delay_msg}",
            "status": "SETTLED" if not matched_exc.is_duplicate else "DUPLICATE_SETTLED",
        })
    else:
        timeline.append({
            "stage": "Settlement Batch",
            "date": "Pending",
            "description": "No processor settlement record received to date",
            "status": "MISSING",
        })

    return {
        "exception": matched_exc,
        "investigation": investigation,
        "timeline": timeline,
    }


@router.post("/query")
def natural_language_query(req: NLQueryRequest):
    if CURRENT_RESULT is None:
        raise HTTPException(status_code=400, detail="No active dataset. Upload files or load demo data first.")

    query_engine = ReconciliationQueryEngine(CURRENT_RESULT)
    return query_engine.query(req.query)


@router.get("/audit-trail")
def get_audit_trail():
    return {
        "count": len(AUDIT_TRAIL),
        "audit_logs": AUDIT_TRAIL[::-1],
    }

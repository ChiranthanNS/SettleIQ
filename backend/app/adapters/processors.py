import csv
import io
from abc import ABC, abstractmethod
from datetime import date
from typing import Optional
from backend.app.models.schemas import SettlementRecord
from backend.app.core.matcher import parse_date


class PaymentProcessorAdapter(ABC):
    @abstractmethod
    def normalize_settlements(self, raw_data: str | list[dict]) -> list[SettlementRecord]:
        pass


class GenericAdapter(PaymentProcessorAdapter):
    def normalize_settlements(self, raw_data: str | list[dict]) -> list[SettlementRecord]:
        rows = self._ensure_rows(raw_data)
        records = []
        for r in rows:
            records.append(
                SettlementRecord(
                    settlement_id=str(r["settlement_id"]),
                    payment_id=str(r["payment_id"]),
                    order_id=str(r["order_id"]),
                    event_type=str(r["event_type"]).upper(),
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

    def _ensure_rows(self, raw_data: str | list[dict]) -> list[dict]:
        if isinstance(raw_data, str):
            reader = csv.DictReader(io.StringIO(raw_data))
            return list(reader)
        return raw_data


class RazorpayAdapter(PaymentProcessorAdapter):
    def normalize_settlements(self, raw_data: str | list[dict]) -> list[SettlementRecord]:
        rows = self._ensure_rows(raw_data)
        records = []

        for i, r in enumerate(rows):
            settlement_id = r.get("settlement_id") or r.get("id") or f"RP_STL_{i+1:04d}"
            payment_id = r.get("payment_id") or r.get("entity_id") or f"PAY{i+1:04d}"
            order_id = r.get("order_id") or r.get("notes[order_id]") or r.get("notes_order_id") or f"ORD{i+1:04d}"

            raw_type = str(r.get("type", r.get("event_type", "payment"))).lower()
            if "refund" in raw_type:
                event_type = "REFUND"
            elif "adjustment" in raw_type or "transfer" in raw_type:
                event_type = "ADJUSTMENT"
            elif "reversal" in raw_type:
                event_type = "FEE_REVERSAL"
            else:
                event_type = "PAYMENT"

            gross = float(r.get("amount", r.get("gross_amount", 0.0)))
            fee = float(r.get("fee", 0.0))
            tax = float(r.get("tax", 0.0))
            refund_amount = float(r.get("refund_amount", gross if event_type == "REFUND" else 0.0))
            adjustment_amount = float(r.get("adjustment_amount", 0.0))

            if "net_amount" in r:
                net_amount = float(r["net_amount"])
            else:
                if event_type == "REFUND":
                    net_amount = -abs(refund_amount)
                else:
                    net_amount = round(gross - fee - tax - refund_amount + adjustment_amount, 2)

            raw_date = r.get("settlement_date") or r.get("created_at") or date.today().isoformat()
            if " " in str(raw_date):
                raw_date = str(raw_date).split(" ")[0]
            elif "T" in str(raw_date):
                raw_date = str(raw_date).split("T")[0]

            records.append(
                SettlementRecord(
                    settlement_id=settlement_id,
                    payment_id=payment_id,
                    order_id=order_id,
                    event_type=event_type,
                    gross_amount=gross,
                    fee=fee,
                    tax=tax,
                    refund_amount=refund_amount,
                    adjustment_amount=adjustment_amount,
                    net_amount=net_amount,
                    settlement_date=parse_date(str(raw_date)),
                )
            )

        return records

    def _ensure_rows(self, raw_data: str | list[dict]) -> list[dict]:
        if isinstance(raw_data, str):
            reader = csv.DictReader(io.StringIO(raw_data))
            return list(reader)
        return raw_data

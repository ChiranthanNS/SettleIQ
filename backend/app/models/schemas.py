from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class MatchStatus(str, Enum):
    MATCHED = "MATCHED"
    PARTIALLY_MATCHED = "PARTIALLY_MATCHED"
    TIMING_DIFFERENCE = "TIMING_DIFFERENCE"
    REFUND = "REFUND"
    DUPLICATE = "DUPLICATE"
    MISSING = "MISSING"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    UNRESOLVED = "UNRESOLVED"


class ExceptionClassification(str, Enum):
    FULLY_EXPLAINED = "FULLY_EXPLAINED"
    PARTIALLY_EXPLAINED = "PARTIALLY_EXPLAINED"
    UNRESOLVED = "UNRESOLVED"


class Priority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class MerchantRecord:
    order_id: str
    payment_id: str
    customer_reference: str
    amount: float
    currency: str
    transaction_date: date
    status: str
    refund_amount: float = 0.0


@dataclass
class SettlementRecord:
    settlement_id: str
    payment_id: str
    order_id: str
    event_type: str
    gross_amount: float
    fee: float
    tax: float
    refund_amount: float
    adjustment_amount: float
    net_amount: float
    settlement_date: date

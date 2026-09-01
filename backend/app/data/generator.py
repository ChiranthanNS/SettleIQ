"""
SETTLEIQ — Synthetic Data Generator

Generates realistic merchant ledger and settlement records with intentional
exceptions for testing the reconciliation engine.

Usage:
    python generate_data.py --records 100 --seed 42

Output:
    data/merchant_orders.csv
    data/settlement_records.csv
    data/ground_truth.json

The generator is fully deterministic: same seed = same output.
"""

import argparse
import csv
import json
import random
from datetime import date, timedelta
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


# ─── Constants ────────────────────────────────────────────────────────────────

BASE_FEE_RATE = 0.02          # 2% processing fee (Razorpay-like)
GST_RATE = 0.18               # 18% GST on fee
MIN_AMOUNT = 500.0            # ₹500
MAX_AMOUNT = 50000.0          # ₹50,000
DATE_WINDOW_DAYS = 30         # Transactions spread over 30 days
SETTLEMENT_DELAY_MIN = 1      # Min settlement delay in days
SETTLEMENT_DELAY_MAX = 3      # Normal max settlement delay
DELAYED_SETTLEMENT_MAX = 7    # Delayed settlement max


# ─── Scenario Distribution ───────────────────────────────────────────────────

# These ratios control how many records of each type are generated.
# They sum to 1.0 and are applied to the total record count.
SCENARIO_RATIOS = {
    "normal":               0.55,   # Clean match with standard fees
    "failed":               0.05,   # Failed payment — no settlement
    "full_refund":          0.08,   # Full refund after settlement
    "partial_refund":       0.05,   # Partial refund
    "fee_variation":        0.05,   # Non-standard fee rate
    "delayed_settlement":   0.05,   # Settlement delayed beyond normal window
    "duplicate_settlement": 0.03,   # Duplicate settlement record
    "missing_settlement":   0.05,   # No settlement record at all
    "amount_mismatch":      0.04,   # Settlement amount doesn't match expected
    "unexplained":          0.05,   # No evidence in data to explain difference
}


# ─── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class MerchantOrder:
    order_id: str
    payment_id: str
    customer_reference: str
    amount: float
    currency: str
    transaction_date: str       # ISO format string
    status: str
    refund_amount: float


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
    settlement_date: str        # ISO format string


@dataclass
class GroundTruth:
    order_id: str
    true_issue: str
    true_difference: float
    description: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def round_inr(amount: float) -> float:
    """Round to 2 decimal places (paise precision)."""
    return round(amount, 2)


def generate_amount(rng: random.Random) -> float:
    """Generate a realistic transaction amount in INR."""
    # Use a distribution that favors mid-range amounts
    amount = rng.uniform(MIN_AMOUNT, MAX_AMOUNT)
    # Round to nearest rupee for realism
    return round_inr(round(amount, 0))


def generate_date(rng: random.Random, base_date: date) -> date:
    """Generate a transaction date within the date window."""
    offset = rng.randint(0, DATE_WINDOW_DAYS)
    return base_date + timedelta(days=offset)


def compute_fee(amount: float, fee_rate: float = BASE_FEE_RATE) -> float:
    """Compute processing fee."""
    return round_inr(amount * fee_rate)


def compute_tax(fee: float) -> float:
    """Compute 18% GST on fee."""
    return round_inr(fee * GST_RATE)


def compute_net(gross: float, fee: float, tax: float,
                refund: float = 0.0, adjustment: float = 0.0) -> float:
    """Compute net settlement amount. All arithmetic by code."""
    return round_inr(gross - fee - tax - refund + adjustment)


def settlement_date_from(txn_date: date, rng: random.Random,
                          delayed: bool = False) -> date:
    """Generate settlement date (1-3 days normally, 3-7 if delayed)."""
    if delayed:
        delay = rng.randint(SETTLEMENT_DELAY_MAX - 1, DELAYED_SETTLEMENT_MAX)
    else:
        delay = rng.randint(SETTLEMENT_DELAY_MIN, SETTLEMENT_DELAY_MAX)
    return txn_date + timedelta(days=delay)


# ─── Scenario Generators ─────────────────────────────────────────────────────

class ScenarioGenerator:
    """Generates merchant orders and settlement records for each scenario."""

    def __init__(self, rng: random.Random, base_date: date):
        self.rng = rng
        self.base_date = base_date
        self.order_counter = 0
        self.payment_counter = 0
        self.settlement_counter = 0

    def _next_order_id(self) -> str:
        self.order_counter += 1
        return f"ORD{self.order_counter:04d}"

    def _next_payment_id(self) -> str:
        self.payment_counter += 1
        return f"PAY{self.payment_counter:04d}"

    def _next_settlement_id(self) -> str:
        self.settlement_counter += 1
        return f"STL{self.settlement_counter:04d}"

    def _customer_ref(self, order_id: str) -> str:
        return f"CUST-{order_id}-{self.rng.randint(1000, 9999)}"

    # ── Normal ────────────────────────────────────────────────────────────

    def generate_normal(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Clean match: payment → settlement with standard fee + tax."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        settlement = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=settlement_date_from(txn_date, self.rng).isoformat(),
        )

        return order, [settlement], None

    # ── Failed Payment ────────────────────────────────────────────────────

    def generate_failed(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Failed payment — merchant has a record but no settlement exists."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="FAILED",
            refund_amount=0.0,
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="FAILED_PAYMENT",
            true_difference=amount,
            description=f"Payment failed — no settlement expected for ₹{amount:,.2f}",
        )

        return order, [], gt

    # ── Full Refund ───────────────────────────────────────────────────────

    def generate_full_refund(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Full refund: payment settled, then full refund event."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="REFUNDED",
            refund_amount=amount,
        )

        stl_date = settlement_date_from(txn_date, self.rng)
        refund_date = stl_date + timedelta(days=self.rng.randint(1, 5))

        payment_stl = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=stl_date.isoformat(),
        )

        refund_stl = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="REFUND",
            gross_amount=0.0,
            fee=0.0,
            tax=0.0,
            refund_amount=amount,
            adjustment_amount=0.0,
            net_amount=round_inr(-amount),
            settlement_date=refund_date.isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="FULL_REFUND",
            true_difference=round_inr(amount + fee + tax),
            description=f"Full refund of ₹{amount:,.2f} — net settlement should be negative after fees",
        )

        return order, [payment_stl, refund_stl], gt

    # ── Partial Refund ────────────────────────────────────────────────────

    def generate_partial_refund(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Partial refund: payment settled, then partial refund event."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        # Refund between 10% and 60% of the amount
        refund_pct = self.rng.uniform(0.10, 0.60)
        refund_amount = round_inr(round(amount * refund_pct, 0))

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="PARTIALLY_REFUNDED",
            refund_amount=refund_amount,
        )

        stl_date = settlement_date_from(txn_date, self.rng)
        refund_date = stl_date + timedelta(days=self.rng.randint(1, 5))

        payment_stl = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=stl_date.isoformat(),
        )

        refund_stl = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="REFUND",
            gross_amount=0.0,
            fee=0.0,
            tax=0.0,
            refund_amount=refund_amount,
            adjustment_amount=0.0,
            net_amount=round_inr(-refund_amount),
            settlement_date=refund_date.isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="PARTIAL_REFUND",
            true_difference=round_inr(refund_amount + fee + tax),
            description=f"Partial refund of ₹{refund_amount:,.2f} out of ₹{amount:,.2f}",
        )

        return order, [payment_stl, refund_stl], gt

    # ── Fee Variation ─────────────────────────────────────────────────────

    def generate_fee_variation(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Non-standard fee rate (1.5% or 3% instead of 2%)."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        # Different fee rate
        fee_rate = self.rng.choice([0.015, 0.025, 0.03])
        fee = compute_fee(amount, fee_rate)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        settlement = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=settlement_date_from(txn_date, self.rng).isoformat(),
        )

        # The difference from expected 2% fee
        expected_fee = compute_fee(amount, BASE_FEE_RATE)
        expected_tax = compute_tax(expected_fee)
        fee_diff = round_inr((fee + tax) - (expected_fee + expected_tax))

        gt = GroundTruth(
            order_id=order_id,
            true_issue="FEE_VARIATION",
            true_difference=round_inr(fee + tax),
            description=f"Non-standard fee rate {fee_rate*100:.1f}% applied (fee=₹{fee:,.2f}, tax=₹{tax:,.2f})",
        )

        return order, [settlement], gt

    # ── Delayed Settlement ────────────────────────────────────────────────

    def generate_delayed_settlement(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Settlement arrives late (3-7 days instead of 1-3)."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        settlement = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=settlement_date_from(txn_date, self.rng, delayed=True).isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="DELAYED_SETTLEMENT",
            true_difference=0.0,
            description="Settlement delayed beyond normal T+3 window",
        )

        return order, [settlement], gt

    # ── Duplicate Settlement ──────────────────────────────────────────────

    def generate_duplicate_settlement(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Same payment appears twice in settlement records."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        net = compute_net(amount, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        stl_date = settlement_date_from(txn_date, self.rng)

        stl1 = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=stl_date.isoformat(),
        )

        # Duplicate — same payment_id, different settlement_id
        stl2 = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=stl_date.isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="DUPLICATE_SETTLEMENT",
            true_difference=net,
            description=f"Duplicate settlement records — ₹{net:,.2f} settled twice",
        )

        return order, [stl1, stl2], gt

    # ── Missing Settlement ────────────────────────────────────────────────

    def generate_missing_settlement(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Successful merchant payment but no settlement record at all."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="MISSING_SETTLEMENT",
            true_difference=amount,
            description=f"No settlement record for successful ₹{amount:,.2f} payment",
        )

        return order, [], gt

    # ── Amount Mismatch ───────────────────────────────────────────────────

    def generate_amount_mismatch(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """Settlement amount doesn't match expected after known deductions."""
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        fee = compute_fee(amount)
        tax = compute_tax(fee)
        correct_net = compute_net(amount, fee, tax)

        # Introduce a mismatch: random adjustment not reflected in the data
        mismatch = round_inr(self.rng.uniform(50, 500))
        wrong_net = round_inr(correct_net - mismatch)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        settlement = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=amount,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            # The net_amount is wrong — doesn't match gross - fee - tax
            net_amount=wrong_net,
            settlement_date=settlement_date_from(txn_date, self.rng).isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="AMOUNT_MISMATCH",
            true_difference=mismatch,
            description=f"Settlement net is ₹{mismatch:,.2f} less than expected (₹{correct_net:,.2f} vs ₹{wrong_net:,.2f})",
        )

        return order, [settlement], gt

    # ── Unexplained ───────────────────────────────────────────────────────

    def generate_unexplained(self) -> tuple[MerchantOrder, list[SettlementRecord], Optional[GroundTruth]]:
        """
        Intentionally unexplainable difference.
        
        The settlement record shows a different gross amount than the merchant order,
        AND no fee/tax/refund/adjustment explains the gap. The data genuinely does 
        not contain enough information to determine why.
        """
        order_id = self._next_order_id()
        payment_id = self._next_payment_id()
        amount = generate_amount(self.rng)
        txn_date = generate_date(self.rng, self.base_date)

        # The settlement records a different gross amount entirely
        discrepancy = round_inr(self.rng.uniform(200, 2000))
        wrong_gross = round_inr(amount - discrepancy)

        fee = compute_fee(wrong_gross)
        tax = compute_tax(fee)
        net = compute_net(wrong_gross, fee, tax)

        order = MerchantOrder(
            order_id=order_id,
            payment_id=payment_id,
            customer_reference=self._customer_ref(order_id),
            amount=amount,
            currency="INR",
            transaction_date=txn_date.isoformat(),
            status="SUCCESS",
            refund_amount=0.0,
        )

        settlement = SettlementRecord(
            settlement_id=self._next_settlement_id(),
            payment_id=payment_id,
            order_id=order_id,
            event_type="PAYMENT",
            gross_amount=wrong_gross,
            fee=fee,
            tax=tax,
            refund_amount=0.0,
            adjustment_amount=0.0,
            net_amount=net,
            settlement_date=settlement_date_from(txn_date, self.rng).isoformat(),
        )

        gt = GroundTruth(
            order_id=order_id,
            true_issue="UNEXPLAINED",
            true_difference=discrepancy,
            description=f"₹{discrepancy:,.2f} difference — no evidence in data to explain why gross is ₹{wrong_gross:,.2f} instead of ₹{amount:,.2f}",
        )

        return order, [settlement], gt


# ─── Main Generator ──────────────────────────────────────────────────────────

def distribute_scenarios(total: int) -> dict[str, int]:
    """
    Distribute total record count across scenarios according to ratios.
    Ensures all records are accounted for (remainder goes to 'normal').
    """
    counts = {}
    allocated = 0

    for scenario, ratio in SCENARIO_RATIOS.items():
        if scenario == "normal":
            continue
        count = max(1, round(total * ratio))
        counts[scenario] = count
        allocated += count

    # Normal gets the remainder
    counts["normal"] = total - allocated
    return counts


def generate_dataset(total_records: int, seed: int, output_dir: Path):
    """Generate the complete synthetic dataset."""

    rng = random.Random(seed)
    base_date = date(2024, 7, 1)

    gen = ScenarioGenerator(rng, base_date)
    scenario_counts = distribute_scenarios(total_records)

    all_orders: list[MerchantOrder] = []
    all_settlements: list[SettlementRecord] = []
    all_ground_truth: list[GroundTruth] = []

    # Map scenario names to generator methods
    generators = {
        "normal":               gen.generate_normal,
        "failed":               gen.generate_failed,
        "full_refund":          gen.generate_full_refund,
        "partial_refund":       gen.generate_partial_refund,
        "fee_variation":        gen.generate_fee_variation,
        "delayed_settlement":   gen.generate_delayed_settlement,
        "duplicate_settlement": gen.generate_duplicate_settlement,
        "missing_settlement":   gen.generate_missing_settlement,
        "amount_mismatch":      gen.generate_amount_mismatch,
        "unexplained":          gen.generate_unexplained,
    }

    # Build the scenario execution list and shuffle for realism
    execution_list = []
    for scenario, count in scenario_counts.items():
        execution_list.extend([scenario] * count)
    rng.shuffle(execution_list)

    # Generate all records
    for scenario in execution_list:
        order, settlements, gt = generators[scenario]()
        all_orders.append(order)
        all_settlements.extend(settlements)
        if gt is not None:
            all_ground_truth.append(gt)

    # Write outputs
    output_dir.mkdir(parents=True, exist_ok=True)

    # ── merchant_orders.csv ───────────────────────────────────────────
    orders_path = output_dir / "merchant_orders.csv"
    order_fields = [
        "order_id", "payment_id", "customer_reference", "amount",
        "currency", "transaction_date", "status", "refund_amount",
    ]
    with open(orders_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=order_fields)
        writer.writeheader()
        for order in all_orders:
            writer.writerow(asdict(order))

    # ── settlement_records.csv ────────────────────────────────────────
    settlements_path = output_dir / "settlement_records.csv"
    stl_fields = [
        "settlement_id", "payment_id", "order_id", "event_type",
        "gross_amount", "fee", "tax", "refund_amount",
        "adjustment_amount", "net_amount", "settlement_date",
    ]
    with open(settlements_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=stl_fields)
        writer.writeheader()
        for stl in all_settlements:
            writer.writerow(asdict(stl))

    # ── ground_truth.json ─────────────────────────────────────────────
    gt_path = output_dir / "ground_truth.json"
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump(
            [asdict(gt) for gt in all_ground_truth],
            f,
            indent=2,
            ensure_ascii=False,
        )

    # ── Summary ───────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  SETTLEIQ — Synthetic Data Generator")
    print(f"{'='*60}")
    print(f"  Seed:                {seed}")
    print(f"  Total records:       {total_records}")
    print(f"  Merchant orders:     {len(all_orders)}")
    print(f"  Settlement records:  {len(all_settlements)}")
    print(f"  Ground truth entries:{len(all_ground_truth)}")
    print(f"{'='*60}")
    print(f"\n  Scenario distribution:")
    for scenario, count in sorted(scenario_counts.items()):
        print(f"    {scenario:25s} {count:4d}")
    print(f"\n  Output directory: {output_dir.resolve()}")
    print(f"    → {orders_path.name}")
    print(f"    → {settlements_path.name}")
    print(f"    → {gt_path.name}")
    print(f"{'='*60}\n")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SETTLEIQ Synthetic Data Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_data.py --records 100 --seed 42
  python generate_data.py --records 1000 --seed 123 --output ../data
        """,
    )
    parser.add_argument(
        "--records", type=int, default=100,
        help="Number of merchant transactions to generate (default: 100)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for deterministic generation (default: 42)",
    )
    parser.add_argument(
        "--output", type=str, default=".",
        help="Output directory (default: current directory)",
    )
    args = parser.parse_args()

    if args.records < 10:
        parser.error("Minimum 10 records required for meaningful scenario distribution")

    generate_dataset(args.records, args.seed, Path(args.output))


if __name__ == "__main__":
    main()

import argparse
import json
import time
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.data.generator import generate_dataset
from backend.app.core.reconciler import ReconciliationEngine
from backend.app.core.matcher import parse_merchant_records, parse_settlement_records
from backend.app.services.investigator import RuleBasedInvestigator


def run_benchmark(record_count: int = 1000, seed: int = 42):
    tmp_dir = PROJECT_ROOT / "backend" / ".bench_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n==================================================")
    print(f"  SETTLEIQ Benchmark Evaluation (N = {record_count:,})")
    print(f"==================================================\n")

    generate_dataset(record_count, seed, tmp_dir)

    import csv
    with open(tmp_dir / "merchant_orders.csv", newline="", encoding="utf-8") as f:
        merchants = parse_merchant_records(list(csv.DictReader(f)))

    with open(tmp_dir / "settlement_records.csv", newline="", encoding="utf-8") as f:
        settlements = parse_settlement_records(list(csv.DictReader(f)))

    t0 = time.perf_counter()
    engine = ReconciliationEngine()
    result = engine.reconcile(merchants, settlements)
    investigator = RuleBasedInvestigator()
    investigations = investigator.investigate_all(result.exceptions)
    elapsed = time.perf_counter() - t0

    s = result.summary
    print(f"  • Processed:       {s.total_records:,} transactions")
    print(f"  • Matched:         {s.matched:,} ({s.match_rate:.1%})")
    print(f"  • Fully Explained: {s.fully_explained:,} ({s.explanation_rate:.1%})")
    print(f"  • High Priority:   {s.high_priority:,}")
    print(f"  • Total Volume:    ₹{s.total_merchant_amount:,.2f}")
    print(f"  • Settled Net:     ₹{s.total_settlement_amount:,.2f}")
    print(f"  • Unresolved Gap:  ₹{s.total_unexplained:,.2f}")
    print(f"  • Latency:         {elapsed:.4f}s ({s.total_records/elapsed:,.0f} tx/sec)")
    print(f"\n==================================================\n")

    # Cleanup tmp benchmark files
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SETTLEIQ Benchmark")
    parser.add_argument("--records", type=int, default=1000, help="Number of records")
    args = parser.parse_args()
    run_benchmark(args.records)

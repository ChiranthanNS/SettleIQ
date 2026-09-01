# SETTLEIQ

**Financial Reconciliation & Automated Discrepancy Analysis System**

SETTLEIQ reconciles internal merchant order ledgers against payment processor settlement reports (Razorpay, Stripe, Banks) and investigates discrepancies using a deterministic mathematical pipeline and evidence-grounded verification.

---

## Highlights

- **Two-Pass 4-Level Matching**: Resolves exact payment IDs, order IDs, date/amount windows, and multi-signal correlations with zero false matches on failed transactions.
- **Paise-Level Financial Decomposition**: Mathematically breaks down gross order volume into base gateway fees, 18% GST on fees, customer refunds, and adjustments.
- **Evidence-Grounded Investigation**: Synthesizes verified deductions into structured explanations and strictly declares `UNRESOLVED — insufficient evidence` when evidence is absent.
- **High Throughput**: Processes ~64,000 transactions per second.
- **Enterprise Dashboard**: Next.js 16 dark-mode dashboard with interactive waterfall flows, prioritized exception queues, and transaction lifecycle timelines.

---

## Quick Start

### 1. Start the Backend API (FastAPI)
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
API Documentation is available at `http://localhost:8000/docs`.

### 2. Start the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Running Tests & Benchmarks

```bash
# Run Core Reconciliation Tests
python backend/tests/test_engine.py

# Run API Integration Tests
python backend/tests/test_api.py

# Run 1,000-Transaction Benchmark
python backend/benchmark.py --records 1000
```

---

## Repository Structure

```
settleiq/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI REST endpoints
│   │   ├── core/          # Deterministic matcher, decomposer, reconciler
│   │   ├── services/      # Investigation & query engine
│   │   ├── adapters/      # Razorpay & Generic processor adapters
│   │   ├── models/        # Schemas & data structures
│   │   ├── data/          # Sample dataset & synthetic generator
│   │   └── main.py        # Application entry point
│   ├── tests/             # Engine and API test suites
│   ├── benchmark.py       # Performance evaluation harness
│   └── requirements.txt
├── frontend/
│   ├── src/               # Next.js 16 dashboard source code
│   └── package.json
├── docs/
│   └── architecture_report.pdf # Architecture Report
└── README.md
```

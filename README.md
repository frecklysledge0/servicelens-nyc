# ServiceLens NYC — Civic Data Intelligence MVP

> **Understand the backlog. Surface emerging delays. Improve service visibility.**

**ServiceLens NYC** is a production-style civic data intelligence platform that ingests real-time NYC 311 pothole service requests, computes rolling spatial and temporal workload features, and uses a custom-trained machine learning model (`Extra Trees Classifier`, `servicelens-v1`) to rank complaints by their relative risk of administrative closure delays exceeding 7 calendar days.

---

## 1. System Architecture

```
                       ┌────────────────────────────────────────┐
                       │   NYC 311 Open Data API (Socrata)       │
                       │   https://data.cityofnewyork.us        │
                       └──────────────────┬─────────────────────┘
                                          │ Daily Scheduled Sync / Socrata API
                                          ▼
                       ┌────────────────────────────────────────┐
                       │     Python Ingestion & ML Pipeline     │
                       │  - worker/collector.py                 │
                       │  - worker/features.py                  │
                       │  - worker/inference.py (Joblib v1.5.2) │
                       │  - worker/outcomes.py                  │
                       │  - worker/db.py                        │
                       └──────────────────┬─────────────────────┘
                                          │ Upserts & Immutable Inferences
                                          ▼
                       ┌────────────────────────────────────────┐
                       │           Persistent Database          │
                       │  - Supabase PostgreSQL (Cloud)         │
                       │  - SQLite (Local Zero-Config Fallback) │
                       │  Tables:                               │
                       │    * service_requests                  │
                       │    * predictions                       │
                       │    * outcomes                          │
                       │    * sync_runs                         │
                       └──────────────────┬─────────────────────┘
                                          │ High-Performance SQL Queries
                                          ▼
                       ┌────────────────────────────────────────┐
                       │     Next.js 16 App Router API Routes   │
                       │  - /api/overview                       │
                       │  - /api/requests                       │
                       │  - /api/requests/[id]                  │
                       │  - /api/map                            │
                       │  - /api/model-performance              │
                       │  - /api/data-freshness                 │
                       │  - /api/health                         │
                       └──────────────────┬─────────────────────┘
                                          │ Interactive Frontend
                                          ▼
                       ┌────────────────────────────────────────┐
                       │   ServiceLens Modern UI (Tailwind CSS) │
                       │  1. Overview (/)                       │
                       │  2. Live Requests (/requests)          │
                       │  3. Spatial Explorer (/map)            │
                       │  4. Model Performance (/model)         │
                       │  5. Methodology (/methodology)         │
                       └────────────────────────────────────────┘
```

---

## 2. Core Features & Views

1. **Operational Overview (`/`)**:
   - 4 verified KPIs: New Requests (7d), Open Requests, Median Administrative Closure Time, and High Relative Risk Count.
   - Interactive intake vs closure trend analysis with selectable date ranges (7d, 14d, 30d).
   - Borough service snapshot comparing complaint counts against observed delay rates.
   - Ranked preview of top relative-risk requests with direct access to full detail drawers.

2. **Live Requests (`/requests`)**:
   - Multi-attribute search by Request ID and ZIP code.
   - Filters for Borough, Current Status, Relative-Risk Band, and Date ranges.
   - Sortable columns, server-side pagination, and responsive empty states.
   - Interactive slide-over drawer displaying complete request metadata, geocoding, model feature provenance, and evaluation eligibility.

3. **Spatial Explorer (`/map`)**:
   - Interactive Leaflet geospatial map with OpenStreetMap basemap tiles and proper attribution.
   - Circle markers color-coded by relative risk level (Red: High, Amber: Elevated, Teal: Typical).
   - Toggle between relative delay risk and operational status views.
   - Missing-coordinate coverage indicators preventing false point interpolation.

4. **Model Performance (`/model`)**:
   - Experimental model card for `servicelens-v1` (Extra Trees classifier).
   - Historical development metrics: 2022–2024 rolling validation folds vs 2025 retrospective diagnostic vs 2026 stress period.
   - Real feature importance rankings extracted directly from the deployed pipeline (Month 4/5 seasonality, 28d citywide workload, borough indicators).
   - Calibration curves and delay prevalence trends by calendar year.

5. **Methodology & Data (`/methodology`)**:
   - 11 comprehensive documentation sections covering data provenance, 7-day administrative closure target definitions, right-censoring handling, leakage prevention, and responsible non-causal interpretation.

---

## 3. Database Schema & Migrations

The platform includes PostgreSQL migrations in `migrations/001_initial_schema.sql` and an equivalent local SQLite storage engine in `worker/db.py`:

- **`service_requests`**: Stores NYC 311 intake records, status timestamps, coordinates, borough, ZIP code, channel, and sync tracking. Keyed by `unique_key`.
- **`predictions`**: Immutable log of model inference results, including `raw_model_score`, cohort `risk_percentile`, `risk_band`, `feature_cutoff_at`, and `is_prospective` flag.
- **`outcomes`**: Ground truth 7-day administrative closure outcomes for matured complaints (0 = closed $\le$ 7d, 1 = closed &gt; 7d or open &gt; 7d, NULL = immature &lt; 7d).
- **`sync_runs`**: Execution log tracking row counts, timestamps, and pipeline health.

---

## 4. Environment Variables

Create a `.env` or `.env.local` file (configured in deployment environments):

```bash
# Supabase PostgreSQL (Optional for local dev; SQLite fallback is automatic)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NYC Open Data App Token (Optional, increases Socrata API rate limits)
SOCRATA_APP_TOKEN="your_socrata_token"

# Model Configuration
MODEL_ARTIFACT_PATH="servicelens_v1.joblib"
MODEL_VERSION="servicelens-v1"
```

---

## 5. Local Setup & Quickstart

### Prerequisites
- Python 3.12 with `scikit-learn==1.5.2`
- Node.js 20+ and npm

### 1. Python Environment Setup
```bash
# Install compatible dependencies (strictly scikit-learn 1.5.2)
pip install "scikit-learn==1.5.2" pandas numpy joblib requests pyarrow
```

### 2. Initialize Database & Run Bootstrap
```bash
# Populates the database with verified NYC 311 records and scores recent cohort
python worker/bootstrap.py
```

### 3. Run Automated Tests
```bash
# Executes pipeline schema, inference, outcome, and persistence unit tests
python -m unittest discover tests
```

### 4. Start the Web Application
```bash
# Start Next.js development server
npm run dev

# Or directly from the web directory
cd web && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Daily Pipeline & Ingestion Worker

The ingestion pipeline can be run on demand or scheduled via GitHub Actions:

```bash
# Standard scheduled sync (queries NYC 311 API with 60-day rolling lookback)
python worker/run_pipeline.py

# Offline execution using local parquet extract
python worker/run_pipeline.py --offline
```

The GitHub Actions workflow is defined in `.github/workflows/daily_sync.yml` and triggers daily at 06:00 UTC with manual workflow dispatch options.

---

## 7. Model Caveats & Responsible Interpretation

- **Administrative Target**: The model predicts administrative closure time recorded in 311, not a verified physical roadway repair timestamp.
- **Relative Risk Rankings**: Because municipal closing policies shifted noticeably across 2021–2026, raw probability scores are compressed. ServiceLens presents **cohort-relative percentiles** and categorical risk bands rather than uncalibrated probabilities.
- **Non-Causal**: Predictions highlight statistical associations with historical backlog volume. They do not represent causal evaluations of agency worker productivity or municipal responsibility.

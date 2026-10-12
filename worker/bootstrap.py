"""
Bootstrap script for ServiceLens NYC.
Initializes the persistent database, loads existing verified NYC 311 parquet records,
computes features and model scores, evaluates ground truth outcomes, and logs sync run.
"""

import sys
import uuid
from pathlib import Path
import pandas as pd
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from worker.db import (
    init_sqlite_db,
    upsert_service_requests,
    insert_predictions,
    update_outcomes,
    record_sync_run_start,
    record_sync_run_finish
)
from worker.features import prepare_features
from worker.inference import run_inference
from worker.outcomes import compute_outcomes_for_dataframe


def run_bootstrap():
    print("=== Starting ServiceLens NYC Database Bootstrap ===")
    run_id = f"bootstrap_{uuid.uuid4().hex[:8]}"
    record_sync_run_start(run_id)

    parquet_path = BASE_DIR / "recent_pothole_requests.parquet"
    if not parquet_path.exists():
        print(f"Error: {parquet_path} not found.")
        record_sync_run_finish(run_id, "failed", error_message="recent_pothole_requests.parquet not found")
        return

    print(f"Loading {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    print(f"Loaded {len(df):,} records.")

    # 1. Upsert service requests
    print("Upserting records into persistent database...")
    records_dict = df.to_dict(orient="records")
    res = upsert_service_requests(records_dict, is_backfill=True)
    print(f"Upsert complete: {res['inserted']} inserted, {res['updated']} updated.")

    # 2. Compute features
    print("Computing rolling workload and temporal features...")
    features_df = prepare_features(df)
    print(f"Features prepared for {len(features_df):,} requests.")

    # 3. Model inference on recent cohort (latest 3 observed days)
    features_df["created_day"] = pd.to_datetime(features_df["created_date"]).dt.normalize()
    latest_day = features_df["created_day"].max()
    start_day = latest_day - pd.Timedelta(days=2)
    cohort_df = features_df[features_df["created_day"].between(start_day, latest_day)].copy()

    print(f"Scoring cohort from {start_day.date()} to {latest_day.date()} ({len(cohort_df):,} requests)...")
    scored_df, predictions_list = run_inference(cohort_df, is_prospective=False)
    inserted_preds = insert_predictions(predictions_list)
    print(f"Persisted {inserted_preds} immutable predictions.")

    # 4. Compute outcomes for all matured requests
    print("Evaluating ground truth 7-day administrative closure outcomes...")
    as_of = pd.to_datetime(df["created_date"]).max().to_pydatetime()
    outcomes_list = compute_outcomes_for_dataframe(df, as_of_time=as_of)
    updated_outcomes = update_outcomes(outcomes_list)
    print(f"Computed and stored {updated_outcomes:,} outcomes.")

    # 5. Finish sync run
    latest_str = df["created_date"].max()
    record_sync_run_finish(
        run_id=run_id,
        status="success",
        rows_fetched=len(df),
        rows_inserted=res["inserted"],
        rows_updated=res["updated"],
        latest_source_observed_at=str(latest_str)
    )
    print(f"=== Bootstrap completed successfully! Run ID: {run_id} ===\n")


if __name__ == "__main__":
    run_bootstrap()

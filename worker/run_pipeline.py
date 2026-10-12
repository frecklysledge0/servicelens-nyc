"""
Main Daily Worker and Ingestion Pipeline for ServiceLens NYC.
Can be executed manually or triggered via GitHub Actions daily schedule.
"""

import sys
import uuid
from pathlib import Path
import pandas as pd
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from worker.collector import fetch_recent_requests
from worker.db import (
    init_sqlite_db,
    upsert_service_requests,
    insert_predictions,
    update_outcomes,
    record_sync_run_start,
    record_sync_run_finish,
    get_sqlite_conn
)
from worker.features import prepare_features
from worker.inference import run_inference
from worker.outcomes import compute_outcomes_for_dataframe


def run_pipeline(lookback_days: int = 60, offline_mode: bool = False):
    print("=== Starting ServiceLens NYC Ingestion & Inference Pipeline ===")
    run_id = f"sync_{uuid.uuid4().hex[:8]}"
    record_sync_run_start(run_id)

    try:
        if offline_mode:
            print("Offline mode requested: loading local parquet extract...")
            parquet_path = BASE_DIR / "recent_pothole_requests.parquet"
            if not parquet_path.exists():
                raise FileNotFoundError(f"{parquet_path} not found for offline run.")
            raw_df = pd.read_parquet(parquet_path)
        else:
            print(f"Fetching recent requests from NYC 311 Socrata API (lookback={lookback_days}d)...")
            raw_df = fetch_recent_requests(lookback_days=lookback_days)
            if raw_df.empty:
                print("Warning: API returned 0 records. Falling back to local extract if available...")
                parquet_path = BASE_DIR / "recent_pothole_requests.parquet"
                if parquet_path.exists():
                    raw_df = pd.read_parquet(parquet_path)
                else:
                    raise RuntimeError("No records received from API and no local extract available.")

        print(f"Ingested {len(raw_df):,} raw records.")

        # Upsert records
        records_dict = raw_df.to_dict(orient="records")
        upsert_res = upsert_service_requests(records_dict, is_backfill=False)
        print(f"Database upsert: {upsert_res['inserted']} inserted, {upsert_res['updated']} updated.")

        # Build feature set
        print("Computing rolling workload features...")
        features_df = prepare_features(raw_df)

        # Select requests to score: newest 3 days
        features_df["created_day"] = pd.to_datetime(features_df["created_date"]).dt.normalize()
        latest_day = features_df["created_day"].max()
        start_day = latest_day - pd.Timedelta(days=2)
        to_score_df = features_df[features_df["created_day"].between(start_day, latest_day)].copy()

        print(f"Running ML inference on recent cohort ({len(to_score_df):,} records)...")
        scored_df, predictions_list = run_inference(to_score_df, is_prospective=True)

        inserted_preds = insert_predictions(predictions_list)
        print(f"Recorded {inserted_preds} immutable prediction entries.")

        # Update outcomes for matured requests
        print("Updating ground truth outcomes for matured requests...")
        outcomes_list = compute_outcomes_for_dataframe(raw_df)
        updated_outcomes = update_outcomes(outcomes_list)
        print(f"Updated {updated_outcomes:,} outcomes.")

        latest_obs = str(raw_df["created_date"].max()) if not raw_df.empty else None
        record_sync_run_finish(
            run_id=run_id,
            status="success",
            rows_fetched=len(raw_df),
            rows_inserted=upsert_res["inserted"],
            rows_updated=upsert_res["updated"],
            latest_source_observed_at=latest_obs
        )
        print(f"=== Pipeline completed successfully. Run ID: {run_id} ===\n")

    except Exception as e:
        print(f"Error during pipeline execution: {e}")
        record_sync_run_finish(
            run_id=run_id,
            status="failed",
            error_message=str(e)
        )
        raise e


if __name__ == "__main__":
    offline = "--offline" in sys.argv
    run_pipeline(offline_mode=offline)

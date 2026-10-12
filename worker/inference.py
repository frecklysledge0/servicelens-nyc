"""
Model Inference and Risk Ranking Module for ServiceLens NYC.
Loads servicelens_v1.joblib, verifies feature schema, generates raw scores,
and computes cohort-relative risk percentiles and risk bands.
"""

import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "servicelens_v1.joblib"

_ARTIFACT_CACHE = None


def load_model_artifact(model_path: Path = MODEL_PATH) -> Dict[str, Any]:
    """Loads and caches the model artifact dictionary."""
    global _ARTIFACT_CACHE
    if _ARTIFACT_CACHE is not None:
        return _ARTIFACT_CACHE

    if not model_path.exists():
        raise FileNotFoundError(f"Model artifact not found at {model_path}")

    artifact = joblib.load(model_path)
    if not isinstance(artifact, dict) or "model" not in artifact:
        raise ValueError("Invalid model artifact: expected dict containing 'model'.")

    _ARTIFACT_CACHE = artifact
    return artifact


def run_inference(
    df: pd.DataFrame,
    is_prospective: bool = True,
    model_path: Path = MODEL_PATH
) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Executes model inference on a DataFrame that has been processed by prepare_features.
    Returns:
      - scoring_df: original df augmented with score, risk_percentile, and risk_band.
      - prediction_records: list of dictionaries ready for database insertion.
    """
    if df.empty:
        return df, []

    artifact = load_model_artifact(model_path)
    model = artifact["model"]
    feature_columns = artifact["feature_columns"]
    model_version = artifact.get("model_version", "servicelens-v1")

    # Verify input feature schema
    missing = [c for c in feature_columns if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required model input features: {missing}")

    X = df[feature_columns]
    raw_scores = model.predict_proba(X)[:, 1]

    scored_df = df.copy()
    scored_df["raw_model_score"] = raw_scores

    # Calculate cohort-relative percentiles
    if len(scored_df) > 1:
        scored_df["risk_percentile"] = scored_df["raw_model_score"].rank(pct=True).round(4)
    else:
        # For a single record, compare against historical median (~0.088) or fallback to 0.5
        scored_df["risk_percentile"] = 0.50

    # Categorize into relative risk bands
    def assign_risk_band(pct: float) -> str:
        if pct >= 0.90:
            return "High relative score"
        elif pct >= 0.70:
            return "Elevated relative score"
        else:
            return "Typical relative score"

    scored_df["risk_band"] = scored_df["risk_percentile"].apply(assign_risk_band)

    scored_now = datetime.now().isoformat()
    prediction_records = []

    for idx, row in scored_df.iterrows():
        unique_key = str(row["unique_key"])
        created_dt = str(row.get("created_date", scored_now))
        scored_day = scored_now[:10]
        pred_id = f"{unique_key}_{model_version}_{scored_day}"

        # Determine eligibility for prospective evaluation
        # Requests observed with substantial delay after creation may be excluded
        eval_eligible = True
        exclusion_reason = None

        if not is_prospective:
            eval_eligible = False
            exclusion_reason = "Historical dry-run demonstration"

        prediction_records.append({
            "prediction_id": pred_id,
            "unique_key": unique_key,
            "model_version": model_version,
            "scored_at": scored_now,
            "target_horizon_days": 7,
            "raw_model_score": float(row["raw_model_score"]),
            "risk_percentile": float(row["risk_percentile"]),
            "risk_band": row["risk_band"],
            "feature_version": "v1",
            "feature_cutoff_at": created_dt,
            "is_prospective": is_prospective,
            "evaluation_eligible": eval_eligible,
            "exclusion_reason": exclusion_reason,
        })

    return scored_df, prediction_records

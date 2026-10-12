"""
Ground Truth Outcome Evaluation Module for ServiceLens NYC.
Evaluates 7-day administrative closure outcomes without leaking future information
or prematurely labeling requests with immature observation windows.
"""

import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional


def evaluate_request_outcome(
    created_date: Any,
    closed_date: Any,
    status: Optional[str],
    as_of_time: Optional[datetime] = None,
    evaluation_horizon: int = 7
) -> Dict[str, Any]:
    """
    Evaluates whether a service request exceeded the administrative 7-day closure threshold.
    """
    if as_of_time is None:
        as_of_time = datetime.now()

    created_dt = pd.to_datetime(created_date, errors="coerce")
    if pd.isna(created_dt):
        return {
            "outcome_label": None,
            "outcome_eligibility": False,
            "unknown_reason": "Missing or invalid created_date",
        }

    # Convert to tz-naive for consistent comparisons
    if created_dt.tzinfo is not None:
        created_dt = created_dt.tz_localize(None)

    closed_dt = pd.to_datetime(closed_date, errors="coerce") if closed_date else None
    if closed_dt is not None and not pd.isna(closed_dt) and closed_dt.tzinfo is not None:
        closed_dt = closed_dt.tz_localize(None)

    elapsed_days = (as_of_time - created_dt).total_seconds() / 86400.0

    # Rule 1: Immature observation window (< 7 days elapsed)
    if elapsed_days < float(evaluation_horizon):
        return {
            "outcome_label": None,
            "outcome_eligibility": False,
            "unknown_reason": f"Immature observation window ({elapsed_days:.1f}d < {evaluation_horizon}d threshold)",
        }

    # Rule 2: Closed with timestamp
    if closed_dt is not None and not pd.isna(closed_dt):
        if closed_dt < created_dt:
            return {
                "outcome_label": None,
                "outcome_eligibility": False,
                "unknown_reason": "Inconsistent timestamps: closed_date precedes created_date",
            }

        closure_duration_days = (closed_dt - created_dt).total_seconds() / 86400.0
        if closure_duration_days > float(evaluation_horizon):
            return {
                "outcome_label": 1,
                "outcome_eligibility": True,
                "unknown_reason": None,
            }
        else:
            return {
                "outcome_label": 0,
                "outcome_eligibility": True,
                "unknown_reason": None,
            }

    # Rule 3: Still open after 7 days
    status_clean = str(status or "").strip().lower()
    if status_clean in ["open", "in progress", "pending", "assigned", "started"]:
        return {
            "outcome_label": 1,
            "outcome_eligibility": True,
            "unknown_reason": None,
        }

    # Rule 4: Marked closed/cancelled but missing closed_date
    return {
        "outcome_label": None,
        "outcome_eligibility": False,
        "unknown_reason": f"Reported status '{status}' without closed_date timestamp",
    }


def compute_outcomes_for_dataframe(
    df: pd.DataFrame,
    as_of_time: Optional[datetime] = None,
    evaluation_horizon: int = 7
) -> List[Dict[str, Any]]:
    """
    Computes outcome dictionaries for a batch of requests.
    """
    if as_of_time is None:
        as_of_time = datetime.now()

    outcomes = []
    for _, row in df.iterrows():
        unique_key = str(row["unique_key"])
        res = evaluate_request_outcome(
            created_date=row.get("created_date"),
            closed_date=row.get("closed_date"),
            status=row.get("status"),
            as_of_time=as_of_time,
            evaluation_horizon=evaluation_horizon
        )

        outcome_id = f"{unique_key}_{evaluation_horizon}"
        outcomes.append({
            "outcome_id": outcome_id,
            "unique_key": unique_key,
            "evaluation_horizon": evaluation_horizon,
            "outcome_label": res["outcome_label"],
            "outcome_observed_time": as_of_time.isoformat(),
            "outcome_eligibility": res["outcome_eligibility"],
            "label_version": "v1",
            "unknown_reason": res["unknown_reason"]
        })

    return outcomes

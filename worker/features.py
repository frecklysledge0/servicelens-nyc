"""
Feature Engineering Module for ServiceLens NYC.
Calculates historical rolling workload and calendar features matching servicelens_v1.joblib schema.
Guarantees zero data leakage using pre-cutoff window aggregates.
"""

import pandas as pd
import numpy as np
from typing import List

EXPECTED_FEATURE_COLUMNS: List[str] = [
    "problem_formerly_complaint_type",
    "problem_detail_formerly_descriptor",
    "borough_clean",
    "incident_zip",
    "open_data_channel_type",
    "created_month_cat",
    "created_weekday_cat",
    "created_hour",
    "borough_reports_prev_7d",
    "borough_reports_prev_28d",
    "zip_reports_prev_7d",
    "zip_reports_prev_28d",
    "city_reports_prev_7d",
    "city_reports_prev_28d",
]


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw NYC 311 service request records into the exact feature matrix
    required by the servicelens-v1 pipeline.
    """
    if df.empty:
        return pd.DataFrame()

    live = df.copy()

    # Normalize column names
    live.columns = (
        live.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(r"[^a-z0-9]+", "_", regex=True)
        .str.strip("_")
    )

    # Convert API terminology into training schema
    rename_map = {}
    if "complaint_type" in live.columns and "problem_formerly_complaint_type" not in live.columns:
        rename_map["complaint_type"] = "problem_formerly_complaint_type"
    if "descriptor" in live.columns and "problem_detail_formerly_descriptor" not in live.columns:
        rename_map["descriptor"] = "problem_detail_formerly_descriptor"

    live = live.rename(columns=rename_map)

    # Ensure required raw text columns exist
    if "problem_formerly_complaint_type" not in live.columns:
        live["problem_formerly_complaint_type"] = "Street Condition"
    if "problem_detail_formerly_descriptor" not in live.columns:
        live["problem_detail_formerly_descriptor"] = "Pothole"
    if "open_data_channel_type" not in live.columns:
        live["open_data_channel_type"] = "UNKNOWN"

    live["open_data_channel_type"] = live["open_data_channel_type"].fillna("UNKNOWN").astype(str)

    # Parse created_date
    live["created_date"] = pd.to_datetime(live["created_date"], errors="coerce")
    live = live.dropna(subset=["created_date"]).copy()
    if "unique_key" in live.columns:
        live = live.drop_duplicates(subset=["unique_key"], keep="last")

    live["created_day"] = live["created_date"].dt.normalize()

    # Clean Borough and Zip
    live["borough_clean"] = (
        live["borough"]
        .astype("string")
        .str.strip()
        .str.upper()
        .fillna("UNKNOWN")
    )

    live["zip_clean"] = (
        live["incident_zip"]
        .astype("string")
        .str.strip()
        .str.replace(r"\.0$", "", regex=True)
    )
    live.loc[
        live["zip_clean"].isin(["", "nan", "None", "<NA>"]),
        "zip_clean"
    ] = pd.NA

    # Model categoricals
    live["incident_zip"] = live["zip_clean"].fillna("Unknown").astype(str)
    live["created_month_cat"] = live["created_date"].dt.month.astype(str)
    live["created_weekday_cat"] = live["created_date"].dt.dayofweek.astype(str)
    live["created_hour"] = live["created_date"].dt.hour.astype(int)

    # Calculate rolling workload across all observed days
    min_day = live["created_day"].min()
    max_day = live["created_day"].max()
    all_days = pd.date_range(min_day, max_day, freq="D")

    # Citywide daily counts
    city_counts = (
        live.groupby("created_day")
        .size()
        .reindex(all_days, fill_value=0)
    )

    city_features = pd.DataFrame({"created_day": all_days})
    for window in [7, 28]:
        city_features[f"city_reports_prev_{window}d"] = (
            city_counts.shift(1)
            .rolling(window, min_periods=window)
            .sum()
            .to_numpy()
        )

    def _build_area_features(frame: pd.DataFrame, key_col: str, prefix: str) -> pd.DataFrame:
        valid = frame.dropna(subset=[key_col]).copy()
        if valid.empty:
            return pd.DataFrame(columns=[
                key_col, "created_day",
                f"{prefix}_reports_prev_7d",
                f"{prefix}_reports_prev_28d"
            ])

        counts = valid.groupby([key_col, "created_day"]).size()
        pieces = []

        for area in valid[key_col].unique():
            try:
                series = counts.xs(area, level=key_col)
            except KeyError:
                continue

            series = series.reindex(all_days, fill_value=0)
            res = pd.DataFrame({
                key_col: area,
                "created_day": all_days,
            })
            for window in [7, 28]:
                res[f"{prefix}_reports_prev_{window}d"] = (
                    series.shift(1)
                    .rolling(window, min_periods=window)
                    .sum()
                    .to_numpy()
                )
            pieces.append(res)

        if not pieces:
            return pd.DataFrame(columns=[
                key_col, "created_day",
                f"{prefix}_reports_prev_7d",
                f"{prefix}_reports_prev_28d"
            ])

        return pd.concat(pieces, ignore_index=True)

    borough_features = _build_area_features(live, "borough_clean", "borough")
    zip_features = _build_area_features(live, "zip_clean", "zip")

    live = live.merge(
        borough_features,
        on=["borough_clean", "created_day"],
        how="left"
    )

    live = live.merge(
        zip_features,
        on=["zip_clean", "created_day"],
        how="left"
    )

    live = live.merge(
        city_features,
        on="created_day",
        how="left"
    )

    return live

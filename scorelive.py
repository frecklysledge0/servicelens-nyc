import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# --------------------------------------------------
# 1. Load saved model and recent API data
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

artifact = joblib.load(BASE_DIR / "servicelens_v1.joblib")
live = pd.read_parquet(
    BASE_DIR / "recent_pothole_requests.parquet"
)

if not isinstance(artifact, dict) or "model" not in artifact:
    raise ValueError(
        "Expected the saved model artifact dictionary. "
        "Check how servicelens_v1.joblib was saved."
    )

model = artifact["model"]
feature_columns = artifact["feature_columns"]

print("Model:", artifact.get("model_version", "unknown"))
print("API records:", f"{len(live):,}")

# --------------------------------------------------
# 2. Normalize API field names
# --------------------------------------------------

live.columns = (
    live.columns.astype(str)
    .str.strip()
    .str.lower()
    .str.replace(r"[^a-z0-9]+", "_", regex=True)
    .str.strip("_")
)

# Convert API terminology into the training schema.
rename_map = {}

if (
    "complaint_type" in live.columns
    and "problem_formerly_complaint_type" not in live.columns
):
    rename_map["complaint_type"] = (
        "problem_formerly_complaint_type"
    )

if (
    "descriptor" in live.columns
    and "problem_detail_formerly_descriptor" not in live.columns
):
    rename_map["descriptor"] = (
        "problem_detail_formerly_descriptor"
    )

live = live.rename(columns=rename_map)

live["created_date"] = pd.to_datetime(
    live["created_date"], errors="coerce"
)

live = live.dropna(subset=["created_date"]).copy()
live = live.drop_duplicates(subset=["unique_key"], keep="last")

live["created_day"] = live["created_date"].dt.normalize()

live["borough_clean"] = (
    live["borough"]
    .astype("string")
    .str.strip()
    .str.upper()
    .fillna("UNKNOWN")
)

# Keep a cleaned ZIP for workload calculations.
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

# Training-time categorical features.
live["incident_zip"] = (
    live["zip_clean"].fillna("Unknown").astype(str)
)
live["created_month_cat"] = (
    live["created_date"].dt.month.astype(str)
)
live["created_weekday_cat"] = (
    live["created_date"].dt.dayofweek.astype(str)
)
live["created_hour"] = live["created_date"].dt.hour

# --------------------------------------------------
# 3. Build historical workload features
# --------------------------------------------------

# This API extract covers 60 days, so the newest requests
# have enough preceding history for 7-day and 28-day features.
all_days = pd.date_range(
    live["created_day"].min(),
    live["created_day"].max(),
    freq="D",
)

# Citywide daily counts.
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


def build_area_features(frame, key_col, prefix):
    """Calculate previous 7/28 calendar-day counts by area."""
    valid = frame.dropna(subset=[key_col]).copy()

    counts = valid.groupby(
        [key_col, "created_day"]
    ).size()

    pieces = []

    for area in valid[key_col].unique():
        try:
            series = counts.xs(area, level=key_col)
        except KeyError:
            continue

        series = series.reindex(all_days, fill_value=0)

        result = pd.DataFrame({
            key_col: area,
            "created_day": all_days,
        })

        for window in [7, 28]:
            result[f"{prefix}_reports_prev_{window}d"] = (
                series.shift(1)
                .rolling(window, min_periods=window)
                .sum()
                .to_numpy()
            )

        pieces.append(result)

    if not pieces:
        return pd.DataFrame(
            columns=[
                key_col,
                "created_day",
                f"{prefix}_reports_prev_7d",
                f"{prefix}_reports_prev_28d",
            ]
        )

    return pd.concat(pieces, ignore_index=True)


borough_features = build_area_features(
    live, "borough_clean", "borough"
)

zip_features = build_area_features(
    live, "zip_clean", "zip"
)

live = live.merge(
    borough_features,
    on=["borough_clean", "created_day"],
    how="left",
    validate="many_to_one",
)

live = live.merge(
    zip_features,
    on=["zip_clean", "created_day"],
    how="left",
    validate="many_to_one",
)

live = live.merge(
    city_features,
    on="created_day",
    how="left",
    validate="many_to_one",
)

# --------------------------------------------------
# 4. Validate the model input schema
# --------------------------------------------------

missing_features = [
    col for col in feature_columns
    if col not in live.columns
]

if missing_features:
    raise ValueError(
        f"Missing model input features: {missing_features}"
    )

# --------------------------------------------------
# 5. Dry-run inference on the latest 3 observed days
# --------------------------------------------------

latest_day = live["created_day"].max()
start_day = latest_day - pd.Timedelta(days=2)

scoring = live.loc[
    live["created_day"].between(start_day, latest_day)
].copy()

if scoring.empty:
    raise ValueError("No requests available for scoring.")

# The stored pipeline performs the same preprocessing as training.
X = scoring[feature_columns]
probabilities = model.predict_proba(X)[:, 1]

output_columns = [
    col for col in [
        "unique_key",
        "created_date",
        "status",
        "borough",
        "incident_zip",
        "problem_formerly_complaint_type",
        "problem_detail_formerly_descriptor",
    ]
    if col in scoring.columns
]

predictions = scoring[output_columns].copy()

# Call this a score rather than a calibrated probability for now.
predictions["delay_risk_score"] = probabilities
predictions["model_version"] = artifact.get(
    "model_version", "unknown"
)
predictions["scored_at"] = pd.Timestamp.now().isoformat()
predictions["dry_run"] = True

predictions = predictions.sort_values(
    "delay_risk_score", ascending=False
)

output_path = BASE_DIR / "live_prediction_dry_run.csv"
predictions.to_csv(output_path, index=False)

print("\nDry-run complete.")
print("Latest observed request date:", latest_day.date())
print("Requests scored:", f"{len(predictions):,}")
print("Average risk score:", round(
    predictions["delay_risk_score"].mean(), 4
))
print("\nHighest-scoring requests:")
print(predictions.head(10).to_string(index=False))
print("\nSaved:", output_path)
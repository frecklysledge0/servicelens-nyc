"""
NYC 311 Data Collector for ServiceLens NYC.
Fetches recent pothole service requests with backoff, pagination, and timeout handling.
"""

import os
import time
import requests
import pandas as pd
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any

API_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"


def fetch_recent_requests(
    lookback_days: int = 60,
    max_records: int = 50000,
    batch_size: int = 10000,
    max_retries: int = 3
) -> pd.DataFrame:
    """
    Fetches recent NYC 311 pothole service requests within the lookback window.
    Uses exponential backoff for network resilience.
    """
    # NYC local time because NYC Open Data timestamps are local
    nyc_tz = ZoneInfo("America/New_York")
    now_nyc = datetime.now(nyc_tz)
    start_time = (now_nyc - timedelta(days=lookback_days)).replace(tzinfo=None)

    params: Dict[str, Any] = {
        "$select": (
            "unique_key,created_date,closed_date,status,"
            "agency,complaint_type,descriptor,"
            "incident_zip,borough,latitude,longitude,"
            "open_data_channel_type,resolution_description,"
            "resolution_action_updated_date"
        ),
        "$where": (
            f"created_date >= '{start_time:%Y-%m-%dT%H:%M:%S}' "
            "AND descriptor LIKE '%Pothole%'"
        ),
        "$order": "created_date ASC",
        "$limit": batch_size,
        "$offset": 0,
    }

    headers = {}
    app_token = os.getenv("SOCRATA_APP_TOKEN")
    if app_token:
        headers["X-App-Token"] = app_token

    records = []
    session = requests.Session()

    try:
        while True:
            success = False
            for attempt in range(max_retries):
                try:
                    response = session.get(
                        API_URL,
                        params=params,
                        headers=headers,
                        timeout=60,
                    )
                    response.raise_for_status()
                    batch = response.json()
                    success = True
                    break
                except (requests.RequestException, ValueError) as err:
                    wait_sec = 2 ** attempt
                    print(f"Warning: API request error (attempt {attempt+1}/{max_retries}): {err}. Waiting {wait_sec}s...")
                    time.sleep(wait_sec)

            if not success:
                print("Error: Exceeded max retries fetching from NYC Open Data.")
                break

            records.extend(batch)
            print(f"Fetched batch of {len(batch)} records (Total so far: {len(records)})")

            if len(batch) < batch_size or len(records) >= max_records:
                break

            params["$offset"] += len(batch)
            time.sleep(0.25)

    finally:
        session.close()

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    return df

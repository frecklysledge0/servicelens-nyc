import os
import time
import requests
import pandas as pd
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

API_URL = (
    "https://data.cityofnewyork.us/resource/erm2-nwe9.json"
)

# NYC-local time, because the dataset timestamps are local.
now = datetime.now(ZoneInfo("America/New_York"))
start = (now - timedelta(days=60)).replace(tzinfo=None)

params = {
    "$select": (
        "unique_key,created_date,closed_date,status,"
        "agency,complaint_type,descriptor,"
        "incident_zip,borough,latitude,longitude,"
        "open_data_channel_type,resolution_description,"
        "resolution_action_updated_date"
    ),
    "$where": (
        f"created_date >= '{start:%Y-%m-%dT%H:%M:%S}' "
        "AND descriptor LIKE '%Pothole%'"
    ),
    "$order": "created_date ASC",
    "$limit": 50000,
    "$offset": 0,
}

headers = {}
if os.getenv("SOCRATA_APP_TOKEN"):
    headers["X-App-Token"] = os.environ["SOCRATA_APP_TOKEN"]

records = []

with requests.Session() as session:
    while True:
        response = session.get(
            API_URL,
            params=params,
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()

        batch = response.json()
        records.extend(batch)

        if len(batch) < params["$limit"]:
            break

        params["$offset"] += len(batch)
        time.sleep(0.2)

live_df = pd.DataFrame(records)

print("Requests retrieved:", len(live_df))
print(live_df.head())

live_df.to_parquet("recent_pothole_requests.parquet", index=False)
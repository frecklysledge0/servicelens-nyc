"""
Database persistence layer for ServiceLens NYC.
Supports both local SQLite (default zero-config/offline) and Supabase PostgreSQL.
"""

import os
import json
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SQLITE_DB_PATH = DATA_DIR / "servicelens.db"


def get_sqlite_conn() -> sqlite3.Connection:
    """Returns a connection to the local SQLite database."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sqlite_db():
    """Initializes SQLite schema matching the PostgreSQL schema."""
    conn = get_sqlite_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS service_requests (
        unique_key TEXT PRIMARY KEY,
        created_date TEXT NOT NULL,
        closed_date TEXT,
        status TEXT NOT NULL DEFAULT 'Open',
        agency TEXT DEFAULT 'DOT',
        complaint_type TEXT,
        descriptor TEXT,
        borough TEXT,
        incident_zip TEXT,
        latitude REAL,
        longitude REAL,
        open_data_channel_type TEXT,
        resolution_description TEXT,
        resolution_action_updated_date TEXT,
        first_seen_at TEXT NOT NULL,
        last_fetched_at TEXT NOT NULL,
        is_backfill INTEGER NOT NULL DEFAULT 0,
        source_updated_at TEXT
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_sr_created_date ON service_requests (created_date DESC);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sr_borough ON service_requests (borough);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sr_status ON service_requests (status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sr_zip ON service_requests (incident_zip);")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        prediction_id TEXT PRIMARY KEY,
        unique_key TEXT NOT NULL,
        model_version TEXT NOT NULL,
        scored_at TEXT NOT NULL,
        target_horizon_days INTEGER NOT NULL DEFAULT 7,
        raw_model_score REAL NOT NULL,
        risk_percentile REAL NOT NULL,
        risk_band TEXT NOT NULL,
        feature_version TEXT NOT NULL DEFAULT 'v1',
        feature_cutoff_at TEXT NOT NULL,
        is_prospective INTEGER NOT NULL DEFAULT 0,
        evaluation_eligible INTEGER NOT NULL DEFAULT 1,
        exclusion_reason TEXT,
        FOREIGN KEY (unique_key) REFERENCES service_requests (unique_key) ON DELETE CASCADE
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_pred_unique_key ON predictions (unique_key);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pred_scored_at ON predictions (scored_at DESC);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pred_risk_band ON predictions (risk_band);")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS outcomes (
        outcome_id TEXT PRIMARY KEY,
        unique_key TEXT NOT NULL,
        evaluation_horizon INTEGER NOT NULL DEFAULT 7,
        outcome_label INTEGER,
        outcome_observed_time TEXT NOT NULL,
        outcome_eligibility INTEGER NOT NULL DEFAULT 1,
        label_version TEXT NOT NULL DEFAULT 'v1',
        unknown_reason TEXT,
        UNIQUE (unique_key, evaluation_horizon),
        FOREIGN KEY (unique_key) REFERENCES service_requests (unique_key) ON DELETE CASCADE
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_outcomes_unique_key ON outcomes (unique_key);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_outcomes_label ON outcomes (outcome_label);")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sync_runs (
        run_id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL DEFAULT 'running',
        rows_fetched INTEGER NOT NULL DEFAULT 0,
        rows_inserted INTEGER NOT NULL DEFAULT 0,
        rows_updated INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        latest_source_observed_at TEXT
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_sync_started ON sync_runs (started_at DESC);")

    conn.commit()
    conn.close()


def is_supabase_configured() -> bool:
    """Check if Supabase credentials are provided in the environment."""
    return bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")))


def get_supabase_client():
    """Returns a Supabase client if configured."""
    if not is_supabase_configured():
        return None
    try:
        import requests
        # Simple REST client for Supabase PostgREST
        url = os.environ["SUPABASE_URL"].rstrip("/")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        return {
            "url": url,
            "headers": {
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
        }
    except Exception as e:
        print(f"Warning: could not configure Supabase: {e}")
        return None


def upsert_service_requests(records: List[Dict[str, Any]], is_backfill: bool = False) -> Dict[str, int]:
    """
    Upserts service requests into persistent storage.
    Returns counts of inserted and updated records.
    """
    init_sqlite_db()
    conn = get_sqlite_conn()
    cur = conn.cursor()

    now_iso = datetime.now().isoformat()
    inserted_count = 0
    updated_count = 0

    for r in records:
        unique_key = str(r.get("unique_key", "")).strip()
        if not unique_key:
            continue

        created_date = r.get("created_date")
        closed_date = r.get("closed_date")
        status = r.get("status") or "Open"
        agency = r.get("agency") or "DOT"
        complaint_type = r.get("complaint_type") or r.get("problem_formerly_complaint_type")
        descriptor = r.get("descriptor") or r.get("problem_detail_formerly_descriptor")
        borough = r.get("borough") or "UNKNOWN"
        incident_zip = str(r.get("incident_zip", "")).replace(".0", "").strip() or None
        
        lat = r.get("latitude")
        lon = r.get("longitude")
        try:
            lat = float(lat) if lat is not None and str(lat).strip() not in ("", "nan", "None") else None
            lon = float(lon) if lon is not None and str(lon).strip() not in ("", "nan", "None") else None
        except (ValueError, TypeError):
            lat, lon = None, None

        open_data_channel_type = r.get("open_data_channel_type")
        resolution_desc = r.get("resolution_description")
        resolution_action_date = r.get("resolution_action_updated_date")
        source_updated_at = r.get("source_updated_at")

        # Check existing
        cur.execute("SELECT unique_key, status, closed_date FROM service_requests WHERE unique_key = ?", (unique_key,))
        existing = cur.fetchone()

        if existing:
            cur.execute("""
            UPDATE service_requests SET
                closed_date = ?,
                status = ?,
                resolution_description = ?,
                resolution_action_updated_date = ?,
                last_fetched_at = ?,
                source_updated_at = ?
            WHERE unique_key = ?
            """, (
                closed_date,
                status,
                resolution_desc,
                resolution_action_date,
                now_iso,
                source_updated_at,
                unique_key,
            ))
            updated_count += 1
        else:
            cur.execute("""
            INSERT INTO service_requests (
                unique_key, created_date, closed_date, status, agency,
                complaint_type, descriptor, borough, incident_zip,
                latitude, longitude, open_data_channel_type,
                resolution_description, resolution_action_updated_date,
                first_seen_at, last_fetched_at, is_backfill, source_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                unique_key, created_date, closed_date, status, agency,
                complaint_type, descriptor, borough, incident_zip,
                lat, lon, open_data_channel_type,
                resolution_desc, resolution_action_date,
                now_iso, now_iso, 1 if is_backfill else 0, source_updated_at
            ))
            inserted_count += 1

    conn.commit()
    conn.close()

    # If Supabase is configured, sync in batches
    sb = get_supabase_client()
    if sb and records:
        try:
            import requests
            batch = []
            for r in records:
                unique_key = str(r.get("unique_key", "")).strip()
                if not unique_key:
                    continue
                batch.append({
                    "unique_key": unique_key,
                    "created_date": r.get("created_date"),
                    "closed_date": r.get("closed_date"),
                    "status": r.get("status") or "Open",
                    "agency": r.get("agency") or "DOT",
                    "complaint_type": r.get("complaint_type") or r.get("problem_formerly_complaint_type"),
                    "descriptor": r.get("descriptor") or r.get("problem_detail_formerly_descriptor"),
                    "borough": r.get("borough") or "UNKNOWN",
                    "incident_zip": str(r.get("incident_zip", "")).replace(".0", "").strip() or None,
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude"),
                    "open_data_channel_type": r.get("open_data_channel_type"),
                    "resolution_description": r.get("resolution_description"),
                    "resolution_action_updated_date": r.get("resolution_action_updated_date"),
                    "first_seen_at": now_iso,
                    "last_fetched_at": now_iso,
                    "is_backfill": is_backfill,
                    "source_updated_at": r.get("source_updated_at")
                })
            # PostgREST upsert on conflict=unique_key
            requests.post(
                f"{sb['url']}/rest/v1/service_requests",
                headers={**sb['headers'], "Prefer": "resolution=merge-duplicates"},
                json=batch[:500],
                timeout=30
            )
        except Exception as e:
            print(f"Notice: Supabase upsert failed, preserved in local SQLite: {e}")

    return {"inserted": inserted_count, "updated": updated_count}


def insert_predictions(predictions: List[Dict[str, Any]]) -> int:
    """
    Inserts immutable prediction records. Never overwrites historical predictions.
    """
    init_sqlite_db()
    conn = get_sqlite_conn()
    cur = conn.cursor()

    count = 0
    for p in predictions:
        pred_id = p.get("prediction_id") or f"{p['unique_key']}_{p['model_version']}_{p['scored_at'][:10]}"
        unique_key = str(p["unique_key"])

        cur.execute("SELECT 1 FROM predictions WHERE prediction_id = ?", (pred_id,))
        if cur.fetchone():
            continue

        cur.execute("""
        INSERT INTO predictions (
            prediction_id, unique_key, model_version, scored_at,
            target_horizon_days, raw_model_score, risk_percentile,
            risk_band, feature_version, feature_cutoff_at,
            is_prospective, evaluation_eligible, exclusion_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pred_id,
            unique_key,
            p["model_version"],
            p["scored_at"],
            p.get("target_horizon_days", 7),
            float(p["raw_model_score"]),
            float(p["risk_percentile"]),
            p["risk_band"],
            p.get("feature_version", "v1"),
            p["feature_cutoff_at"],
            1 if p.get("is_prospective", False) else 0,
            1 if p.get("evaluation_eligible", True) else 0,
            p.get("exclusion_reason"),
        ))
        count += 1

    conn.commit()
    conn.close()

    sb = get_supabase_client()
    if sb and predictions:
        try:
            import requests
            requests.post(
                f"{sb['url']}/rest/v1/predictions",
                headers={**sb['headers'], "Prefer": "resolution=ignore-duplicates"},
                json=predictions[:500],
                timeout=30
            )
        except Exception as e:
            print(f"Notice: Supabase predictions write skipped, preserved in SQLite: {e}")

    return count


def update_outcomes(outcomes: List[Dict[str, Any]]) -> int:
    """
    Inserts or updates ground-truth outcomes once requests mature.
    """
    init_sqlite_db()
    conn = get_sqlite_conn()
    cur = conn.cursor()

    count = 0
    for o in outcomes:
        unique_key = str(o["unique_key"])
        horizon = o.get("evaluation_horizon", 7)
        outcome_id = o.get("outcome_id") or f"{unique_key}_{horizon}"

        cur.execute("""
        INSERT INTO outcomes (
            outcome_id, unique_key, evaluation_horizon, outcome_label,
            outcome_observed_time, outcome_eligibility, label_version, unknown_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(unique_key, evaluation_horizon) DO UPDATE SET
            outcome_label = excluded.outcome_label,
            outcome_observed_time = excluded.outcome_observed_time,
            outcome_eligibility = excluded.outcome_eligibility,
            unknown_reason = excluded.unknown_reason
        """, (
            outcome_id,
            unique_key,
            horizon,
            o.get("outcome_label"),
            o.get("outcome_observed_time") or datetime.now().isoformat(),
            1 if o.get("outcome_eligibility", True) else 0,
            o.get("label_version", "v1"),
            o.get("unknown_reason")
        ))
        count += 1

    conn.commit()
    conn.close()
    return count


def record_sync_run_start(run_id: str) -> None:
    """Starts tracking a sync run."""
    init_sqlite_db()
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO sync_runs (run_id, started_at, status)
    VALUES (?, ?, 'running')
    ON CONFLICT(run_id) DO UPDATE SET status = 'running'
    """, (run_id, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def record_sync_run_finish(
    run_id: str,
    status: str,
    rows_fetched: int = 0,
    rows_inserted: int = 0,
    rows_updated: int = 0,
    error_message: Optional[str] = None,
    latest_source_observed_at: Optional[str] = None
) -> None:
    """Finishes tracking a sync run."""
    init_sqlite_db()
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("""
    UPDATE sync_runs SET
        finished_at = ?,
        status = ?,
        rows_fetched = ?,
        rows_inserted = ?,
        rows_updated = ?,
        error_message = ?,
        latest_source_observed_at = ?
    WHERE run_id = ?
    """, (
        datetime.now().isoformat(),
        status,
        rows_fetched,
        rows_inserted,
        rows_updated,
        error_message,
        latest_source_observed_at,
        run_id
    ))
    conn.commit()
    conn.close()

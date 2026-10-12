import unittest
import sqlite3
from worker.db import (
    get_sqlite_conn,
    upsert_service_requests,
    insert_predictions,
    update_outcomes,
    record_sync_run_start,
    record_sync_run_finish
)

class TestDatabasePersistence(unittest.TestCase):
    def test_idempotent_upsert_and_immutability(self):
        req = [{
            "unique_key": "test_unique_9999",
            "created_date": "2026-10-01T10:00:00",
            "status": "Open",
            "agency": "DOT",
            "complaint_type": "Street Condition",
            "descriptor": "Pothole",
            "borough": "BROOKLYN",
            "incident_zip": "11201"
        }]

        # 1. First insert
        res1 = upsert_service_requests(req)
        self.assertEqual(res1["inserted"] + res1["updated"], 1)

        # 2. Second insert with status update
        req[0]["status"] = "Closed"
        req[0]["closed_date"] = "2026-10-04T10:00:00"
        res2 = upsert_service_requests(req)
        self.assertEqual(res2["updated"], 1)

        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT status, closed_date FROM service_requests WHERE unique_key = 'test_unique_9999'")
        row = cur.fetchone()
        self.assertEqual(row["status"], "Closed")

        # 3. Test immutable predictions
        pred = [{
            "prediction_id": "test_pred_9999",
            "unique_key": "test_unique_9999",
            "model_version": "servicelens-v1",
            "scored_at": "2026-10-01T12:00:00",
            "target_horizon_days": 7,
            "raw_model_score": 0.155,
            "risk_percentile": 0.88,
            "risk_band": "Elevated relative score",
            "feature_version": "v1",
            "feature_cutoff_at": "2026-10-01T10:00:00",
            "is_prospective": True,
            "evaluation_eligible": True
        }]
        c1 = insert_predictions(pred)
        self.assertIn(c1, [0, 1]) # 1 if first time, 0 if already existed

        # Insert again with same prediction_id should not duplicate
        c2 = insert_predictions(pred)
        self.assertEqual(c2, 0)

        # 4. Sync runs
        run_id = "test_run_persist"
        record_sync_run_start(run_id)
        record_sync_run_finish(run_id, "success", rows_fetched=10, rows_inserted=5, rows_updated=5)
        cur.execute("SELECT status, rows_fetched FROM sync_runs WHERE run_id = ?", (run_id,))
        run_row = cur.fetchone()
        self.assertEqual(run_row["status"], "success")
        self.assertEqual(run_row["rows_fetched"], 10)

        conn.close()

if __name__ == "__main__":
    unittest.main()

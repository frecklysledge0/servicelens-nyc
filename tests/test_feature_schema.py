import unittest
import pandas as pd
from pathlib import Path
from worker.features import prepare_features, EXPECTED_FEATURE_COLUMNS
from worker.inference import load_model_artifact

class TestFeatureSchema(unittest.TestCase):
    def test_schema_matches_joblib_artifact(self):
        artifact = load_model_artifact()
        model_features = artifact["feature_columns"]
        self.assertEqual(EXPECTED_FEATURE_COLUMNS, model_features)

    def test_prepare_features_produces_all_columns(self):
        # Create minimal dummy input
        sample = pd.DataFrame([{
            "unique_key": "12345",
            "created_date": "2026-10-01 10:00:00",
            "closed_date": "2026-10-03 10:00:00",
            "status": "Closed",
            "complaint_type": "Street Condition",
            "descriptor": "Pothole",
            "borough": "QUEENS",
            "incident_zip": "11375",
            "open_data_channel_type": "ONLINE",
            "latitude": 40.72,
            "longitude": -73.84
        }])

        features_df = prepare_features(sample)
        for col in EXPECTED_FEATURE_COLUMNS:
            self.assertIn(col, features_df.columns, f"Missing feature column: {col}")

if __name__ == "__main__":
    unittest.main()

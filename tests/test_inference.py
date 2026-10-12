import unittest
import pandas as pd
from worker.features import prepare_features
from worker.inference import run_inference

class TestInference(unittest.TestCase):
    def test_inference_and_percentiles(self):
        sample = pd.DataFrame([
            {
                "unique_key": f"test_{i}",
                "created_date": f"2026-10-0{i+1} 12:00:00",
                "closed_date": None,
                "status": "Open",
                "complaint_type": "Street Condition",
                "descriptor": "Pothole",
                "borough": "BRONX" if i % 2 == 0 else "MANHATTAN",
                "incident_zip": f"1045{i}",
                "open_data_channel_type": "ONLINE",
            }
            for i in range(5)
        ])

        feat_df = prepare_features(sample)
        scored_df, pred_records = run_inference(feat_df, is_prospective=True)

        self.assertEqual(len(scored_df), 5)
        self.assertEqual(len(pred_records), 5)
        
        for p in pred_records:
            self.assertIn("raw_model_score", p)
            self.assertIn("risk_percentile", p)
            self.assertIn("risk_band", p)
            self.assertIn(p["risk_band"], ["Typical relative score", "Elevated relative score", "High relative score"])
            self.assertTrue(0.0 <= p["risk_percentile"] <= 1.0)
            self.assertTrue(p["is_prospective"])

if __name__ == "__main__":
    unittest.main()

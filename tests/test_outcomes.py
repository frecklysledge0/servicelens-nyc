import unittest
from datetime import datetime, timedelta
from worker.outcomes import evaluate_request_outcome

class TestOutcomes(unittest.TestCase):
    def setUp(self):
        self.as_of = datetime(2026, 10, 15, 12, 0, 0)

    def test_immature_observation_window(self):
        # Created 3 days before as_of (< 7 days)
        created = self.as_of - timedelta(days=3)
        res = evaluate_request_outcome(created, None, "Open", as_of_time=self.as_of)
        self.assertIsNone(res["outcome_label"])
        self.assertFalse(res["outcome_eligibility"])
        self.assertIn("Immature", res["unknown_reason"])

    def test_closed_within_7_days(self):
        created = self.as_of - timedelta(days=10)
        closed = created + timedelta(days=4)
        res = evaluate_request_outcome(created, closed, "Closed", as_of_time=self.as_of)
        self.assertEqual(res["outcome_label"], 0)
        self.assertTrue(res["outcome_eligibility"])
        self.assertIsNone(res["unknown_reason"])

    def test_closed_after_7_days(self):
        created = self.as_of - timedelta(days=12)
        closed = created + timedelta(days=9)
        res = evaluate_request_outcome(created, closed, "Closed", as_of_time=self.as_of)
        self.assertEqual(res["outcome_label"], 1)
        self.assertTrue(res["outcome_eligibility"])

    def test_open_past_7_days(self):
        created = self.as_of - timedelta(days=10)
        res = evaluate_request_outcome(created, None, "In Progress", as_of_time=self.as_of)
        self.assertEqual(res["outcome_label"], 1)
        self.assertTrue(res["outcome_eligibility"])

    def test_inconsistent_timestamps(self):
        created = self.as_of - timedelta(days=10)
        closed = created - timedelta(days=1) # closed before created
        res = evaluate_request_outcome(created, closed, "Closed", as_of_time=self.as_of)
        self.assertIsNone(res["outcome_label"])
        self.assertFalse(res["outcome_eligibility"])
        self.assertIn("Inconsistent", res["unknown_reason"])

if __name__ == "__main__":
    unittest.main()

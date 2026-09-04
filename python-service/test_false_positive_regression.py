"""
Regression Tests: Known-Genuine Products Must Never Return COUNTERFEIT.

These two cases were the root of the false-positive investigation:
  1. Cadbury Dairy Milk — OCR misread "Cabbury" (one-char typo) scored 94.44%
     similarity against "Cadbury" and was flagged COUNTERFEIT.
  2. Lahore Zeera — garbled OCR block matched "Meera" or "Mother Dairy"
     due to missing cluster-confidence gating.

Both must permanently return UNREGISTERED_INDEPENDENT or GENUINE, never COUNTERFEIT.
Add new cases here whenever a false positive is discovered in production.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.counterfeit_detection import detect_brand_spoofing


class TestFalsePositiveRegression(unittest.TestCase):

    # Case 1: Cadbury Dairy Milk OCR misread
    def test_cabbury_dairy_milk_is_not_counterfeit(self):
        result = detect_brand_spoofing("CABBURY DAIRY MILK")
        self.assertNotEqual(result["status"], "COUNTERFEIT",
            f"REGRESSION: CABBURY DAIRY MILK flagged COUNTERFEIT sim={result['similarity_score']}%")
        self.assertIn(result["status"], ("UNREGISTERED_INDEPENDENT", "GENUINE"))

    def test_cadbury_ocr_variants_not_counterfeit(self):
        variants = ["CADBURY DAIIRY MILK", "CADBURY DAIRY MLCK", "CADBURY DAIRY MIIK"]
        for brand in variants:
            result = detect_brand_spoofing(brand)
            self.assertNotEqual(result["status"], "COUNTERFEIT",
                f"REGRESSION: '{brand}' flagged COUNTERFEIT sim={result.get('similarity_score')}%")

    # Case 2: Lahore Zeera
    def test_lahore_zeera_is_not_counterfeit(self):
        result = detect_brand_spoofing("Lahore Zeera")
        self.assertNotEqual(result["status"], "COUNTERFEIT",
            f"REGRESSION: Lahore Zeera flagged COUNTERFEIT matched='{result.get('matched_brand')}' sim={result['similarity_score']}%")

    def test_zeera_alone_is_not_counterfeit(self):
        result = detect_brand_spoofing("ZEERA")
        self.assertNotEqual(result["status"], "COUNTERFEIT",
            f"REGRESSION: ZEERA flagged COUNTERFEIT matched='{result.get('matched_brand')}' sim={result['similarity_score']}%")

    # Sanity: real counterfeits must still be caught
    def test_known_counterfeits_still_caught(self):
        counterfeits = [
            "Cadbary Dairy Milk",
            "Parley-G Biscuits",
            "Taata Salt",
            "Daboor Pure Honey",
            "5urf Excel Detergent",
        ]
        for brand in counterfeits:
            result = detect_brand_spoofing(brand)
            self.assertEqual(result["status"], "COUNTERFEIT",
                f"REGRESSION: Known counterfeit '{brand}' no longer detected (got '{result['status']}' sim={result.get('similarity_score')}%)")

    # Sanity: genuine brands must still resolve as GENUINE
    def test_genuine_brands_still_verified(self):
        genuine = [
            "Cadbury Dairy Milk", "Tata Salt", "Amul Butter",
            "Parle-G", "Surf Excel", "Dabur Honey", "Maggi Noodles",
        ]
        for brand in genuine:
            result = detect_brand_spoofing(brand)
            self.assertEqual(result["status"], "GENUINE",
                f"REGRESSION: Genuine '{brand}' no longer GENUINE (got '{result['status']}' sim={result.get('similarity_score')}%)")


if __name__ == "__main__":
    unittest.main(verbosity=2)

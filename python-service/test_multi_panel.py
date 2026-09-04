"""
LMPC Inspect AI — Multi-Panel Packaging OCR & Compliance Verification Test
Executes end-to-end testing of Front PDP Brand clustering and Secondary Panel Statutory Extraction.
"""

import os
import cv2
import numpy as np
from core.ocr_ensemble import OCREnsemble
from core.statutory_rules import evaluate_statutory_rules

def run_multi_panel_test():
    print("================================================================")
    print("Running Multi-Panel Packaging & Compound Brand Extraction Test")
    print("================================================================")

    ocr_engine = OCREnsemble()

    # 1. Front PDP Panel: Large Brand Logo ("CADBURY" + "DAIRY MILK"), Small Subtext, Net Qty
    front = np.full((600, 800, 3), 255, dtype=np.uint8)
    cv2.putText(front, "CADBURY", (200, 180), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 0, 120), 4)
    cv2.putText(front, "DAIRY MILK", (160, 260), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 0, 140), 5)
    # Fine print disclaimer / subtext right below the logo (font scale < 0.45 of logo)
    cv2.putText(front, "Delicious creamy chocolate since 1905", (170, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (60, 60, 60), 1)
    cv2.putText(front, "Net Weight: 150 g", (240, 480), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (30, 30, 30), 2)
    cv2.putText(front, "NEW SMOOTHER TASTE", (50, 560), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 1)


    # 2. Back Panel 1 (Statutory Panel): MRP, Batch, Dates, FSSAI, Address
    back1 = np.full((600, 800, 3), 255, dtype=np.uint8)
    cv2.putText(back1, "MRP Rs. 85.00 (incl. of all taxes)", (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.putText(back1, "Batch No: CDM-2026-B94", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(back1, "Mfg Date: 15/08/2026", (50, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(back1, "FSSAI Lic. No. 10014022002711", (50, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(back1, "Manufactured by Mondelez India Foods Pvt Ltd, Thane - 400604", (50, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)

    # 3. Back Panel 2 (Side Panel): Ingredients & Helpline
    back2 = np.full((600, 800, 3), 255, dtype=np.uint8)
    cv2.putText(back2, "Ingredients: Sugar, Milk Solids, Cocoa Butter, Cocoa Solids", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(back2, "Consumer Helpline: 1800-22-7080 care@mdlz.com", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)

    # Extract Front Features
    front_features = ocr_engine.extract_text_and_boxes(front)
    for f in front_features:
        f['side'] = 'front'

    print("\n[1] Front Panel Extracted Features:")
    for f in front_features:
        print(f"  - [{f['category']}] {f['value']}")

    # Extract Back Panel 1 Features
    back1_features = ocr_engine.extract_text_and_boxes(back1)
    for f in back1_features:
        f['side'] = 'back_0'

    print("\n[2] Back Panel 1 Extracted Features:")
    for f in back1_features:
        print(f"  - [{f['category']}] {f['value']}")

    # Extract Back Panel 2 Features
    back2_features = ocr_engine.extract_text_and_boxes(back2)
    for f in back2_features:
        f['side'] = 'back_1'

    print("\n[3] Back Panel 2 Extracted Features:")
    for f in back2_features:
        print(f"  - [{f['category']}] {f['value']}")

    # Combined Statutory Rule Evaluation across all 3 panels
    all_features = front_features + back1_features + back2_features
    evaluations, font_metrics, overall_verdict, compliance_rate, penalty_inr = evaluate_statutory_rules(
        all_features, package_area_cm2=145.0
    )

    print("\n----------------------------------------------------------------")
    print(f"Overall Multi-Panel Verdict: {overall_verdict}")
    print(f"Statutory Compliance Rate:   {compliance_rate}%")
    print(f"Estimated Penalty:           INR {penalty_inr}")
    print("----------------------------------------------------------------")
    for ev in evaluations:
        print(f"  * {ev['ruleCode']}: {ev['status']} => {ev['detectedValue']}")
    print("================================================================")

if __name__ == '__main__':
    run_multi_panel_test()

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.advanced_algorithms import (
    extract_statutory_entities_fuzzy,
    validate_ean13_barcode,
    cluster_text_lines,
    calculate_pdp_and_font_compliance
)

def run_tests():
    print("=== Testing Fuzzy Statutory Entity Extraction ===")
    sample_ocr_texts = [
        "M.R.P. Rs. 50.00 (inclusive of all taxes)",
        "NET WT. 100 g",
        "PKD ON: 12/2024",
        "BEST BEFORE 12 MONTHS FROM PACKAGING",
        "Mfd by: Cadbury India Ltd, Mumbai - 400001",
        "Country of Origin: India"
    ]
    fuzzy_results = extract_statutory_entities_fuzzy(sample_ocr_texts)
    for cat, matches in fuzzy_results.items():
        print(f"  [{cat.upper()}]: {len(matches)} matches -> {[m['text'] for m in matches]}")
    assert len(fuzzy_results['mrp']) > 0, "MRP should be detected"
    assert len(fuzzy_results['net_qty']) > 0, "Net Qty should be detected"
    print("  PASS: Fuzzy Extraction\n")

    print("=== Testing EAN-13 Barcode & GS1 Origin ===")
    # 890 (India) valid EAN-13: 8901030383427 (calculated check digit 7)
    valid_barcode = "8901030383427"
    is_valid, country, msg = validate_ean13_barcode(valid_barcode)
    print(f"  Barcode {valid_barcode}: Valid={is_valid}, Country={country}, Msg='{msg}'")
    assert is_valid is True and country == "India", "EAN-13 validation failed"

    invalid_barcode = "8901030383429"  # bad checksum
    is_valid_inv, _, _ = validate_ean13_barcode(invalid_barcode)
    assert is_valid_inv is False, "Invalid barcode should fail checksum"
    print("  PASS: Barcode Validation\n")

    print("=== Testing Spatial 2D Text Clustering ===")
    boxes = [
        {"bbox": [10, 20, 50, 40], "text": "MRP"},
        {"bbox": [60, 22, 120, 40], "text": "Rs. 50.00"},
        {"bbox": [10, 80, 70, 100], "text": "Net Wt."},
        {"bbox": [80, 82, 130, 100], "text": "100g"}
    ]
    clustered = cluster_text_lines(boxes, eps_y=15.0)
    print(f"  Clustered into {len(clustered)} text lines:")
    for idx, line in enumerate(clustered):
        print(f"    Line {idx+1}: {[b['text'] for b in line]}")
    assert len(clustered) == 2, f"Expected 2 lines, got {len(clustered)}"
    print("  PASS: Spatial Clustering\n")

    print("=== Testing Rule 7 Dynamic PDP Area & Font Height Compliance ===")
    # Package: 1000px x 1500px, Ref: 100px = 10mm (PPM = 10px/mm)
    # Package in mm = 100mm x 150mm -> Area = 150 cm^2 (PDP <= 200 cm^2 -> req: 2.0mm)
    # Font height: 25px -> 25 / 10 = 2.5mm (>= 2.0mm -> Compliant!)
    compliance = calculate_pdp_and_font_compliance(
        package_dims_pixels=(1000, 1500),
        reference_width_pixels=100.0,
        reference_width_mm=10.0,
        text_height_pixels=25.0
    )
    print(f"  Compliance result: {compliance}")
    assert compliance["rule_7_compliant"] is True
    assert compliance["required_font_height_mm"] == 2.0
    print("  PASS: Rule 7 Compliance\n")

    print("ALL ADVANCED ALGORITHM TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()

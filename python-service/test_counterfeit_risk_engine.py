import os, sys
if sys.platform == 'win32':
    for dll_dir in [
        r'C:\Users\parth\anaconda3\envs\myenv\lib\site-packages\torch\lib',
        r'C:\Users\parth\anaconda3\envs\myenv\Library\bin',
        r'C:\Users\parth\anaconda3\envs\myenv\bin'
    ]:
        if os.path.exists(dll_dir):
            try: os.add_dll_directory(dll_dir)
            except Exception: pass
    try: import torch
    except Exception: pass

from core.counterfeit_detection import detect_brand_spoofing, compute_calibrated_counterfeit_risk
from core.indian_brand_registry import validate_gs1_barcode

def run_tests():
    print("=" * 60)
    print("COUNTERFEIT DETECTION & RISK INDEX VERIFICATION SUITE")
    print("=" * 60)

    # TEST 1: Genuine Brand (Cadbury) with valid barcode
    brand_res_1 = detect_brand_spoofing("Cadbury Dairy Milk")
    barcode_info_1 = {
        "detected": True,
        "barcode": "8901233024012",
        "isValidChecksum": True,
        "gs1Country": "India (890)",
        "isIndiaPrefix890": True,
        "isCountryMismatch": False
    }
    texture_info_1 = {"printScore": 92, "gamutScore": 95, "hologramScore": 90}
    risk_1 = compute_calibrated_counterfeit_risk(
        brand_spoof_result=brand_res_1,
        barcode_info=barcode_info_1,
        texture_info=texture_info_1,
        statutory_violations_count=0
    )
    print("\n[TEST 1] Genuine Cadbury Dairy Milk:")
    print(f"  Brand Spoof: {brand_res_1['is_spoof']} (status: {brand_res_1['status']})")
    print(f"  Risk Score: {risk_1['counterfeitScore']}/100")
    print(f"  Verdict: {risk_1['verdict']}")
    print(f"  Tamper Status: {risk_1['factors'].get('tamperSealStatus')}")
    assert risk_1['verdict'] == "AUTHENTIC", f"Expected AUTHENTIC, got {risk_1['verdict']}"
    assert risk_1['counterfeitScore'] <= 25, f"Expected risk <= 25, got {risk_1['counterfeitScore']}"

    # TEST 2: High-Risk Copycat (Amool -> Amul)
    brand_res_2 = detect_brand_spoofing("Amool")
    barcode_info_2 = {"detected": False}
    texture_info_2 = {"printScore": 70, "gamutScore": 75, "hologramScore": 60}
    risk_2 = compute_calibrated_counterfeit_risk(
        brand_spoof_result=brand_res_2,
        barcode_info=barcode_info_2,
        texture_info=texture_info_2,
        statutory_violations_count=3
    )
    print("\n[TEST 2] Copycat 'Amool' (Amul Pass-Off):")
    print(f"  Brand Spoof: {brand_res_2['is_spoof']} (type: {brand_res_2.get('spoof_type')})")
    print(f"  Target Brand: {brand_res_2.get('target_brand')}")
    print(f"  Risk Score: {risk_2['counterfeitScore']}/100")
    print(f"  Verdict: {risk_2['verdict']}")
    print(f"  Anomalies: {len(risk_2['detectedAnomalies'])} detected")
    assert brand_res_2['is_spoof'] == True, "Expected is_spoof=True for Amool"
    assert risk_2['counterfeitScore'] > 25, f"Expected elevated risk > 25, got {risk_2['counterfeitScore']}"

    # TEST 3: Barcode Modulo-10 Checksum Failure (Tampered / Fabricated EAN-13)
    brand_res_3 = detect_brand_spoofing("Tata Salt")
    barcode_info_3 = {
        "detected": True,
        "barcode": "8901030999999", # Bad checksum
        "isValidChecksum": False,
        "gs1Country": "India (890)"
    }
    risk_3 = compute_calibrated_counterfeit_risk(
        brand_spoof_result=brand_res_3,
        barcode_info=barcode_info_3,
        texture_info={"printScore": 85, "gamutScore": 88, "hologramScore": 80},
        statutory_violations_count=0
    )
    print("\n[TEST 3] Fabricated Barcode (Invalid Checksum):")
    print(f"  Risk Score: {risk_3['counterfeitScore']}/100")
    print(f"  Verdict: {risk_3['verdict']}")
    print(f"  Barcode Factor: {risk_3['factors']['barcodeGs1Integrity']}/100")
    assert risk_3['counterfeitScore'] >= 40, f"Expected barcode penalty >= 40, got {risk_3['counterfeitScore']}"

    # TEST 4: Critical Dual-Vector Counterfeit (Spoofed Brand + Invalid Barcode)
    risk_4 = compute_calibrated_counterfeit_risk(
        brand_spoof_result=detect_brand_spoofing("Bislari"),
        barcode_info={"detected": True, "barcode": "8901111111110", "isValidChecksum": False},
        texture_info={"printScore": 40, "gamutScore": 42, "hologramScore": 30},
        statutory_violations_count=4
    )
    print("\n[TEST 4] Dual-Vector Counterfeit (Bislari + Bad Barcode + Degraded Print):")
    print(f"  Risk Score: {risk_4['counterfeitScore']}/100")
    print(f"  Verdict: {risk_4['verdict']}")
    print(f"  Tamper Status: {risk_4['factors'].get('tamperSealStatus')}")
    assert risk_4['verdict'] == "CRITICAL_COUNTERFEIT", f"Expected CRITICAL_COUNTERFEIT, got {risk_4['verdict']}"
    assert risk_4['counterfeitScore'] > 55, f"Expected risk > 55, got {risk_4['counterfeitScore']}"

    # TEST 5: Blurry Camera Dampening (Preventing False Alarm on Genuine Marks)
    risk_5 = compute_calibrated_counterfeit_risk(
        brand_spoof_result=detect_brand_spoofing("Amool"),
        barcode_info={"detected": False},
        texture_info={"printScore": 50, "gamutScore": 80, "hologramScore": 70},
        statutory_violations_count=0,
        is_camera_blurry=True,
        focus_measure=45.0
    )
    print("\n[TEST 5] Camera Blur Dampening on Suspect Mark:")
    print(f"  Risk Score (Damped): {risk_5['counterfeitScore']}/100 (Un-damped was ~{risk_2['counterfeitScore']})")
    assert risk_5['counterfeitScore'] < risk_2['counterfeitScore'], "Blur damping should reduce penalty"

    print("\n" + "=" * 60)
    print("ALL COUNTERFEIT DETECTION & RISK INDEX TESTS PASSED!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()

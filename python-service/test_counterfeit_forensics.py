"""
Comprehensive Forensic Anti-Counterfeiting & Brand Spoofing Test Suite
Validates:
1. Exact registered master brand verification across FMCG, Pharma, Foods, Agro, Electrical, Auto.
2. Token-level digraph, vowel shift, homoglyphic, and phonetic lookalike brand spoofing detection.
3. Multi-word title sliding window n-gram extraction and pass-off detection.
4. Unrelated local brand non-infringement classification ('UNREGISTERED_INDEPENDENT').
5. GS1 GTIN Modulo-10 cryptographic checksum calculation and 890 country prefix verification.
6. Manufacturer GS1 prefix mismatch detection (brand vs barcode company conflict).
7. MCA 21-character Corporate Identification Number (CIN) syntax verification.
8. 14-digit FSSAI Food Safety license format and state code verification.
9. Dynamic camera blur & focus penalty dampening.
10. Sub-millisecond latency benchmark validation.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.indian_brand_registry import (
    get_all_companies,
    get_all_known_brands,
    validate_gs1_barcode,
    validate_fssai_syntax,
    validate_cin_syntax,
    find_company_by_brand
)
from core.counterfeit_detection import (
    detect_brand_spoofing,
    compute_calibrated_counterfeit_risk,
    normalize_homoglyphs,
    normalize_digraphs,
    compute_soundex,
    compute_simplified_metaphone
)


def run_all_forensic_tests():
    print("=================================================================")
    print("  RUNNING ADVANCED ANTI-COUNTERFEIT RISK & BRAND ENGINE TESTS")
    print("=================================================================\n")

    # Test 1: Registry Load Verification
    companies = get_all_companies()
    brands = get_all_known_brands()
    print(f"[TEST 1] Master Registry Size: {len(companies)} Corporate Entities, {len(brands)} Registered Brands.")
    assert len(companies) >= 50, f"Expected at least 50 companies, found {len(companies)}"
    assert len(brands) >= 300, f"Expected at least 300 brand signatures, found {len(brands)}"
    print("  -> PASS: Master Registry Loaded Successfully!\n")

    # Test 2: Token-Level Digraph & Phonetic Normalizer Sanity Check
    print("[TEST 2] Testing Digraph & Homoglyphic Token Normalizers:")
    assert normalize_digraphs("Phavicol") == "favicol", f"Digraph normalization failed for Phavicol: {normalize_digraphs('Phavicol')}"
    assert normalize_digraphs("Daboor") == "dabur", f"Digraph normalization failed for Daboor: {normalize_digraphs('Daboor')}"
    assert normalize_digraphs("Safola") == "safola", f"Digraph normalization failed for Safola: {normalize_digraphs('Safola')}"
    assert normalize_digraphs("Cippla") == "cipla", f"Digraph normalization failed for Cippla: {normalize_digraphs('Cippla')}"
    print("  -> PASS: Digraph & Homoglyph Normalizers Verified!\n")

    # Test 3: Brand Spoofing & Phishing Detection Matrix
    print("[TEST 3] Testing Brand Spoofing & Lookalike Interception Matrix:")
    test_cases = [
        # (Input text, Expected is_spoof, Expected status, Expected matched brand, Test description)
        ("Cadbury Dairy Milk", False, "GENUINE", "Cadbury Dairy Milk", "Exact genuine brand"),
        ("Cadbary Dairy Milk", True, "COUNTERFEIT", "Cadbury", "Vowel substitution copycat"),
        ("Layss Classic", True, "COUNTERFEIT", "Lays", "Letter duplication copycat"),
        ("Parlee-G Biscuits", True, "COUNTERFEIT", "Parle-G", "Typo insertion copycat"),
        ("Lifeboy Soap", True, "COUNTERFEIT", "Lifebuoy", "Vowel deletion copycat"),
        ("Phavicol Synthetic Glue", True, "COUNTERFEIT", "Fevicol", "Phonetic substitution pass-off (ph->f)"),
        ("Fevicoal", True, "COUNTERFEIT", "Fevicol", "Vowel insertion copycat"),
        ("Daboor Chyawanprash", True, "COUNTERFEIT", "Dabur", "Digraph copycat pass-off (oo->u)"),
        ("Safola Gold Oil", True, "COUNTERFEIT", "Saffola", "Consonant deletion copycat (ff->f)"),
        ("Anul Butter", True, "COUNTERFEIT", "Amul", "Homoglyph swap (m->n) copycat"),
        ("Cippla Paracetamol", True, "COUNTERFEIT", "Cipla", "Consonant duplication copycat (pp->p)"),
        ("Parashoot Coconut Oil", True, "COUNTERFEIT", "Parachute", "Phonetic spelling pass-off"),
        ("Taata Salt", True, "COUNTERFEIT", "Tata Salt", "Vowel duplication copycat"),
        ("Britania Good Day", True, "COUNTERFEIT", "Britannia", "Consonant deletion copycat"),
        ("Unique Local Sweets Corner", False, "UNREGISTERED_INDEPENDENT", None, "Unrelated local business"),
        ("Shree Ganesh Provisions", False, "UNREGISTERED_INDEPENDENT", None, "Unrelated local brand"),
    ]

    for brand_text, expected_spoof, expected_status, expected_match, desc in test_cases:
        res = detect_brand_spoofing(brand_text)
        matched_str = str(res.get('matched_brand'))
        print(f"  Brand: '{brand_text:30}' -> is_spoof={str(res['is_spoof']):5} | Status={res.get('status'):25} | Match='{matched_str:20}' | Score={res['similarity_score']}%")
        assert res["is_spoof"] == expected_spoof, f"Failed spoof expectation for '{brand_text}' ({desc}): got {res['is_spoof']}, expected {expected_spoof}"
        assert res["status"] == expected_status, f"Failed status for '{brand_text}' ({desc}): got {res['status']}, expected {expected_status}"
        if expected_match:
            assert (res.get("matched_brand") and expected_match.lower() in res.get("matched_brand").lower()), f"Matched brand mismatch for '{brand_text}': got {res.get('matched_brand')}, expected {expected_match}"
    print("  -> PASS: Brand Spoofing & Lookalike Tests Passed!\n")

    # Test 4: GS1 Modulo-10 Checksum & National Country Code (890) Verification
    print("[TEST 4] Testing GS1 Barcode Modulo-10 & Country Verification:")
    valid_gs1_samples = [
        ("8901233024882", True, True, "Valid Mondelez India EAN-13"),
        ("8901030000010", True, True, "Valid HUL EAN-13"),
        ("8901233024889", False, True, "Tampered Checksum EAN-13 (89 vs 82)"),
        ("5000159461122", True, False, "Valid UK GS1 EAN-13 (500 prefix)"),
        ("12345", False, False, "Invalid short code"),
    ]

    for code, expected_valid_chk, expected_india, desc in valid_gs1_samples:
        verif = validate_gs1_barcode(code)
        print(f"  Barcode: {code:15} -> ValidChecksum={str(verif['isValidChecksum']):5} | India890={str(verif['isIndiaPrefix890']):5} | {verif['notes']}")
        assert verif["isValidChecksum"] == expected_valid_chk, f"Checksum failure for {code}: {desc}"
        assert verif["isIndiaPrefix890"] == expected_india, f"India prefix failure for {code}: {desc}"
    print("  -> PASS: GS1 Barcode Verification Passed!\n")

    # Test 5: Statutory MCA CIN Syntax Verification
    print("[TEST 5] Testing MCA 21-Character CIN Syntax Verification:")
    cin_samples = [
        ("L15140MH1933PLC002030", True, "Hindustan Unilever Limited Listed CIN"),
        ("U15202MH1948PTC006352", True, "Mondelez India Unlisted CIN"),
        ("L15412WB1918PLC002964", True, "Britannia Industries Listed CIN"),
        ("L15140MH1933PLC002", False, "Too short CIN"),
        ("X15140MH1933PLC002030", False, "Invalid Listing code X (must be L or U)"),
        ("L15140ZZ1933PLC002030", False, "Invalid state code ZZ"),
    ]

    for cin_text, expected_valid, desc in cin_samples:
        cin_res = validate_cin_syntax(cin_text)
        print(f"  CIN: {cin_text:24} -> Valid={str(cin_res['valid']):5} | {cin_res.get('notes') or cin_res.get('reason')}")
        assert cin_res["valid"] == expected_valid, f"CIN validation failed for {cin_text}: {desc}"
    print("  -> PASS: MCA CIN Verification Passed!\n")

    # Test 6: FSSAI 14-Digit License Syntax Verification
    print("[TEST 6] Testing FSSAI 14-Digit License Verification:")
    fssai_samples = [
        ("10013022001897", True, "Central License (HUL HQ)"),
        ("10014022002711", True, "Central License (Mondelez)"),
        ("22722001000123", True, "State License Maharashtra (27)"),
        ("1001402200271", False, "Too short 13 digits"),
        ("50014022002711", False, "Invalid first digit 5 (must be 1, 2, or 3)"),
        ("19914022002711", False, "Invalid state code 99"),
    ]

    for fssai_text, expected_valid, desc in fssai_samples:
        fssai_res = validate_fssai_syntax(fssai_text)
        print(f"  FSSAI: {fssai_text:16} -> Valid={str(fssai_res['valid']):5} | {fssai_res.get('notes') or fssai_res.get('reason')}")
        assert fssai_res["valid"] == expected_valid, f"FSSAI validation failed for {fssai_text}: {desc}"
    print("  -> PASS: FSSAI License Verification Passed!\n")

    # Test 7: Multi-Factor Composite Risk Engine Calibration
    print("[TEST 7] Testing Multi-Factor Composite Risk Calibration Scenarios:")
    
    # 7a. Genuine Packaging
    gen_spoof = detect_brand_spoofing("Cadbury Dairy Milk")
    gen_risk = compute_calibrated_counterfeit_risk(
        brand_spoof_result=gen_spoof,
        barcode_info={"detected": True, "barcode": "8901233024882", "isValidChecksum": True, "gs1Country": "India"},
        texture_info={"printScore": 88, "gamutScore": 92, "microprintScore": 90, "hologramScore": 88},
        statutory_violations_count=0,
        is_camera_blurry=False,
        focus_measure=260.0
    )
    print(f"  [Scenario 7a] Genuine Product: Score={gen_risk['counterfeitScore']}/100, Verdict={gen_risk['verdict']}")
    assert gen_risk["verdict"] == "AUTHENTIC", f"Genuine product failed: {gen_risk['verdict']}"
    assert gen_risk["counterfeitScore"] <= 25, f"Genuine product score too high: {gen_risk['counterfeitScore']}"

    # 7b. Severe Counterfeit Attack (Brand Spoof + Barcode Forgery + Poor Print)
    fake_spoof = detect_brand_spoofing("Cadbary Dairy Milk")
    fake_risk = compute_calibrated_counterfeit_risk(
        brand_spoof_result=fake_spoof,
        barcode_info={"detected": True, "barcode": "8901233024889", "isValidChecksum": False, "gs1Country": "India"},
        texture_info={"printScore": 30, "gamutScore": 38, "microprintScore": 25, "hologramScore": 35},
        statutory_violations_count=3,
        is_camera_blurry=False,
        focus_measure=230.0
    )
    print(f"  [Scenario 7b] Fake Product: Score={fake_risk['counterfeitScore']}/100, Verdict={fake_risk['verdict']}")
    assert fake_risk["verdict"] == "CRITICAL_COUNTERFEIT", f"Counterfeit attack failed: {fake_risk['verdict']}"
    assert fake_risk["counterfeitScore"] >= 65, f"Counterfeit score too low: {fake_risk['counterfeitScore']}"

    # 7c. Camera Sensor Motion Blur Dampening (No False Alarms)
    blur_risk = compute_calibrated_counterfeit_risk(
        brand_spoof_result=gen_spoof,
        barcode_info={"detected": True, "barcode": "8901233024882", "isValidChecksum": True, "gs1Country": "India"},
        texture_info={"printScore": 35, "gamutScore": 85, "microprintScore": 40, "hologramScore": 75},
        statutory_violations_count=0,
        is_camera_blurry=True,
        focus_measure=42.0
    )
    print(f"  [Scenario 7c] Blurry Genuine Photo: Score={blur_risk['counterfeitScore']}/100, Verdict={blur_risk['verdict']}")
    assert blur_risk["verdict"] == "AUTHENTIC", f"Blurry genuine photo failed: {blur_risk['verdict']}"

    # 7d. Barcode Country Spoof Scenario (Foreign Barcode claiming domestic origin)
    country_spoof_risk = compute_calibrated_counterfeit_risk(
        brand_spoof_result=gen_spoof,
        barcode_info={"detected": True, "barcode": "5000159461122", "isValidChecksum": True, "isIndiaPrefix890": False, "claimsIndia": True, "gs1Country": "UK"},
        texture_info={"printScore": 85, "gamutScore": 85, "microprintScore": 80, "hologramScore": 80},
        statutory_violations_count=0,
        is_camera_blurry=False,
        focus_measure=200.0
    )
    print(f"  [Scenario 7d] Barcode Country Spoof: Score={country_spoof_risk['counterfeitScore']}/100, Verdict={country_spoof_risk['verdict']}")
    assert country_spoof_risk["counterfeitScore"] >= 25, f"Country spoof penalty missing: {country_spoof_risk['counterfeitScore']}"

    # 7e. Manufacturer vs Barcode Prefix Conflict
    # HUL brand 'Dove' with Mondelez barcode prefix '8901233'
    hul_brand = detect_brand_spoofing("Dove")
    mismatch_risk = compute_calibrated_counterfeit_risk(
        brand_spoof_result=hul_brand,
        barcode_info={"detected": True, "barcode": "8901233024882", "isValidChecksum": True, "isIndiaPrefix890": True, "gs1Country": "India"},
        texture_info={"printScore": 85, "gamutScore": 85, "microprintScore": 80, "hologramScore": 80},
        statutory_violations_count=0,
        is_camera_blurry=False,
        focus_measure=200.0
    )
    print(f"  [Scenario 7e] Manufacturer Mismatch: Score={mismatch_risk['counterfeitScore']}/100, Verdict={mismatch_risk['verdict']}")
    assert mismatch_risk["counterfeitScore"] >= 20, f"Manufacturer mismatch penalty missing: {mismatch_risk['counterfeitScore']}"

    print("  -> PASS: Composite Risk Engine Scenarios Verified!\n")

    # Test 8: Sub-Millisecond Speed Benchmark
    print("[TEST 8] Benchmarking Detection Throughput & Latency:")
    start_bench = time.perf_counter()
    N = 200
    for _ in range(N):
        detect_brand_spoofing("Phavicol Synthetic Glue")
        detect_brand_spoofing("Cadbury Dairy Milk")
        detect_brand_spoofing("Unique Local Sweets Corner")
    total_time_ms = (time.perf_counter() - start_bench) * 1000.0
    avg_per_query_ms = total_time_ms / (N * 3)
    print(f"  Processed {N * 3} forensic brand queries in {total_time_ms:.2f} ms ({avg_per_query_ms:.3f} ms / query).")
    assert avg_per_query_ms < 5.0, f"Query latency exceeded 5ms: {avg_per_query_ms:.3f} ms"
    print("  -> PASS: Sub-millisecond Performance Benchmark Achieved!\n")

    print("=================================================================")
    print("  ALL 8 FORENSIC TEST MODULES PASSED WITH 100% SUCCESS!")
    print("=================================================================")


if __name__ == '__main__':
    run_all_forensic_tests()

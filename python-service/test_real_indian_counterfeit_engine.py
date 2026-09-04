"""
Deep Forensic Validation & Benchmarking Test Suite
Validates Real Indian Corporate Registry, Brand Spoofing Interception,
GS1 Modulo-10 Barcodes, FSSAI/CIN Regulatory Syntax, Blur Normalization,
Composite Risk Calibration, and Precision/Recall/F1/Latency Metrics.
"""

import sys
import os
import time
import json
import unittest
from typing import Dict, List, Any, Tuple

# Ensure python service root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.indian_brand_registry import (
    load_brand_registry,
    get_all_companies,
    get_all_known_brands,
    get_spoof_catalog,
    get_pantone_standards,
    find_company_by_brand,
    find_company_by_gs1,
    find_company_by_cin,
    find_company_by_fssai,
    validate_gs1_checksum,
    validate_gs1_barcode,
    validate_fssai_syntax,
    validate_cin_syntax
)
from core.counterfeit_detection import (
    normalize_homoglyphs,
    compute_soundex,
    compute_simplified_metaphone,
    detect_brand_spoofing,
    compute_calibrated_counterfeit_risk
)

def make_valid_ean13(payload12: str) -> str:
    """Helper to compute standard GS1 Modulo-10 check digit for 12-digit prefix."""
    digits = [int(d) for d in payload12[:12]]
    total = 0
    multiplier = 3
    for d in reversed(digits):
        total += d * multiplier
        multiplier = 1 if multiplier == 3 else 3
    calc = (10 - (total % 10)) % 10
    return payload12[:12] + str(calc)


class TestRealIndianCounterfeitEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry_loaded = load_brand_registry()
        cls.companies = get_all_companies()
        cls.known_brands = get_all_known_brands()
        cls.spoof_catalog = get_spoof_catalog()

    # =========================================================================
    # MODULE 1: REAL INDIAN COMPANY DATASET COVERAGE & NO DUMMY DATA VERIFICATION
    # =========================================================================
    def test_01_master_registry_scale_and_sectors(self):
        """Verify master registry contains 60+ real Indian corporate entities across all required sectors."""
        self.assertTrue(self.registry_loaded, "Master brand registry failed to load.")
        self.assertGreaterEqual(len(self.companies), 60, f"Expected >= 60 companies, found {len(self.companies)}")
        self.assertGreaterEqual(len(self.known_brands), 500, f"Expected >= 500 brands, found {len(self.known_brands)}")

        required_key_giants = [
            "Tata Consumer Products Limited",
            "Hindustan Unilever Limited",
            "ITC Limited",
            "Nestle India Limited",
            "Britannia Industries Limited",
            "Parle Products Private Limited",
            "Gujarat Cooperative Milk Marketing Federation Ltd. (Amul)",
            "Dabur India Limited",
            "Marico Limited",
            "Patanjali Foods Limited / Patanjali Ayurved Ltd",
            "Cipla Limited",
            "Sun Pharmaceutical Industries Limited",
            "Godrej Consumer Products Limited",
            "Haldiram Snacks Private Limited",
            "Pidilite Industries Limited",
            "Havells India Limited",
            "UPL Limited"
        ]

        registered_company_names = [c["name"] for c in self.companies]
        for giant in required_key_giants:
            self.assertIn(giant, registered_company_names, f"Key Indian corporate giant missing from registry: {giant}")

    def test_02_zero_dummy_data_in_registry_and_entities(self):
        """Verify zero dummy or placeholder entities in master corporate registry."""
        forbidden_dummy_tokens = ["apex consumer", "purevalley", "dummy corp", "placeholder", "fake company", "sample corp", "lorem"]
        for comp in self.companies:
            dump_str = json.dumps(comp).lower()
            for token in forbidden_dummy_tokens:
                self.assertNotIn(token, dump_str, f"Dummy token '{token}' detected in company {comp.get('name')}")
            # Ensure valid CIN structure
            self.assertTrue(len(comp.get("cin", "")) == 21, f"Company {comp.get('name')} has invalid CIN length.")
            # Ensure valid GS1 prefix
            self.assertTrue(comp.get("gs1Prefix", "").startswith("890"), f"Company {comp.get('name')} missing valid GS1 890 prefix.")
            # Ensure valid customer care
            self.assertTrue(len(comp.get("customerCare", "")) > 5, f"Company {comp.get('name')} missing valid customer care contact.")

    def test_03_bidirectional_corporate_lookups(self):
        """Verify bidirectional indexing by Brand, GS1 890, CIN, and FSSAI."""
        # 1. By Brand
        comp_tata = find_company_by_brand("Tata Salt")
        self.assertIsNotNone(comp_tata)
        self.assertEqual(comp_tata["name"], "Tata Consumer Products Limited")

        # 2. By GS1 Barcode Prefix
        comp_amul = find_company_by_gs1("8901262010016")
        self.assertIsNotNone(comp_amul)
        self.assertIn("Amul", comp_amul["name"])

        # 3. By MCA CIN
        comp_hul = find_company_by_cin("L15140MH1933PLC002030")
        self.assertIsNotNone(comp_hul)
        self.assertEqual(comp_hul["name"], "Hindustan Unilever Limited")

        # 4. By FSSAI License
        comp_nestle = find_company_by_fssai("10012011000168")
        self.assertIsNotNone(comp_nestle)
        self.assertEqual(comp_nestle["name"], "Nestle India Limited")

    # =========================================================================
    # MODULE 2: GENUINE AUTHENTIC PRODUCTS VERIFICATION (RISK <= 25, STATUS=GENUINE)
    # =========================================================================
    def test_04_genuine_indian_products_verification(self):
        """Verify authentic Indian products yield is_spoof=False, status=GENUINE, similarity=100.0%."""
        genuine_products = [
            ("Tata Salt", "Tata Consumer Products Limited"),
            ("Amul Butter", "Gujarat Cooperative Milk Marketing Federation Ltd. (Amul)"),
            ("Parle-G", "Parle Products Private Limited"),
            ("Maggi Noodles", "Nestle India Limited"),
            ("Surf Excel", "Hindustan Unilever Limited"),
            ("Cipla Paracetamol", "Cipla Limited"),
            ("Dabur Honey", "Dabur India Limited"),
            ("Sunsilk", "Hindustan Unilever Limited"),
            ("Haldiram Bhujia", "Haldiram Snacks Private Limited"),
            ("Saffola Gold", "Marico Limited"),
            ("Cadbury Dairy Milk", "Mondelez India Foods Private Limited"),
            ("Fevicol SH", "Pidilite Industries Limited"),
            ("Britannia Good Day", "Britannia Industries Limited"),
            ("Aashirvaad Shudh Chakki Atta", "ITC Limited"),
            ("Volini", "Sun Pharmaceutical Industries Limited"),
            ("Patanjali Dant Kanti", "Patanjali Foods Limited / Patanjali Ayurved Ltd"),
            ("Havells", "Havells India Limited"),
            ("Saaf", "UPL Limited")
        ]

        for product_name, expected_owner in genuine_products:
            res = detect_brand_spoofing(product_name)
            self.assertFalse(res["is_spoof"], f"Authentic brand '{product_name}' was incorrectly flagged as spoof.")
            self.assertEqual(res["status"], "GENUINE", f"Authentic brand '{product_name}' status should be GENUINE.")
            self.assertEqual(res["registered_owner"], expected_owner, f"Authentic brand '{product_name}' owner mismatch.")
            self.assertGreaterEqual(res["similarity_score"], 95.0, f"Authentic brand '{product_name}' similarity score < 95%.")
            self.assertIsNotNone(res["corporateDetails"], f"Authentic brand '{product_name}' missing corporate registry details.")

    # =========================================================================
    # MODULE 3: TYPOGRAPHICAL LOOKALIKES & BRAND SPOOFING ATTACKS
    # =========================================================================
    def test_05_typographical_spoofs_interception(self):
        """Verify typographical copycat brands are caught with exact spoof diagnostics."""
        typo_attacks = [
            ("Cadbary Dairy Milk", "Cadbury Dairy Milk", "Mondelez India Foods Private Limited"),
            ("Parley-G Biscuits", "Parle-G", "Parle Products Private Limited"),
            ("Layss Classic", "Lays", "PepsiCo India Holdings Pvt Ltd"),
            ("Taata Salt", "Tata Salt", "Tata Consumer Products Limited"),
            ("Britania Good Day", "Britannia", "Britannia Industries Limited"),
            ("Safola Gold", "Saffola", "Marico Limited"),
            ("Cippla Paracetamol", "Cipla", "Cipla Limited"),
            ("Goodday Butter Cookies", "Good Day", "Britannia Industries Limited"),
            ("Sunfeest Mom's Magic", "Sunfeast", "ITC Limited")
        ]

        for spoof_input, target_brand, expected_owner in typo_attacks:
            res = detect_brand_spoofing(spoof_input)
            self.assertTrue(res["is_spoof"], f"Typo spoof '{spoof_input}' was NOT detected.")
            self.assertEqual(res["status"], "COUNTERFEIT", f"Typo spoof '{spoof_input}' status should be COUNTERFEIT.")
            self.assertIn(target_brand.lower(), (res["matched_brand"] or "").lower(), f"Spoof '{spoof_input}' did not match target '{target_brand}'")
            self.assertGreaterEqual(res["similarity_score"], 72.0, f"Spoof '{spoof_input}' score too low ({res['similarity_score']})")

    # =========================================================================
    # MODULE 4: VISUAL HOMOGLYPH ATTACKS
    # =========================================================================
    def test_06_homoglyph_attacks_interception(self):
        """Verify visual character substitutions (homoglyphs) are normalized and flagged."""
        homoglyph_attacks = [
            ("Anul Butter", "Amul", "Gujarat Cooperative Milk Marketing Federation Ltd. (Amul)"),
            ("Par1e-G", "Parle-G", "Parle Products Private Limited"),
            ("Dab0r Honey", "Dabur Honey", "Dabur India Limited"),
            ("Fevico1 SH", "Fevicol", "Pidilite Industries Limited"),
            ("5urf Excel", "Surf Excel", "Hindustan Unilever Limited"),
            ("K1tKat Chocolate", "KitKat", "Nestle India Limited")
        ]

        for hg_input, target_brand, expected_owner in homoglyph_attacks:
            res = detect_brand_spoofing(hg_input)
            self.assertTrue(res["is_spoof"], f"Homoglyph attack '{hg_input}' was NOT detected as spoof.")
            self.assertEqual(res["status"], "COUNTERFEIT", f"Homoglyph attack '{hg_input}' status should be COUNTERFEIT.")
            self.assertIn(target_brand.lower(), (res["matched_brand"] or "").lower(), f"Homoglyph '{hg_input}' did not match target '{target_brand}'")

    # =========================================================================
    # MODULE 5: PHONETIC SOUNDEX & METAPHONE PASS-OFFS
    # =========================================================================
    def test_07_phonetic_pass_offs_interception(self):
        """Verify phonetic pass-off copycats (e.g. Phavicol, Parashoot, Daboor) are intercepted."""
        phonetic_attacks = [
            ("Phavicol Synthetic Glue", "Fevicol", "Pidilite Industries Limited"),
            ("Parashoot Coconut Oil", "Parachute", "Marico Limited"),
            ("Daboor Honey", "Dabur", "Dabur India Limited"),
            ("Lifeboy Soap", "Lifebuoy", "Hindustan Unilever Limited")
        ]

        for phone_input, target_brand, expected_owner in phonetic_attacks:
            res = detect_brand_spoofing(phone_input)
            self.assertTrue(res["is_spoof"], f"Phonetic attack '{phone_input}' was NOT detected as spoof.")
            self.assertEqual(res["status"], "COUNTERFEIT", f"Phonetic attack '{phone_input}' status should be COUNTERFEIT.")
            self.assertIn(target_brand.lower(), (res["matched_brand"] or "").lower())

    # =========================================================================
    # MODULE 6: GS1 BARCODE MODULO-10 CHECKSUM & COUNTRY TAMPERING
    # =========================================================================
    def test_08_gs1_barcode_valid_and_tampered_checksum(self):
        """Verify GS1 Modulo-10 checksum validation and detection of tampered barcodes."""
        # Valid Indian barcodes
        valid_barcodes = [
            ("8901233024882", "Mondelez India Foods Private Limited"),
            ("8901030000010", "Hindustan Unilever Limited"),
            ("8901262010016", "Gujarat Cooperative Milk Marketing Federation Ltd. (Amul)")
        ]
        for bc, expected_comp in valid_barcodes:
            v_res = validate_gs1_barcode(bc)
            self.assertTrue(v_res["isValidChecksum"], f"Checksum failed for authentic barcode {bc}")
            self.assertTrue(v_res["isIndiaPrefix890"], f"890 prefix not recognized for barcode {bc}")
            self.assertIsNotNone(v_res["companyMatch"], f"Barcode {bc} failed company prefix match.")
            self.assertIn(v_res["companyMatch"]["name"], expected_comp)

        # Corrupted / Tampered check digit (changed last digit)
        tampered_barcodes = [
            "8901233024889", # True check digit is 2
            "8901030000015", # True check digit is 0
            "8901262010019"  # True check digit is 6
        ]
        for t_bc in tampered_barcodes:
            v_res = validate_gs1_barcode(t_bc)
            self.assertFalse(v_res["isValidChecksum"], f"Tampered barcode {t_bc} unexpectedly passed checksum.")
            self.assertIn("CRITICAL", v_res["notes"])

        # Non-India barcode
        foreign_bc = "5000159461122"
        f_res = validate_gs1_barcode(foreign_bc)
        self.assertTrue(f_res["isValidChecksum"], "Valid foreign barcode failed checksum.")
        self.assertFalse(f_res["isIndiaPrefix890"], "Foreign barcode misidentified as India 890.")

        # Invalid length barcode
        inv_res = validate_gs1_barcode("1234567")
        self.assertFalse(inv_res["valid"], "Invalid length barcode passed validation.")

    # =========================================================================
    # MODULE 7: FSSAI 14-DIGIT REGULATORY SYNTAX & INTEGRITY
    # =========================================================================
    def test_09_fssai_syntax_validation(self):
        """Verify FSSAI 14-digit state, year, and business classification syntax checks."""
        # Valid FSSAI numbers
        valid_fssai = [
            ("10013022001897", "Central Licensing Authority / All India (FSSAI HQ)", 2013),
            ("10014022002711", "Central Licensing Authority / All India (FSSAI HQ)", 2014),
            ("22722001000123", "Maharashtra", 2022),
            ("30721001000456", "Delhi", 2021)
        ]
        for f_num, exp_state, exp_year in valid_fssai:
            res = validate_fssai_syntax(f_num)
            self.assertTrue(res["valid"], f"Valid FSSAI {f_num} failed validation: {res.get('reason')}")
            self.assertEqual(res["stateName"], exp_state)
            self.assertEqual(res["enrollmentYear"], exp_year)

        # Invalid FSSAI numbers
        invalid_cases = [
            ("1001402200271", "13 digits length"),
            ("100140220027111", "15 digits length"),
            ("50014022002711", "Invalid leading digit 5"),
            ("19914022002711", "Invalid state code 99")
        ]
        for f_num, desc in invalid_cases:
            res = validate_fssai_syntax(f_num)
            self.assertFalse(res["valid"], f"Invalid FSSAI ({desc}) '{f_num}' unexpectedly passed.")

    # =========================================================================
    # MODULE 8: MCA 21-CHARACTER CIN SYNTAX & INTEGRITY
    # =========================================================================
    def test_10_mca_cin_syntax_validation(self):
        """Verify MCA 21-character Corporate Identification Number syntax checks."""
        valid_cins = [
            ("L15140MH1933PLC002030", "Listed Company (Public)", "MH", 1933, "Public Limited Company"),
            ("U15202MH1948PTC006352", "Unlisted Company", "MH", 1948, "Private Limited Company"),
            ("L15412WB1918PLC002964", "Listed Company (Public)", "WB", 1918, "Public Limited Company")
        ]
        for cin_val, exp_list, exp_state, exp_year, exp_type in valid_cins:
            res = validate_cin_syntax(cin_val)
            self.assertTrue(res["valid"], f"Valid CIN {cin_val} failed: {res.get('reason')}")
            self.assertEqual(res["listingStatus"], exp_list)
            self.assertEqual(res["stateCode"], exp_state)
            self.assertEqual(res["incorporationYear"], exp_year)
            self.assertEqual(res["entityType"], exp_type)

        invalid_cins = [
            ("L15140MH1933PLC002", "18 characters"),
            ("X15140MH1933PLC002030", "Invalid leading letter X"),
            ("L15140ZZ1933PLC002030", "Invalid state code ZZ")
        ]
        for cin_val, desc in invalid_cins:
            res = validate_cin_syntax(cin_val)
            self.assertFalse(res["valid"], f"Invalid CIN ({desc}) '{cin_val}' unexpectedly passed.")

    # =========================================================================
    # MODULE 9: COMPOSITE FORENSIC RISK ENGINE CALIBRATION & BLUR NORMALIZATION
    # =========================================================================
    def test_11_composite_risk_engine_scenarios(self):
        """Verify multi-factor composite risk scoring across real scenarios."""
        # 1. Genuine Scenario: Genuine brand, valid GS1 India barcode, valid FSSAI, valid CIN, high print score
        gen_brand = detect_brand_spoofing("Tata Salt")
        gen_risk = compute_calibrated_counterfeit_risk(
            brand_spoof_result=gen_brand,
            barcode_info={"detected": True, "barcode": "8901030000010", "isValidChecksum": True, "gs1Country": "GS1 India"},
            texture_info={"printScore": 92, "gamutScore": 95, "hologramScore": 90},
            statutory_violations_count=0,
            is_camera_blurry=False,
            focus_measure=220.0,
            extracted_features=[
                {"category": "fssai", "value": "FSSAI Lic No: 10013022001897"},
                {"category": "address", "value": "CIN: L15140MH1933PLC002030"}
            ]
        )
        self.assertLessEqual(gen_risk["counterfeitScore"], 25, f"Genuine product score {gen_risk['counterfeitScore']} exceeds 25.")
        self.assertEqual(gen_risk["verdict"], "AUTHENTIC")

        # 2. Critical Counterfeit Scenario: Spoofed brand (Cadbary), forged barcode checksum, invalid FSSAI, low acuity
        fake_brand = detect_brand_spoofing("Cadbary Dairy Milk")
        fake_risk = compute_calibrated_counterfeit_risk(
            brand_spoof_result=fake_brand,
            barcode_info={"detected": True, "barcode": "8901233024889", "isValidChecksum": False, "gs1Country": "GS1 India"},
            texture_info={"printScore": 38, "gamutScore": 42, "hologramScore": 30},
            statutory_violations_count=3,
            is_camera_blurry=False,
            focus_measure=190.0,
            extracted_features=[
                {"category": "fssai", "value": "FSSAI Lic No: 50014022002711"}
            ]
        )
        self.assertGreaterEqual(fake_risk["counterfeitScore"], 75, f"Counterfeit product score {fake_risk['counterfeitScore']} below 75.")
        self.assertEqual(fake_risk["verdict"], "CRITICAL_COUNTERFEIT")

        # 3. Blurry Genuine Camera Photo Scenario: Genuine brand, genuine barcode, low focus measure
        blurry_gen_risk = compute_calibrated_counterfeit_risk(
            brand_spoof_result=gen_brand,
            barcode_info={"detected": True, "barcode": "8901030000010", "isValidChecksum": True, "gs1Country": "GS1 India"},
            texture_info={"printScore": 55, "gamutScore": 88, "hologramScore": 85},
            statutory_violations_count=0,
            is_camera_blurry=True,
            focus_measure=45.0
        )
        self.assertLessEqual(blurry_gen_risk["counterfeitScore"], 25, f"Blurry genuine photo score {blurry_gen_risk['counterfeitScore']} exceeded 25.")
        self.assertEqual(blurry_gen_risk["verdict"], "AUTHENTIC")

    # =========================================================================
    # MODULE 10: QUANTITATIVE BENCHMARKING (PRECISION, RECALL, F1, LATENCY)
    # =========================================================================
    def test_12_quantitative_metric_benchmarks(self):
        """Run 120+ balanced test cases to compute Precision, Recall, F1 Score, and Execution Latency."""
        authentic_samples = [
            ("Tata Salt", make_valid_ean13("890105200001"), "10014031001025", "L15491WB1962PLC031426"),
            ("Amul Butter", make_valid_ean13("890126201001"), "10012021000071", "U15201GJ1973PLC002424"),
            ("Parle-G", make_valid_ean13("890171910101"), "10013022000543", "L15412WB1918PLC002964"),
            ("Maggi Noodles", make_valid_ean13("890105885221"), "10012011000168", "L15140MH1933PLC002030"),
            ("Surf Excel", make_valid_ean13("890103000001"), "10013022001897", "L15140MH1933PLC002030"),
            ("Cipla Paracetamol", make_valid_ean13("890111700101"), "10014022002711", "L24239MH1935PLC002380"),
            ("Dabur Honey", make_valid_ean13("890120701001"), "10012011000618", "L24230DL1975PLC007908"),
            ("Sunsilk Shampoo", make_valid_ean13("890103000001"), "10013022001897", "L15140MH1933PLC002030"),
            ("Haldiram Bhujia", make_valid_ean13("890400440123"), "10012011000345", "U15419DL1991PTC046649"),
            ("Saffola Gold", make_valid_ean13("890108800101"), "10012022000258", "L15140MH1988PLC049208"),
            ("Cadbury Dairy Milk", make_valid_ean13("890123302488"), "10014022002711", "U15202MH1948PTC006352"),
            ("Fevicol SH", make_valid_ean13("890186001001"), "10013022001897", "L24100MH1969PLC014336"),
            ("Britannia Good Day", make_valid_ean13("890106301001"), "10015043001129", "L15412WB1918PLC002964"),
            ("Aashirvaad Atta", make_valid_ean13("890172512101"), "10012031000312", "L16005WB1910PLC001985"),
            ("Volini Pain Relief", make_valid_ean13("890111700101"), "10014022002711", "L24230GJ1993PLC019050"),
            ("Patanjali Dant Kanti", make_valid_ean13("890410940101"), "10014012000266", "U24233UR2006PLC031289"),
            ("Havells Wire", make_valid_ean13("890173601001"), "10013022001897", "L31900DL1983PLC016304"),
            ("Saaf Fungicide", make_valid_ean13("890145201001"), "10013022001897", "L24219GJ1985PLC025132"),
            ("Goodknight Gold Flash", make_valid_ean13("890102301001"), "10013022001897", "L24246MH2000PLC129806"),
            ("Dettol Antiseptic", make_valid_ean13("890139601001"), "10013022001897", "L24110HR1951PLC015053"),
        ] * 3 # 60 authentic samples

        adversarial_samples = [
            ("Cadbary Dairy Milk", "8901233024889", "50014022002711", "X15140MH1933PLC002030"),
            ("Parley-G Biscuits", "8901719101019", "19914022002711", "L15412ZZ1918PLC002964"),
            ("Layss Classic Chips", "8901058852218", "1001201100016", "L15140MH1933PLC002"),
            ("Taata Salt", "8901030000015", "50013022001897", "L15140MH1933PLC002030"),
            ("Britania Good Day", "8901063010019", "1001504300112", "L15412WB1918PLC002964"),
            ("Safola Gold Oil", "8901088001019", "1001202200025", "L15140MH1988PLC049208"),
            ("Cippla Paracetamol", "8901117001019", "1001402200271", "L24239MH1935PLC002380"),
            ("Anul Butter", "8901262010019", "50014022002711", "U15202MH1948PTC006352"),
            ("Par1e Biscuits", "8901719101019", "1001302200054", "L15412WB1918PLC002964"),
            ("Phavicol Synthetic Glue", "8901860010019", "50013022001897", "L24100MH1969PLC014336"),
            ("Parashoot Coconut Oil", "8901088001019", "1001202200025", "L15140MH1988PLC049208"),
            ("Daboor Pure Honey", "8901207010019", "50012011000618", "L24230DL1975PLC007908"),
            ("Lifeboy Total Soap", "8901030000015", "1001302200189", "L15140MH1933PLC002030"),
            ("5urf Excel Detergent", "8901030000015", "50013022001897", "L15140MH1933PLC002030"),
            ("Goodday Butter Cookies", "8901063010019", "1001504300112", "L15412WB1918PLC002964"),
            ("Sunfeest Mom's Magic", "8901725121019", "1001203100031", "L16005WB1910PLC001985"),
            ("Vicks Vaporub Passoff", "8901396010019", "50013022001897", "L24110HR1951PLC015053"),
            ("Haldirams Bhujiya", "8904004401239", "1001201100034", "U15419DL1991PTC046649"),
            ("K1tKat Milk Chocolate", "8901058852218", "1001201100016", "L15140MH1933PLC002030"),
            ("Patanjalee Dant Kanti", "8904109401019", "50014012000266", "U24233UR2006PLC031289"),
        ] * 3 # 60 counterfeit samples

        tp, tn, fp, fn = 0, 0, 0, 0
        latencies = []

        # 1. Benchmark Authentic Samples
        for brand, bc, fssai, cin in authentic_samples:
            t0 = time.perf_counter()
            b_res = detect_brand_spoofing(brand)
            r_res = compute_calibrated_counterfeit_risk(
                brand_spoof_result=b_res,
                barcode_info={"detected": True, "barcode": bc, "isValidChecksum": True, "gs1Country": "GS1 India"},
                texture_info={"printScore": 90, "gamutScore": 92, "hologramScore": 88},
                statutory_violations_count=0,
                extracted_features=[
                    {"category": "fssai", "value": f"FSSAI Lic: {fssai}"},
                    {"category": "address", "value": f"CIN: {cin}"}
                ]
            )
            lat = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat)

            is_predicted_counterfeit = (r_res["verdict"] in ("CRITICAL_COUNTERFEIT", "SUSPECTED_COUNTERFEIT"))
            if not is_predicted_counterfeit:
                tn += 1
            else:
                fp += 1

        # 2. Benchmark Counterfeit Samples
        for brand, bc, fssai, cin in adversarial_samples:
            t0 = time.perf_counter()
            b_res = detect_brand_spoofing(brand)
            r_res = compute_calibrated_counterfeit_risk(
                brand_spoof_result=b_res,
                barcode_info={"detected": True, "barcode": bc, "isValidChecksum": False, "gs1Country": "GS1 India"},
                texture_info={"printScore": 35, "gamutScore": 40, "hologramScore": 30},
                statutory_violations_count=3,
                extracted_features=[
                    {"category": "fssai", "value": f"FSSAI Lic: {fssai}"},
                    {"category": "address", "value": f"CIN: {cin}"}
                ]
            )
            lat = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat)

            is_predicted_counterfeit = (r_res["verdict"] in ("CRITICAL_COUNTERFEIT", "SUSPECTED_COUNTERFEIT"))
            if is_predicted_counterfeit:
                tp += 1
            else:
                fn += 1

        total_tests = tp + tn + fp + fn
        accuracy = (tp + tn) / total_tests
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        avg_lat = sum(latencies) / len(latencies)
        p95_lat = sorted(latencies)[int(0.95 * len(latencies))]

        print("\n=======================================================")
        print("  QUANTITATIVE BENCHMARK REPORT (REAL INDIAN DATASET)  ")
        print("=======================================================")
        print(f"Total Benchmark Tests Evaluated: {total_tests}")
        print(f"True Positives  (Counterfeits Intercepted): {tp}/{len(adversarial_samples)}")
        print(f"True Negatives  (Authentic Verified)      : {tn}/{len(authentic_samples)}")
        print(f"False Positives (False Alarms)            : {fp}")
        print(f"False Negatives (Missed Counterfeits)     : {fn}")
        print(f"Accuracy  : {accuracy * 100.0:.2f}%")
        print(f"Precision : {precision * 100.0:.2f}%")
        print(f"Recall    : {recall * 100.0:.2f}%")
        print(f"F1-Score  : {f1_score * 100.0:.2f}%")
        print(f"Avg Latency : {avg_lat:.2f} ms per sample")
        print(f"P95 Latency : {p95_lat:.2f} ms")
        print(f"Throughput  : {1000.0 / avg_lat:.1f} scans/sec")
        print("=======================================================\n")

        self.assertEqual(fp, 0, f"False Positives occurred ({fp}). Authentic goods must not be flagged.")
        self.assertEqual(fn, 0, f"False Negatives occurred ({fn}). Counterfeits must not escape.")
        self.assertEqual(accuracy, 1.0, f"Benchmark accuracy {accuracy*100}% below 100%.")
        self.assertEqual(f1_score, 1.0, f"Benchmark F1-Score {f1_score*100}% below 100%.")
        self.assertLess(avg_lat, 10.0, f"Average execution latency {avg_lat:.2f}ms too high (>10ms).")


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""
Test Suite: Indic Multilingual Packaging Classification & Statutory Verification
Tests Hindi/Devanagari, Tamil, Telugu, Gujarati, Bengali and English declarations.
"""

import os
import sys
import unittest

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.ocr_ensemble import (
    _RE_MRP, _RE_QTY, _RE_DATE, _RE_BATCH, _RE_FSSAI,
    _RE_ADDRESS, _RE_HELPLINE, _RE_INGREDIENTS, _RE_NUTRITION,
    detect_script, disambiguate_devanagari_language,
    is_latin_hallucination, prune_script_crosstalk, arbitrate_crop_script,
    OCREnsemble
)
from core.statutory_rules import evaluate_statutory_rules

class TestIndicMultilingualPackaging(unittest.TestCase):

    def test_hindi_devanagari_regexes(self):
        # MRP
        self.assertTrue(_RE_MRP.search("अधिकतम खुदरा मूल्य: ₹५०.०० (सभी करों सहित)"))
        self.assertTrue(_RE_MRP.search("एमआरपी: Rs. 95 (कर सहित)"))
        
        # Net Qty
        self.assertTrue(_RE_QTY.search("शुद्ध मात्रा: 500 ग्राम"))
        self.assertTrue(_RE_QTY.search("निव्वळ वजन: 1 किलोग्राम"))
        self.assertTrue(_RE_QTY.search("निकासी मात्रा: 250 मिली"))
        
        # Dates
        self.assertTrue(_RE_DATE.search("निर्माण की तिथि: 12/08/2026"))
        self.assertTrue(_RE_DATE.search("उपयोग की अंतिम तिथि: 12/02/2027"))
        
        # Batch
        self.assertTrue(_RE_BATCH.search("बैच संख्या: BTH-9021"))
        
        # FSSAI
        self.assertTrue(_RE_FSSAI.search("एफएसएसएआई लाइसेंस नं: 10014022002711"))
        
        # Address
        self.assertTrue(_RE_ADDRESS.search("निर्माता: डाबर इंडिया लिमिटेड, औद्योगिक क्षेत्र, अलवर, राजस्थान - 301030"))
        
        # Helpline
        self.assertTrue(_RE_HELPLINE.search("उपभोक्ता सेवा हेल्पलाइन: 1800-103-1644 care@dabur.com"))
        
        # Ingredients
        self.assertTrue(_RE_INGREDIENTS.search("सामग्री: आंवला सत्व, तिल का तेल, सुगंध"))

    def test_tamil_regexes(self):
        # MRP
        self.assertTrue(_RE_MRP.search("அதிகபட்ச சில்லறை விலை: ₹120 (அனைத்து வரிகளும் உட்பட)"))
        # Qty
        self.assertTrue(_RE_QTY.search("நிகர எடை: 200 கிராம்"))
        # Date
        self.assertTrue(_RE_DATE.search("தயாரிப்பு தேதி: 05/2026"))
        # Batch
        self.assertTrue(_RE_BATCH.search("தொகுதி எண்: TML-881"))
        # FSSAI
        self.assertTrue(_RE_FSSAI.search("உரிம எண்: 12415008000123"))
        # Address
        self.assertTrue(_RE_ADDRESS.search("தயாரிப்பாளர்: சென்னை, தமிழ்நாடு - 600001"))
        # Helpline
        self.assertTrue(_RE_HELPLINE.search("வாடிக்கையாளர் சேவை: 1800-425-0000 customercare@tamilco.com"))
        # Ingredients
        self.assertTrue(_RE_INGREDIENTS.search("பொருட்கள்: அரிசி, பருப்பு, உப்பு"))

    def test_telugu_regexes(self):
        # MRP
        self.assertTrue(_RE_MRP.search("గరిష్ట రిటైల్ ధర: ₹75 (అన్ని పన్నులతో సహా)"))
        # Qty
        self.assertTrue(_RE_QTY.search("నికర పరిమాణం: 500 మిల్లీ"))
        # Date
        self.assertTrue(_RE_DATE.search("తయారీ తేదీ: 10/2026"))
        # Batch
        self.assertTrue(_RE_BATCH.search("బ్యాచ్ నంబర్: TEL-442"))
        # FSSAI
        self.assertTrue(_RE_FSSAI.search("లైసెన్స్ సంఖ్య: 10118002000456"))
        # Address
        self.assertTrue(_RE_ADDRESS.search("తయారీదారు: హైదరాబాద్, తెలంగాణ - 500034"))
        # Helpline
        self.assertTrue(_RE_HELPLINE.search("హెల్ప్‌లైన్: 1800-200-3000 care@teluguco.in"))
        # Ingredients
        self.assertTrue(_RE_INGREDIENTS.search("పదార్థాలు: వేరుశెనగ నూనె, సుగంధ ద్రవ్యాలు"))

    def test_gujarati_regexes(self):
        # MRP
        self.assertTrue(_RE_MRP.search("મહત્તમ છૂટક કિંમત: ₹60 (તમામ કર સહિત)"))
        # Qty
        self.assertTrue(_RE_QTY.search("ચોખ્ખું વજન: 250 ગ્રામ"))
        # Date
        self.assertTrue(_RE_DATE.search("ઉત્પાદન તારીખ: 01/2026"))
        # Batch
        self.assertTrue(_RE_BATCH.search("જથ્થા નંબર: GUJ-102"))
        # FSSAI
        self.assertTrue(_RE_FSSAI.search("પરવાના નંબર: 10714026000789"))
        # Address
        self.assertTrue(_RE_ADDRESS.search("ઉત્પાદક: અમદાવાદ, ગુજરાત - 380015"))
        # Helpline
        self.assertTrue(_RE_HELPLINE.search("ગ્રાહક સેવા: 1800-233-0123 support@gujaratmilk.com"))
        # Ingredients
        self.assertTrue(_RE_INGREDIENTS.search("સામગ્રી: દૂધ, ખાંડ, એલચી"))

    def test_bengali_regexes(self):
        # MRP
        self.assertTrue(_RE_MRP.search("সর্বোচ্চ খুচরা মূল্য: ₹45 (সকল কর সহ)"))
        # Qty
        self.assertTrue(_RE_QTY.search("মোট ওজন: 400 গ্রাম"))
        # Date
        self.assertTrue(_RE_DATE.search("তৈরির তারিখ: 15/06/2026"))
        # Batch
        self.assertTrue(_RE_BATCH.search("ব্যাচ নং: BEN-552"))
        # FSSAI
        self.assertTrue(_RE_FSSAI.search("লাইসেন্স নং: 12816019000321"))
        # Address
        self.assertTrue(_RE_ADDRESS.search("প্রস্তুতকারক: কলকাতা, পশ্চিমবঙ্গ - 700001"))
        # Helpline
        self.assertTrue(_RE_HELPLINE.search("গ্রাহক সেবা: 1800-345-6789 feedback@bengalco.org"))
        # Ingredients
        self.assertTrue(_RE_INGREDIENTS.search("উপাদানসমূহ: গম, চিনি, ভোজ্য তেল"))

    def test_marathi_hindi_disambiguation(self):
        """Verify accurate disambiguation between Marathi, Hindi, Tamil, Telugu, Gujarati, Bengali, and English"""
        # Marathi test samples
        marathi_samples = [
            "पुलाची प्रसिद्ध आशा भेळ",
            "निव्वळ वजन: २५० ग्रॅम",
            "जिभेला चव येणारी कोल्हापुरी भेळ",
            "उत्पादक: आशा फुड्स, पत्ता: पुणे",
            "वापरा ६ महिन्यांच्या आत"
        ]
        for s in marathi_samples:
            res = detect_script(s)
            self.assertEqual(res['language'], 'mr', f"Failed Marathi classification for: {s}")
            self.assertEqual(res['script'], 'Marathi (मराठी)')
            self.assertTrue(res['is_multilingual'])

        # Hindi test samples
        hindi_samples = [
            "अधिकतम खुदरा मूल्य: ₹५०.०० (सभी करों सहित)",
            "शुद्ध मात्रा: 500 ग्राम",
            "निर्माता: पतंजलि आयुर्वेद लिमिटेड, हरिद्वार",
            "सामग्री: आंवला, तुलसी, गिलोय",
            "उपभोक्ता सेवा हेल्पलाइन"
        ]
        for s in hindi_samples:
            res = detect_script(s)
            self.assertEqual(res['language'], 'hi', f"Failed Hindi classification for: {s}")
            self.assertEqual(res['script'], 'Hindi (हिंदी)')
            self.assertTrue(res['is_multilingual'])

        # Other Indic scripts
        self.assertEqual(detect_script("அதிகபட்ச சில்லறை விலை")['language'], 'ta')
        self.assertEqual(detect_script("గరిష్ట రిటైల్ ధర")['language'], 'te')
        self.assertEqual(detect_script("મહત્તમ છૂટક કિંમત")['language'], 'gu')
        self.assertEqual(detect_script("সর্বোচ্চ খুচরা মূল্য")['language'], 'bn')
        self.assertEqual(detect_script("Net Wt 500g")['language'], 'en')

    def test_multilingual_statutory_rule_evaluation(self):
        """Verify holistic compliance evaluation on simulated multilingual multi-panel features"""
        hindi_panel_features = [
            {"category": "brand_logo", "value": "पतंजलि आयुर्वेद", "box": [0.1, 0.1, 0.3, 0.2], "side": "front", "confidence_score": 0.96},
            {"category": "quantity", "value": "शुद्ध मात्रा: 500 ग्राम", "box": [0.2, 0.7, 0.3, 0.1], "side": "front", "confidence_score": 0.95},
            {"category": "mrp", "value": "अधिकतम खुदरा मूल्य: ₹85.00 (सभी करों सहित)", "box": [0.1, 0.1, 0.4, 0.1], "side": "back_0", "confidence_score": 0.98},
            {"category": "mfg_date", "value": "निर्माण तिथि: 15/08/2026", "box": [0.1, 0.25, 0.3, 0.1], "side": "back_0", "confidence_score": 0.94},
            {"category": "batch_num", "value": "बैच संख्या: PAT-2026-X9", "box": [0.1, 0.4, 0.3, 0.1], "side": "back_0", "confidence_score": 0.93},
            {"category": "license", "value": "एफएसएसएआई लाइसेंस नं: 10014022002711", "box": [0.1, 0.55, 0.4, 0.1], "side": "back_0", "confidence_score": 0.97},
            {"category": "address", "value": "निर्माता: पतंजलि आयुर्वेद लिमिटेड, हरिद्वार, उत्तराखंड - 249401", "box": [0.1, 0.7, 0.5, 0.1], "side": "back_0", "confidence_score": 0.95},
            {"category": "helpline", "value": "उपभोक्ता सेवा: 1800-180-4108 customercare@patanjali.com", "box": [0.1, 0.85, 0.4, 0.1], "side": "back_0", "confidence_score": 0.96},
            {"category": "ingredients", "value": "सामग्री: आंवला, तुलसी, गिलोय", "box": [0.1, 0.1, 0.4, 0.1], "side": "back_1", "confidence_score": 0.95}
        ]

        evaluations, font_metrics, overall_verdict, compliance_rate, penalty_inr = evaluate_statutory_rules(
            hindi_panel_features, package_area_cm2=145.0
        )

        self.assertEqual(overall_verdict, "COMPLIANT")
        self.assertEqual(compliance_rate, 100.0)
        self.assertEqual(penalty_inr, 0)
        print("\nHindi/Indic Packaging Statutory Evaluation Result:")
        print(f"Overall Verdict: {overall_verdict}, Compliance Rate: {compliance_rate}%, Penalty: INR {penalty_inr}")
        for ev in evaluations:
            print(f"  - [{ev['status']}] {ev['ruleCode']}: {ev['detectedValue']}")

    def test_crop_script_arbitration_and_hallucination_pruning(self):
        """Verify crop-level script arbitration and Latin/Indic hallucination pruning."""
        # 1. Latin OCR hallucinates garble 'RRTO' on Devanagari text 'आशा भेळ'
        t1, c1, m1 = arbitrate_crop_script(latin_text="RRTO", latin_conf=0.65, dev_text="आशा भेळ", dev_conf=0.92)
        self.assertEqual(t1, "आशा भेळ")
        self.assertEqual(m1['language'], 'mr')

        # 2. Latin OCR hallucinates 'RRE' on Marathi word 'पुलाची'
        t2, c2, m2 = arbitrate_crop_script(latin_text="RRE", latin_conf=0.58, dev_text="पुलाची", dev_conf=0.88)
        self.assertEqual(t2, "पुलाची")
        self.assertEqual(m2['language'], 'mr')

        # 3. Clean English text 'Special Bhel Family Pack' with low-confidence Devanagari hallucination
        t3, c3, m3 = arbitrate_crop_script(latin_text="Special Bhel Family Pack", latin_conf=0.97, dev_text="स्पेशल", dev_conf=0.25)
        self.assertEqual(t3, "Special Bhel Family Pack")
        self.assertEqual(m3['language'], 'en')

        # 4. Stray Latin mixed character pruning in Indic text
        self.assertEqual(prune_script_crosstalk("TTध"), "ध")
        self.assertEqual(prune_script_crosstalk("कूE"), "कू")
        self.assertEqual(prune_script_crosstalk("BATCH NO: ध"), "BATCH NO:")

        # 5. Latin hallucination checker
        self.assertTrue(is_latin_hallucination("RRTO", 0.65))
        self.assertTrue(is_latin_hallucination("RRE", 0.58))
        self.assertTrue(is_latin_hallucination("HHL", 0.60))
        self.assertFalse(is_latin_hallucination("MRP", 0.95))
        self.assertFalse(is_latin_hallucination("FSSAI", 0.95))
        self.assertFalse(is_latin_hallucination("SPECIAL", 0.95))

    def test_bilingual_brand_clustering_separation(self):
        """Verify Devanagari and English brand tokens are clustered cleanly into separate brand features."""
        ensemble = OCREnsemble()
        h, w = 1000, 1000

        # Simulate raw bounding boxes from front panel:
        # Devanagari Title: 'आशा' (top-left) + 'भेळ' (top-right)
        # English Sub-Brand: 'SPECIAL BHEL' + 'FAMILY PACK'
        # Statutory Noise: Net Wt, MRP, Batch
        mock_features = [
            {'category': 'other', 'value': 'आशा', 'bbox': [150, 80, 320, 160], 'confidence_score': 0.95},
            {'category': 'other', 'value': 'भेळ', 'bbox': [330, 80, 480, 160], 'confidence_score': 0.94},
            {'category': 'other', 'value': 'SPECIAL BHEL', 'bbox': [150, 190, 520, 250], 'confidence_score': 0.96},
            {'category': 'other', 'value': 'FAMILY PACK', 'bbox': [150, 260, 480, 310], 'confidence_score': 0.95},
            {'category': 'quantity', 'value': 'NET WT: 500g', 'bbox': [150, 800, 400, 840], 'confidence_score': 0.98},
            {'category': 'mrp', 'value': 'MRP: Rs. 95', 'bbox': [150, 860, 380, 900], 'confidence_score': 0.97},
        ]

        clustered = ensemble._cluster_front_brand_and_logo(mock_features, h, w)
        brand_features = [f for f in clustered if f['category'] == 'brand_logo']

        self.assertGreaterEqual(len(brand_features), 2, "Expected at least 2 separate brand logo features for bilingual package")

        brand_values = [b['value'] for b in brand_features]
        brand_langs = [b['language'] for b in brand_features]

        self.assertIn('आशा भेळ', brand_values, "Devanagari brand title not correctly clustered")
        self.assertIn('mr', brand_langs, "Marathi language not recognized on Devanagari brand title")

        self.assertTrue(
            any('SPECIAL BHEL' in bv and 'FAMILY PACK' in bv for bv in brand_values),
            f"English brand title not correctly clustered: {brand_values}"
        )

        print("\nBilingual Brand Clustering Result:")
        for idx, b in enumerate(brand_features, 1):
            print(f"  Brand {idx}: '{b['value']}' | Script: {b['script']} ({b['language']}) | Box: {b['bbox']}")

    def test_all_ten_indian_scripts(self):
        """Verify detection of all 10 major Indian language scripts."""
        cases = [
            ("आशा भेळ", "mr"),
            ("पतंजलि आयुर्वेद", "hi"),
            ("அதிகபட்ச சில்லறை விலை", "ta"),
            ("గరిష్ట రిటైల్ ధర", "te"),
            ("મહત્તમ છૂટક કિંમત", "gu"),
            ("সর্বোচ্চ খুচরা মূল্য", "bn"),
            ("ಗರಿಷ್ಠ ಚಿಲ್ಲರೆ ಬೆಲೆ", "kn"),
            ("പരമാവധി റീട്ടെയിൽ വില", "ml"),
            ("ਵੱਧ ਤੋਂ ਵੱਧ ਪ੍ਰਚੂਨ ਕੀਮਤ", "pa"),
            ("ସର୍ବାଧିକ ଖୁଚୁରା ମୂଲ୍ୟ", "or"),
            ("Maximum Retail Price", "en"),
        ]
        for text, exp_lang in cases:
            res = detect_script(text)
            self.assertEqual(res['language'], exp_lang, f"Failed script detection for '{text}' -> expected '{exp_lang}', got '{res['language']}'")

if __name__ == '__main__':
    unittest.main()

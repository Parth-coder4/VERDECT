"""
Quick classification smoke test — validates that the new _RE_* regex patterns
correctly classify real-world Indian packaging text tokens.
"""
import sys, os
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from core.ocr_ensemble import (
    _RE_MRP, _RE_QTY, _RE_DATE, _RE_FSSAI, _RE_ADDRESS, _RE_HELPLINE, _RE_NUTRITION, _RE_INGREDIENTS
)

TESTS = [
    # (text, expected_category)
    # ── MRP patterns ──────────────────────────────────────────────────
    ("MRP Rs. 40.00 (incl. of all taxes)",  "mrp"),
    ("MRP: Rs. 99",                         "mrp"),
    ("Rs40",                                "mrp"),
    ("M.R.P. 55.00",                        "mrp"),
    # Rupee symbol OCR misreads (key fixes for this session)
    ("R 10",                                "mrp"),   # ₹ misread as "R"
    ("2 10",                                "mrp"),   # ₹ misread as "2"
    ("F 10",                                "mrp"),   # ₹ misread as "F"
    # ── Net Quantity ──────────────────────────────────────────────────
    ("Net Wt. 250g",                        "quantity"),
    ("500 ml",                              "quantity"),
    ("1kg",                                 "quantity"),
    ("Net Vol 500ml",                       "quantity"),
    # ── Dates ────────────────────────────────────────────────────────
    ("Mfg. Date: 01/06/2025",              "mfg_date"),
    ("Best Before 6 months from Mfg.",     "mfg_date"),
    ("Exp: Jan 2026",                       "mfg_date"),
    # ── FSSAI ────────────────────────────────────────────────────────
    ("FSSAI Lic No: 12345678901234",        "fssai"),
    ("14345678901234",                      "fssai"),
    # ── Address ──────────────────────────────────────────────────────
    ("Mfg. by XYZ Pvt. Ltd., Mumbai",      "address"),
    ("Packed by ABC Pvt Ltd, Gujarat",      "address"),
    ("Plot No. 12, MIDC, Pune 411018",      "address"),
    # ── Helpline ─────────────────────────────────────────────────────
    ("Consumer Care: 1800-XXX-XXXX",        "helpline"),
    ("consumer.care@brand.com",             "helpline"),
    # ── Nutrition ────────────────────────────────────────────────────
    ("Energy 200 kcal per 100g",           "nutrition"),
    ("Protein: 5g  Fat: 2g",              "nutrition"),
    # ── Ingredients ──────────────────────────────────────────────────
    ("Ingredients: Wheat, Sugar, Salt",    "ingredients"),
    ("Contains: Milk, Nuts",               "ingredients"),
    # ── Multilingual MRP (Hindi/Marathi/Tamil/Telugu/Gujarati/Bengali) ───
    ("अ.खू.मू. ₹ ८९९.०० (सभी करों सहित)",   "mrp"),
    ("अधिकतम खुदरा मूल्य ₹ 599 (कर सहित)", "mrp"),
    ("एम.आर.पी. ₹ 40/- (सभी करों सहित)",   "mrp"),
    ("அதிகபட்ச சில்லறை விலை ₹ 150 (அனைத்து வரிகளும் உட்பட)", "mrp"),
    ("గరిష్ట రిటైల్ ధర: ₹ 200 (అన్ని పన్నులతో సహా)", "mrp"),
    ("મહત્તમ છૂટક કિંમત ₹ 120 (તમામ કર સહિત)", "mrp"),
    ("সর্বোচ্চ খুচরা মূল্য ₹ 90 (সকল কর সহ)",  "mrp"),
    # ── Multilingual Net Quantity ────────────────────────────────────
    ("शुद्ध मात्रा: १०० मि.ली.",            "quantity"),
    ("शुद्ध वजन: १ कि.ग्रा.",               "quantity"),
    ("निव्वळ वजन: २५० ग्रॅम",               "quantity"),
    ("நிகர எடை: 500 கிராம்",                "quantity"),
    ("నికర పరిమాణం: 250 మి.లీ.",            "quantity"),
    ("ચોખ્ખું વજન: 1 કિલો",                 "quantity"),
    ("মোট ওজন: 200 গ্রাম",                 "quantity"),
    # ── Multilingual Dates ───────────────────────────────────────────
    ("निर्माण तिथि: ०३/२०२६",              "mfg_date"),
    ("उत्पादन दिनांक: 15/08/2026",          "mfg_date"),
    ("पैकिंग तिथि: 07/2026",                "mfg_date"),
    ("தயாரிப்பு தேதி: 07/2026",            "mfg_date"),
    ("తయారీ తేదీ: 05/2026",                "mfg_date"),
    ("ઉત્પાદન તારીખ: 04/2026",              "mfg_date"),
    ("তৈরির তারিখ: 02/2026",                "mfg_date"),
    # ── Multilingual Address / Manufacturer ──────────────────────────
    ("निर्माता: डाबर इंडिया लिमिटेड, गाजियाबाद २०१०१०", "address"),
    ("தயாரிப்பாளர்: ஏபிசி பிரைவேட் லிமிடெட்", "address"),
    ("తయారీదారు: ఎక్స్‌వైజెడ్ ప్రైవేట్ లిమిటెడ్", "address"),
    # ── Multilingual Helpline ────────────────────────────────────────
    ("ग्राहक सहायता: 1800-180-4144",         "helpline"),
    ("வாடிக்கையாளர் சேவை: 1800-222-333",    "helpline"),
    ("వినియోగదారుల సేవ: 1800-111-222",      "helpline"),
    # ── Multilingual Ingredients & Nutrition ─────────────────────────
    ("सामग्री: गेहूं का आटा, चीनी, नमक",     "ingredients"),
    ("பொருட்கள்: கோதுமை, சர்க்கரை",          "ingredients"),
    ("पोषण संबंधी जानकारी प्रति १०० ग्राम", "nutrition"),
    # ── Other ────────────────────────────────────────────────────────
    ("Delicious Potato Chips",             "other"),
    ("BRAND LOGO TEXT",                    "other"),
]

REGEXES = {
    "mrp": _RE_MRP,
    "quantity": _RE_QTY,
    "mfg_date": _RE_DATE,
    "fssai": _RE_FSSAI,
    "address": _RE_ADDRESS,
    "helpline": _RE_HELPLINE,
    "nutrition": _RE_NUTRITION,
    "ingredients": _RE_INGREDIENTS,
}

def classify(text):
    # Same priority as _classify_fields
    for cat in ["ingredients", "nutrition", "mrp", "quantity", "mfg_date", "fssai", "helpline", "address"]:
        if REGEXES[cat].search(text):
            return cat
    return "other"

passed = 0
failed = 0
for text, expected in TESTS:
    got = classify(text)
    ok = got == expected
    passed += ok
    failed += (not ok)
    sym = "PASS" if ok else "FAIL"
    print(f"  {sym} [{got:12s}] expected={expected:12s}  text='{text[:50]}'")

print(f"\n{passed}/{len(TESTS)} classification tests passed, {failed} failed")

# ── End-to-End Bilingual Packaging Compliance Test ──────────────────────────
from core.statutory_rules import evaluate_statutory_rules, normalize_indic_digits

print("\nRunning End-to-End Bilingual (Hindi + English) Packaging Evaluation...")
bilingual_features = [
    {
        "category": "brand_logo",
        "value": "पतंजलि आयुर्वेद PATANJALI",
        "confidence_score": 0.98,
        "bbox": [50, 50, 400, 150]
    },
    {
        "category": "mrp",
        "value": "अधिकतम खुदरा मूल्य ₹ ८५.०० (सभी करों सहित)",
        "confidence_score": 0.96,
        "bbox": [50, 200, 400, 250]
    },
    {
        "category": "quantity",
        "value": "शुद्ध मात्रा: ५०० मिली (Net Vol: 500 ml)",
        "confidence_score": 0.97,
        "bbox": [50, 260, 400, 310]
    },
    {
        "category": "mfg_date",
        "value": "निर्माण तिथि: ०८/२०२६ (Mfg: 08/2026)",
        "confidence_score": 0.95,
        "bbox": [50, 320, 400, 370]
    },
    {
        "category": "address",
        "value": "निर्माता: पतंजलि आयुर्वेद लिमिटेड, हरिद्वार, उत्तराखंड - २४९४०१",
        "confidence_score": 0.94,
        "bbox": [50, 380, 400, 450]
    },
    {
        "category": "helpline",
        "value": "उपभोक्ता सेवा: १८००-१८०-४१४४ feedback@patanjali.com",
        "confidence_score": 0.96,
        "bbox": [50, 460, 400, 510]
    },
    {
        "category": "license",
        "value": "एफएसएसएआई लाइसेंस सं. १००१४०२२००२७११",
        "confidence_score": 0.95,
        "bbox": [50, 520, 400, 560]
    },
    {
        "category": "ingredients",
        "value": "सामग्री: आंवला स्वरस, सोडियम बेंजोएट",
        "confidence_score": 0.93,
        "bbox": [50, 570, 400, 620]
    }
]

evals, summary, verdict, compliance_rate, penalty = evaluate_statutory_rules(
    bilingual_features, package_area_cm2=180.0
)

print(f"Bilingual Verdict:         {verdict}")
print(f"Compliance Rate:           {compliance_rate}%")
print(f"Estimated Penalty:         INR {penalty}")

for ev in evals:
    print(f"  * {ev['ruleCode']}: {ev['status']} => {ev['title']} ({ev['detectedValue'][:40]})")

assert verdict == "COMPLIANT", f"Expected COMPLIANT, got {verdict}"
assert compliance_rate == 100.0, f"Expected 100.0%, got {compliance_rate}"
assert penalty == 0, f"Expected 0, got {penalty}"
print("\nAll Bilingual Statutory Rules PASSED (100% Compliance)!")

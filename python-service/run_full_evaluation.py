import os
import sys
import cv2
import json
import numpy as np

if sys.platform == 'win32':
    for dll_dir in [
        r"C:\Users\parth\anaconda3\envs\myenv\lib\site-packages\torch\lib",
        r"C:\Users\parth\anaconda3\envs\myenv\Library\bin",
        r"C:\Users\parth\anaconda3\envs\myenv\bin"
    ]:
        if os.path.exists(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from core.ocr_ensemble import OCREnsemble
from core.statutory_rules import evaluate_statutory_rules
from core.counterfeit_detection import detect_brand_spoofing, compute_calibrated_counterfeit_risk
from core.barcode_forensics import analyze_barcode
from core.preprocessor import preprocess_packaging_image, check_blur

ocr = OCREnsemble()

user_dir = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded"

datasets = {
    "1_Asha_Bhel_Marathi_Pouch": {
        "front": os.path.join(user_dir, "media_1788363808609.jpg"),
        "secondary": []
    },
    "2_Dabur_Honey": {
        "front": os.path.join(user_dir, "media_1788363862012.jpg"),
        "secondary": []
    },
    "3_Bilsari_Bottle_Spoof": {
        "front": os.path.join(user_dir, "media_1788450790221.webp"),
        "secondary": []
    },
    "4_Park_Avenue_Samurai_MultiPanel": {
        "front": os.path.join(user_dir, "media_1788276410320.jpg"),
        "secondary": [os.path.join(user_dir, "media_1788276410309.jpg")]
    },
    "5_Bella_Vita_Luxury_Perfume": {
        "front": os.path.join(user_dir, "media_1788276410247.jpg"),
        "secondary": []
    },
    "6_Surf_Excel_MultiPanel": {
        "front": os.path.join(user_dir, "media_1788276410327.jpg"),
        "secondary": [os.path.join(user_dir, "media_1788276410328.jpg")]
    }
}

summary = {}

for name, paths in datasets.items():
    print(f"\n=======================================================")
    print(f"TESTING DATASET: {name}")
    print(f"=======================================================")
    
    front_path = paths["front"]
    front_img = cv2.imread(front_path)
    if front_img is None:
        print(f"Error loading front image: {front_path}")
        continue
    
    proc_front, skew = preprocess_packaging_image(front_img, apply_dewarp=True)
    front_features = ocr.extract_text_and_boxes(proc_front)
    for f in front_features:
        f['side'] = 'front'
    
    secondary_features = []
    for idx, s_path in enumerate(paths["secondary"]):
        s_img = cv2.imread(s_path)
        if s_img is not None:
            proc_s, _ = preprocess_packaging_image(s_img, apply_dewarp=False)
            s_feats = ocr.extract_text_and_boxes(proc_s)
            for f in s_feats:
                f['side'] = f'back_{idx}'
            secondary_features.extend(s_feats)
            
    all_features = front_features + secondary_features
    
    # Multilingual tokens
    ml_tokens = [
        f for f in all_features
        if f.get("is_multilingual") or f.get("script", "").startswith(("Devanagari", "Marathi", "Hindi", "Tamil", "Telugu", "Gujarati", "Bengali"))
    ]
    detected_languages = list(set(f.get("script", "Latin (English)") for f in all_features if f.get("script")))
    if not detected_languages:
        detected_languages = ["Latin (English)"]
        
    # Brand
    brand_name = "Packaged FMCG Commodity"
    for f in front_features:
        if f.get("category") == "brand_logo":
            brand_name = f.get("value", "").strip() or "Packaged FMCG Commodity"
            break
            
    # Statutory Rule Evaluations
    evaluations, font_metrics, overall_verdict, compliance_rate, penalty_inr = evaluate_statutory_rules(
        all_features, package_area_cm2=145.0
    )
    
    # Barcode
    barcode_res = analyze_barcode(front_img)
    if not barcode_res.get("detected") and paths["secondary"]:
        s_img = cv2.imread(paths["secondary"][0])
        if s_img is not None:
            sec_bc = analyze_barcode(s_img)
            if sec_bc.get("detected"):
                barcode_res = sec_bc
                
    # Counterfeit / Brand Spoof
    spoof_res = detect_brand_spoofing(brand_name)
    
    print(f"Product / Brand: {brand_name}")
    print(f"Total Extracted Tokens: {len(all_features)} (Front: {len(front_features)}, Secondary: {len(secondary_features)})")
    print(f"Detected Languages: {detected_languages}")
    print(f"Multilingual Tokens Count: {len(ml_tokens)}")
    for t in ml_tokens:
        print(f"  - [{t.get('script')} / {t.get('language')}] '{t.get('value')}' (Category: {t.get('category')}, Conf: {t.get('confidence_score')})")
    print(f"Overall Statutory Verdict: {overall_verdict} (Compliance Rate: {compliance_rate}%, Penalty: INR {penalty_inr})")
    print(f"Brand Authenticity: {spoof_res.get('status')} (Similarity: {spoof_res.get('similarity_score')}%, Spoof: {spoof_res.get('is_spoof')})")
    print(f"Barcode: Detected={barcode_res.get('detected')}, Code={barcode_res.get('barcode')}, GS1={barcode_res.get('gs1Country')}")
    
    summary[name] = {
        "brand_name": brand_name,
        "total_tokens": len(all_features),
        "detected_languages": detected_languages,
        "multilingual_tokens_count": len(ml_tokens),
        "overall_verdict": overall_verdict,
        "compliance_rate": compliance_rate,
        "penalty_inr": penalty_inr,
        "brand_status": spoof_res.get("status"),
        "is_spoof": spoof_res.get("is_spoof"),
        "matched_brand": spoof_res.get("matched_brand"),
        "barcode_detected": barcode_res.get("detected")
    }

with open("all_datasets_eval_summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)
print("\nSummary saved to all_datasets_eval_summary.json")

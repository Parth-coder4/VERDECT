import os
import sys
import json
import cv2
import numpy as np

# Ensure Windows C++ DLLs are found
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

from core.preprocessor import preprocess_packaging_image, check_blur, detect_packaging_object_contour
from core.ocr_ensemble import OCREnsemble
from core.barcode_forensics import analyze_barcode
from core.texture_analyzer import analyze_packaging_textures_and_discrepancies
from core.block_segmenter import detect_packaging_blocks
from core.statutory_rules import evaluate_statutory_rules
from core.counterfeit_detection import detect_brand_spoofing, compute_calibrated_counterfeit_risk

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

images = {
    "img6_asha_bhel_marathi": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg",
    "img7_dabur_honey_back": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363862012.jpg",
    "img1_bellavita_back": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg",
    "img2_parkavenue_side": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg",
    "img3_parkavenue_front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg",
    "img4_surfexcel_front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg",
    "img5_surfexcel_back": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"
}

ocr = OCREnsemble()

results = {}

for name, path in images.items():
    print(f"\n==================== PROCESSING: {name} ====================")
    img = cv2.imread(path)
    if img is None:
        print(f"Error loading {path}")
        continue
    
    h, w = img.shape[:2]
    is_blur, focus_score = check_blur(img)
    obj_contour = detect_packaging_object_contour(img)
    barcode_res = analyze_barcode(img)
    
    # Preprocess
    proc_img, skew = preprocess_packaging_image(img)
    
    # OCR
    features = ocr.extract_text_and_boxes(proc_img)
    blocks = detect_packaging_blocks(proc_img, features)
    
    # Fast Live OCR simulation
    live_raw = ocr._run_rapidocr_rotated(img, h, w, rot_code=None)
    
    print(f"Dimensions: {w}x{h}, Blur: {is_blur} (Score: {focus_score:.1f}), Skew: {skew:.2f}")
    print(f"Object Contour Detected: {obj_contour.get('detected')} (Aspect: {obj_contour.get('aspect_ratio')})")
    print(f"Barcode Detected: {barcode_res.get('detected')}, Code: {barcode_res.get('barcode')}, GS1: {barcode_res.get('gs1Country')}")
    print(f"Ensemble Features Count: {len(features)}, Live Features Count: {len(live_raw)}")
    
    statutory_found = {}
    for f in features:
        cat = f.get('category')
        val = f.get('value')
        conf = f.get('confidence_score', 0)
        if cat and cat != 'other':
            if cat not in statutory_found:
                statutory_found[cat] = []
            statutory_found[cat].append({"val": val, "conf": round(conf, 3)})
            
    print("Statutory Categories Found:")
    for cat, items in statutory_found.items():
        print(f"  - [{cat}]: {items[:2]}")
        
    results[name] = {
        "blur": {"is_blurry": bool(is_blur), "focus_score": round(float(focus_score), 1)},
        "object": obj_contour,
        "barcode": barcode_res,
        "skew": round(float(skew), 2),
        "feature_count": len(features),
        "statutory": statutory_found,
        "all_texts": [f.get("value") for f in features[:15]]
    }

with open("user_images_eval_report.json", "w", encoding="utf-8") as out_f:
    json.dump(results, out_f, indent=2, ensure_ascii=False)

print("\nEvaluation completed. Results saved to user_images_eval_report.json")

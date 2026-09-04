import cv2
import numpy as np
import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.preprocessor import preprocess_packaging_image, normalize_lighting_clahe, suppress_glare_and_noise, estimate_deskew_angle, deskew_image
from core.ocr_ensemble import OCREnsemble

TEST_IMAGES = {
    "1_bella_vita_back": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg",
    "2_park_avenue_side": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg",
    "3_park_avenue_front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg",
    "4_surf_excel_front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg",
    "5_surf_excel_back": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg",
}

def analyze_all():
    ocr = OCREnsemble()
    
    for key, path in TEST_IMAGES.items():
        print(f"\n{'='*70}")
        print(f"IMAGE: {key}")
        print(f"PATH: {path}")
        print(f"{'='*70}")
        
        if not os.path.exists(path):
            print(f"ERROR: File not found: {path}")
            continue
            
        img = cv2.imread(path)
        if img is None:
            print("ERROR: Failed to read image with cv2")
            continue
            
        h, w = img.shape[:2]
        print(f"Dimensions: {w}x{h} (Aspect ratio: {w/h:.2f})")
        
        # Check raw RapidOCR tokens
        if ocr.rapid_ocr:
            t0 = time.time()
            res_raw, _ = ocr.rapid_ocr(img)
            t_raw = time.time() - t0
            print(f"Raw RapidOCR runtime: {t_raw:.3f}s, found {len(res_raw) if res_raw else 0} raw text boxes")
            if res_raw:
                print("--- Top 20 Raw Detections ---")
                for i, r in enumerate(res_raw[:20]):
                    print(f"  [{i+1}] '{r[1]}' (conf: {float(r[2]):.2f})")
                if len(res_raw) > 20:
                    print(f"  ... and {len(res_raw)-20} more tokens.")
        
        # Run preprocessed OCR ensemble
        t1 = time.time()
        features = ocr.extract_text_and_boxes(img)
        t_feat = time.time() - t1
        print(f"\nFull Ensemble Pipeline Runtime: {t_feat:.3f}s, Classified Features: {len(features)}")
        
        categories = {}
        for f in features:
            cat = f.get('category')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(f)
            
        print("\n--- Classified Statutory Categories ---")
        for cat, items in categories.items():
            print(f"  * {cat.upper()} ({len(items)} items):")
            for it in items[:6]:
                print(f"      - '{it.get('value')}' [conf: {it.get('confidence_score')}]")
            if len(items) > 6:
                print(f"      ... +{len(items)-6} more")

if __name__ == "__main__":
    analyze_all()

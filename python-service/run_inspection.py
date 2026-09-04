import cv2
import numpy as np
import os
import sys
import time
import json

# Force UTF-8 on stdout
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.ocr_ensemble import OCREnsemble
from core.preprocessor import normalize_lighting_clahe, suppress_glare_and_noise

TEST_IMAGES = [
    ("1_Bella_Vita_Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"),
    ("2_Park_Avenue_Side", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"),
    ("3_Park_Avenue_Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"),
    ("4_Surf_Excel_Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"),
    ("5_Surf_Excel_Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"),
]

def apply_unsharp_mask(img: np.ndarray, sigma: float = 1.0, strength: float = 1.0) -> np.ndarray:
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    return cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)

def run():
    ocr = OCREnsemble()
    
    # Warm up OCR engine
    dummy = np.full((100, 100, 3), 255, dtype=np.uint8)
    ocr.rapid_ocr(dummy)
    
    full_report = {}
    
    for name, path in TEST_IMAGES:
        print(f"\n=======================================================")
        print(f"PROCESSING: {name}")
        print(f"=======================================================")
        
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        img = cv2.imread(path)
        orig_h, orig_w = img.shape[:2]
        
        # Max dimension scaling to 1500px for speed & crisp text
        max_dim = 1500
        if max(orig_h, orig_w) > max_dim:
            scale = max_dim / float(max(orig_h, orig_w))
            img_scaled = cv2.resize(img, (int(orig_w * scale), int(orig_h * scale)), interpolation=cv2.INTER_AREA)
        else:
            img_scaled = img
            
        sh, sw = img_scaled.shape[:2]
        
        # Preprocessing: LAB CLAHE + Bilateral Glare Suppression + Unsharp Mask
        t0 = time.time()
        clahe = normalize_lighting_clahe(img_scaled, clip_limit=2.0, tile_grid_size=(8, 8))
        denoised = suppress_glare_and_noise(clahe)
        enhanced = apply_unsharp_mask(denoised, sigma=1.0, strength=0.8)
        
        # Raw RapidOCR tokens
        res, _ = ocr.rapid_ocr(enhanced)
        t_ocr = time.time() - t0
        
        # Classified features via current pipeline
        features = ocr.extract_text_and_boxes(enhanced)
        
        raw_tokens = []
        if res:
            for item in res:
                box, text, conf = item
                raw_tokens.append({
                    "text": str(text),
                    "conf": round(float(conf), 3),
                    "box": [[int(p[0]), int(p[1])] for p in box]
                })
                
        print(f"Done in {t_ocr:.3f}s. Raw tokens: {len(raw_tokens)}, Classified features: {len(features)}")
        print("--- Classified Summary ---")
        for f in features:
            print(f"  * [{f.get('category'):14s}] (conf: {f.get('confidence_score')}) -> '{f.get('value')}'")
            
        full_report[name] = {
            "image_size": [sw, sh],
            "ocr_time_sec": round(t_ocr, 3),
            "raw_tokens": raw_tokens,
            "classified_features": features
        }
        
    with open("d:/sih-v2/python-service/inspection_results.json", "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2, ensure_ascii=False)
        
    print("\nSaved complete inspection report to inspection_results.json")

if __name__ == "__main__":
    run()

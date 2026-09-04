import cv2
import numpy as np
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.ocr_ensemble import OCREnsemble
from core.preprocessor import normalize_lighting_clahe, suppress_glare_and_noise, preprocess_packaging_image

TEST_IMAGES = [
    ("1_Bella Vita Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"),
    ("2_Park Avenue Side", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"),
    ("3_Park Avenue Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"),
    ("4_Surf Excel Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"),
    ("5_Surf Excel Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"),
]

def apply_unsharp_mask(img: np.ndarray, sigma: float = 1.0, strength: float = 1.5) -> np.ndarray:
    """Unsharp masking to pop dot-matrix numbers and fine metallic text."""
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return sharpened

def run_fast_inspect():
    ocr = OCREnsemble()
    
    for name, path in TEST_IMAGES:
        sys.stdout.write(f"\n{'='*70}\n")
        sys.stdout.write(f"TEST: {name}\n")
        sys.stdout.write(f"PATH: {path}\n")
        sys.stdout.flush()
        
        if not os.path.exists(path):
            sys.stdout.write("ERROR: File not found\n")
            sys.stdout.flush()
            continue
            
        img = cv2.imread(path)
        if img is None:
            sys.stdout.write("ERROR: Could not load image\n")
            sys.stdout.flush()
            continue
            
        orig_h, orig_w = img.shape[:2]
        sys.stdout.write(f"Original size: {orig_w}x{orig_h}\n")
        
        # Scale to max_dim 1500 for optimal RapidOCR speed + accuracy
        max_dim = 1500
        if max(orig_h, orig_w) > max_dim:
            scale = max_dim / float(max(orig_h, orig_w))
            img_scaled = cv2.resize(img, (int(orig_w * scale), int(orig_h * scale)), interpolation=cv2.INTER_AREA)
        else:
            img_scaled = img
            
        sh, sw = img_scaled.shape[:2]
        sys.stdout.write(f"Inference size: {sw}x{sh}\n")
        sys.stdout.flush()
        
        # 1. Base CLAHE + Sharpen Preprocessing
        t0 = time.time()
        clahe_img = normalize_lighting_clahe(img_scaled, clip_limit=2.5, tile_grid_size=(8,8))
        denoised = suppress_glare_and_noise(clahe_img)
        enhanced = apply_unsharp_mask(denoised, sigma=1.0, strength=0.8)
        
        # RapidOCR
        res, _ = ocr.rapid_ocr(enhanced)
        t_ocr = time.time() - t0
        sys.stdout.write(f"OCR Latency: {t_ocr:.3f}s | Tokens found: {len(res) if res else 0}\n")
        
        if res:
            sys.stdout.write("--- Extracted Tokens ---\n")
            for idx, item in enumerate(res):
                box, text, conf = item
                sys.stdout.write(f"  [{idx:02d}] (conf={float(conf):.2f}) '{text}'\n")
        sys.stdout.flush()

if __name__ == "__main__":
    run_fast_inspect()

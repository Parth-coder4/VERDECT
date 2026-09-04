import cv2
import numpy as np
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.preprocessor import preprocess_packaging_image
from core.ocr_ensemble import OCREnsemble
from core.statutory_rules import evaluate_statutory_rules

TEST_IMAGES = [
    ("Bella Vita Perfume Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"),
    ("Park Avenue Samurai Side", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"),
    ("Park Avenue Samurai Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"),
    ("Surf Excel Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"),
    ("Surf Excel Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"),
]

def test():
    ocr = OCREnsemble()
    for name, path in TEST_IMAGES:
        print(f"\n=======================================================")
        print(f"TESTING: {name}")
        print(f"FILE: {path}")
        print(f"=======================================================")
        if not os.path.exists(path):
            print("File missing!")
            continue
        img = cv2.imread(path)
        print(f"Image shape: {img.shape}")
        
        t0 = time.time()
        # Fast raw pass
        res, _ = ocr.rapid_ocr(img)
        t_raw = time.time() - t0
        print(f"RapidOCR Raw ({t_raw:.2f}s): {len(res) if res else 0} tokens found")
        if res:
            for idx, r in enumerate(res):
                print(f"  [{idx:02d}] conf={float(r[2]):.2f} | '{r[1]}'")
        
        # Test full extraction
        t1 = time.time()
        features = ocr.extract_text_and_boxes(img)
        t_feat = time.time() - t1
        print(f"\nEnsemble Features ({t_feat:.2f}s): {len(features)} categorized items")
        for f in features:
            print(f"  * [{f.get('category'):12s}] conf={f.get('confidence_score')} | '{f.get('value')}'")

if __name__ == "__main__":
    test()

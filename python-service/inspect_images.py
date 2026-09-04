import cv2
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.ocr_ensemble import OCREnsemble

ocr = OCREnsemble()
img_dir = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded"
for fname in sorted(os.listdir(img_dir)):
    fpath = os.path.join(img_dir, fname)
    img = cv2.imread(fpath)
    if img is None:
        continue
    print(f"\n==================== {fname} ({img.shape}) ====================")
    feats = ocr.extract_text_and_boxes(img)
    for f in feats:
        print(f"  [{f.get('category')}] ({f.get('language')}/{f.get('script')}) conf={f.get('confidence_score')}: {f.get('value')}")

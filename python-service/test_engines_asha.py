import os
import sys
import cv2
import numpy as np

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
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

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)

print(f"Testing OCR engines on {img_path}...")

# 1. EasyOCR Check
try:
    import easyocr
    print("EasyOCR is available. Testing with ['en', 'mr', 'hi']...")
    try:
        reader = easyocr.Reader(['en', 'mr', 'hi'], gpu=False)
        res_easy = reader.readtext(img)
        print(f"EasyOCR found {len(res_easy)} tokens:")
        for box, text, conf in res_easy:
            print(f"  EasyOCR: '{text}' ({conf:.2f})")
    except Exception as ee:
        print(f"EasyOCR mr/hi failed: {ee}, trying ['en', 'hi']...")
        reader = easyocr.Reader(['en', 'hi'], gpu=False)
        res_easy = reader.readtext(img)
        print(f"EasyOCR (en,hi) found {len(res_easy)} tokens:")
        for box, text, conf in res_easy:
            print(f"  EasyOCR: '{text}' ({conf:.2f})")
except Exception as e:
    print(f"EasyOCR failed: {e}")

# 2. RapidOCR with various image enhancements
from rapidocr_onnxruntime import RapidOCR
rapid = RapidOCR()
dev_model = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_rec.onnx')
dev_dict = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_dict.txt')
dev_ocr = RapidOCR(rec_model_path=dev_model, rec_keys_path=dev_dict) if os.path.exists(dev_model) else None

# Test top crop (title / brand banner)
h, w = img.shape[:2]
top_crop = img[0:int(h*0.45), :]
mid_crop = img[int(h*0.35):int(h*0.65), :]

for name, crop in [("Full Image", img), ("Top Banner", top_crop), ("Mid Region", mid_crop)]:
    print(f"\n--- Testing {name} ---")
    r_res, _ = rapid(crop)
    print(f"  Standard RapidOCR ({len(r_res) if r_res else 0} tokens):")
    if r_res:
        for b, t, c in r_res:
            print(f"    '{t}' ({c:.2f})")
    if dev_ocr:
        d_res, _ = dev_ocr(crop)
        print(f"  Devanagari RapidOCR ({len(d_res) if d_res else 0} tokens):")
        if d_res:
            for b, t, c in d_res:
                print(f"    '{t}' ({c:.2f})")

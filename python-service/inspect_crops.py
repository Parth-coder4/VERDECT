import os
import sys
import cv2
import numpy as np
import unicodedata

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

from rapidocr_onnxruntime import RapidOCR

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)
h, w = img.shape[:2]
print(f"Image {w}x{h}")

rapid = RapidOCR()
dev_model = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_rec.onnx')
dev_dict = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_dict.txt')
dev_ocr = RapidOCR(rec_model_path=dev_model, rec_keys_path=dev_dict)

# Let's inspect different subregions of the image
# Top banner (title)
banner = img[70:180, 50:350]
# Middle left (Marathi Asha / Special / Bhel)
mid_left = img[180:320, 50:200]
# Middle right (English Special Bhel / Family Pack)
mid_right = img[180:280, 200:350]

crops = [
    ("Top Banner", banner),
    ("Mid Left (Marathi)", mid_left),
    ("Mid Right (English)", mid_right)
]

for name, crop in crops:
    print(f"\n================ {name} ================")
    # 1. Direct rapid
    r1, _ = rapid(crop)
    print("  RapidOCR (Latin):", [(t, round(c, 2)) for _, t, c in (r1 or [])])
    # 2. Direct dev_ocr
    d1, _ = dev_ocr(crop)
    print("  RapidOCR (Devanagari):", [(t, round(c, 2)) for _, t, c in (d1 or [])])
    
    # 3. Enhanced crop (2x resize + CLAHE + unsharp)
    crop_2x = cv2.resize(crop, (crop.shape[1]*2, crop.shape[0]*2), interpolation=cv2.INTER_CUBIC)
    lab = cv2.cvtColor(crop_2x, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
    
    r2, _ = rapid(enhanced)
    print("  Enhanced RapidOCR (Latin):", [(t, round(c, 2)) for _, t, c in (r2 or [])])
    d2, _ = dev_ocr(enhanced)
    print("  Enhanced RapidOCR (Devanagari):", [(t, round(c, 2)) for _, t, c in (d2 or [])])

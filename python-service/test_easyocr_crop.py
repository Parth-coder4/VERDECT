import os
import sys
import time
import cv2
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

import easyocr
from rapidocr_onnxruntime import RapidOCR

reader = easyocr.Reader(['mr', 'hi', 'en'], gpu=False)
rapid = RapidOCR()

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)

# Test crop recognition with EasyOCR
t0 = time.time()
res_rapid, _ = rapid(img)
t_rapid = time.time() - t0
print(f"RapidOCR time: {t_rapid*1000:.1f}ms, found {len(res_rapid) if res_rapid else 0} boxes")

t0 = time.time()
for b, t, c in res_rapid or []:
    xs = [int(p[0]) for p in b]
    ys = [int(p[1]) for p in b]
    crop = img[min(ys):max(ys), min(xs):max(xs)]
    if crop.size > 0:
        c_res = reader.readtext(crop)
        print(f"  Crop for '{t}' -> EasyOCR: {c_res}")
t_crops = time.time() - t0
print(f"EasyOCR on {len(res_rapid)} crops time: {t_crops*1000:.1f}ms")

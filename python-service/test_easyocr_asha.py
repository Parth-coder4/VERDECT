import os
import sys
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
from core.ocr_ensemble import detect_script

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)

print("Testing EasyOCR on Asha Bhel Marathi pouch...")
reader_mr = easyocr.Reader(['mr', 'hi', 'en'], gpu=False)
results_mr = reader_mr.readtext(img)

print("\n--- EasyOCR mr/hi/en results on Asha Bhel ---")
for bbox, text, prob in results_mr:
    print(f"  Text: '{text}' | Prob: {prob:.3f} | Script: {detect_script(text)}")

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
from core.ocr_ensemble import OCREnsemble, detect_script, _is_latin_hallucination, _clean_indic_text

reader = easyocr.Reader(['mr', 'hi', 'en'], gpu=False)
rapid = RapidOCR()

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)

res_rapid, _ = rapid(img)
print("RapidOCR detections on Asha Bhel:")
for b, t, c in res_rapid:
    print(f"  Text: '{t}', conf: {c:.3f}, is_hallucination: {_is_latin_hallucination(t, c)}")
    if _is_latin_hallucination(t, c) or detect_script(t)['is_multilingual'] or c < 0.88:
        xs = [int(p[0]) for p in b]
        ys = [int(p[1]) for p in b]
        pad = 6
        h_img, w_img = img.shape[:2]
        crop = img[max(0, min(ys)-pad):min(h_img, max(ys)+pad), max(0, min(xs)-pad):min(w_img, max(xs)+pad)]
        if crop.size > 0:
            e_res = reader.readtext(crop)
            for _, e_txt, e_conf in e_res:
                clean_e = _clean_indic_text(e_txt)
                meta = detect_script(clean_e)
                print(f"    --> EasyOCR crop: '{clean_e}' (conf {e_conf:.3f}), script: {meta}")

# Also check EasyOCR full image detection
print("\nEasyOCR full image on Asha Bhel:")
e_full = reader.readtext(img)
for bbox, text, prob in e_full:
    clean_e = _clean_indic_text(text)
    meta = detect_script(clean_e)
    print(f"  Text: '{clean_e}', prob: {prob:.3f}, script: {meta}")

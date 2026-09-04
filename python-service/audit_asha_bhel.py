import os
import sys
import json
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

from core.ocr_ensemble import OCREnsemble, detect_script
from core.preprocessor import preprocess_packaging_image

image_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"

print(f"Loading image from {image_path}...")
img = cv2.imread(image_path)
if img is None:
    print(f"Error: Could not load image from {image_path}")
    sys.exit(1)

print(f"Image shape: {img.shape}")
ocr = OCREnsemble()
print(f"Devanagari OCR engine loaded: {ocr.devanagari_ocr is not None}")
print(f"RapidOCR engine loaded: {ocr.rapid_ocr is not None}")

# Run OCR Ensemble
proc_img, skew = preprocess_packaging_image(img)
print(f"Skew corrected: {skew:.2f} deg")

features = ocr.extract_text_and_boxes(proc_img)
print(f"\nExtracted {len(features)} features:")

devanagari_tokens = []
english_tokens = []
garbled_tokens = []

for idx, f in enumerate(features):
    val = f.get('value', '')
    conf = f.get('confidence_score', 0)
    cat = f.get('category', 'other')
    script_info = detect_script(val)
    
    print(f"[{idx+1:02d}] ({script_info['script']:<26}) Conf: {conf:.2f} | Cat: {cat:<12} | Text: '{val}'")
    
    if script_info['is_multilingual']:
        devanagari_tokens.append((val, conf))
    else:
        english_tokens.append((val, conf))

print("\n--- DEVANAGARI / MARATHI TOKENS ---")
for t, c in devanagari_tokens:
    print(f"  * [{c:.2f}] {t}")

print("\n--- ENGLISH TOKENS ---")
for t, c in english_tokens:
    print(f"  * [{c:.2f}] {t}")

# Check specific target substrings
expected_marathi = ["आशा", "भेळ", "स्पेशल भेळ", "पांढऱ्या पुलाची प्रसिद्ध"]
expected_english = ["Special Bhel", "Family Pack"]
garbled_patterns = ["RRTO", "कूE TTध", "कूE", "TTध"]

print("\n--- VERIFICATION CHECKS ---")
all_text = " ".join([f.get('value', '') for f in features])

for em in expected_marathi:
    present = em in all_text or any(em in t for t, _ in devanagari_tokens)
    print(f"  Check Marathi '{em}': {'FOUND (PASS)' if present else 'NOT FOUND'}")

for ee in expected_english:
    present = any(ee.lower() in t.lower() for t, _ in english_tokens)
    print(f"  Check English '{ee}': {'FOUND (PASS)' if present else 'NOT FOUND'}")

for gp in garbled_patterns:
    found = gp in all_text
    print(f"  Check Garbled '{gp}': {'ABSENT (PASS)' if not found else 'CONTAMINATED (FAIL)'}")

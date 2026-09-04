import os
import sys
import json
import cv2

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

from core.ocr_ensemble import OCREnsemble

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ocr = OCREnsemble()

user_dir = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded"
files = sorted(os.listdir(user_dir))

for f in files:
    p = os.path.join(user_dir, f)
    img = cv2.imread(p)
    if img is None:
        continue
    features = ocr.extract_text_and_boxes(img)
    texts = [feat['value'] for feat in features]
    scripts = set(feat.get('script') for feat in features if feat.get('script'))
    print(f"\n--- {f} ---")
    print(f"Features: {len(features)}, Scripts: {scripts}")
    print("Sample texts:", texts[:8])

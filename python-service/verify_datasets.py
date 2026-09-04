import os
import sys
import cv2
import json
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
from core.ocr_ensemble import detect_script, _clean_indic_text, _is_latin_hallucination
from core.statutory_rules import evaluate_statutory_rules
from core.counterfeit_detection import detect_brand_spoofing, compute_calibrated_counterfeit_risk
from core.barcode_forensics import analyze_barcode

user_dir = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded"

datasets = {
    "1_Asha_Bhel_Marathi_Pouch": {
        "front": os.path.join(user_dir, "media_1788363808609.jpg"),
        "secondary": []
    },
    "2_Dabur_Honey": {
        "front": os.path.join(user_dir, "media_1788363862012.jpg"),
        "secondary": []
    },
    "3_Bilsari_Bottle_Spoof": {
        "front": os.path.join(user_dir, "media_1788450790221.webp"),
        "secondary": []
    },
    "4_Park_Avenue_Samurai_MultiPanel": {
        "front": os.path.join(user_dir, "media_1788276410320.jpg"),
        "secondary": [os.path.join(user_dir, "media_1788276410309.jpg")]
    },
    "5_Bella_Vita_Luxury_Perfume": {
        "front": os.path.join(user_dir, "media_1788276410247.jpg"),
        "secondary": []
    },
    "6_Surf_Excel_MultiPanel": {
        "front": os.path.join(user_dir, "media_1788276410327.jpg"),
        "secondary": [os.path.join(user_dir, "media_1788276410328.jpg")]
    }
}

print("All 6 target datasets mapped:")
for k, v in datasets.items():
    print(f"  [{k}] -> front exists: {os.path.exists(v['front'])}, secondary exists: {[os.path.exists(p) for p in v['secondary']]}")

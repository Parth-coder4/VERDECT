import os
import sys
import re
import unicodedata
import cv2
import json

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

from core.ocr_ensemble import detect_script, is_latin_hallucination, prune_script_crosstalk

def arbitrate_crop_script_v2(latin_text: str, latin_conf: float, dev_text: str, dev_conf: float) -> tuple[str, float, dict]:
    clean_lat = unicodedata.normalize('NFKC', str(latin_text or '')).strip()
    clean_dev = unicodedata.normalize('NFKC', str(dev_text or '')).strip()
    clean_dev = prune_script_crosstalk(clean_dev)

    dev_meta = detect_script(clean_dev)
    lat_meta = detect_script(clean_lat)

    lat_is_garble = is_latin_hallucination(clean_lat, latin_conf)
    dev_has_indic = dev_meta['is_multilingual']
    
    dev_indic_chars = sum(1 for ch in clean_dev if 0x0900 <= ord(ch) <= 0x0D7F)
    lat_alpha_chars = sum(1 for ch in clean_lat if ch.isascii() and ch.isalnum())

    # 1. If Latin text is valid English (not garbled and high/moderate confidence)
    if not lat_is_garble and latin_conf >= 0.70 and lat_alpha_chars >= 2:
        # Only override if Devanagari is a substantive multi-character word AND Latin confidence is lower
        if dev_has_indic and dev_indic_chars >= 3 and dev_conf > 0.85 and latin_conf < 0.80:
            return (clean_dev, dev_conf, dev_meta)
        return (clean_lat, latin_conf, lat_meta)

    # 2. If Latin text is garbled hallucination (e.g. 'RRTO', '||||')
    if lat_is_garble:
        if dev_has_indic and dev_indic_chars >= 1 and dev_conf >= 0.25:
            return (clean_dev, max(latin_conf, dev_conf), dev_meta)
        if len(clean_dev) > 0 and dev_conf > latin_conf:
            return (clean_dev, dev_conf, detect_script(clean_dev))

    # 3. If Devanagari text has valid Indic characters and Latin is weak (<0.70)
    if dev_has_indic and dev_indic_chars >= 2 and dev_conf >= 0.35:
        if latin_conf < 0.70 or dev_conf >= latin_conf:
            return (clean_dev, max(latin_conf, dev_conf), dev_meta)

    # 4. Reject isolated single-character Devanagari noise
    if dev_has_indic and dev_indic_chars <= 1 and lat_alpha_chars >= 1:
        return (clean_lat, latin_conf, lat_meta)

    # Default fallback
    if dev_has_indic and dev_indic_chars >= 2 and dev_conf >= 0.40:
        return (clean_dev, dev_conf, dev_meta)
    return (clean_lat, latin_conf, lat_meta)

# Test arbitration with various sample pairs
test_cases = [
    ("PARK AVENUE", 0.95, "।", 0.98),
    ("SURF EXCEL", 0.96, "प", 0.97),
    ("RRTO", 0.627, "आशा भेळ", 0.85),
    ("RRTO", 0.627, "स्पेशल", 0.75),
    ("3.4 FL.OZ.", 0.92, "F ननE F", 0.98),
    ("Dabur Honey", 0.94, "डाबर हनी", 0.92),
    ("Special Bhel", 0.96, "Special Bhel", 0.80),
]

print("Testing Arbitration v2:")
for lat, l_c, dev, d_c in test_cases:
    best_t, best_c, meta = arbitrate_crop_script_v2(lat, l_c, dev, d_c)
    print(f"  Latin: '{lat}' ({l_c}) vs Dev: '{dev}' ({d_c}) -> Winner: '{best_t}' ({best_c:.2f}) [{meta['script']}]")

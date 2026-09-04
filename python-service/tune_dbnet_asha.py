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

from rapidocr_onnxruntime import RapidOCR

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)
print("Image shape:", img.shape)

dev_model = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_rec.onnx')
dev_dict = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_dict.txt')

# Test RapidOCR with different DBNet detection parameters
# Lower det_db_thresh and box_thresh allows detecting stylized / low-contrast decorative text on Indian pouches
for thresh in [0.3, 0.2, 0.15, 0.1]:
    print(f"\n--- Testing DBNet det_db_thresh={thresh} ---")
    ocr_tuned = RapidOCR(
        rec_model_path=dev_model,
        rec_keys_path=dev_dict,
        det_db_thresh=thresh,
        det_db_box_thresh=thresh,
        det_db_unclip_ratio=2.0
    )
    res, _ = ocr_tuned(img)
    if res:
        for box, text, conf in res:
            print(f"  [{conf:.2f}] '{text}' | Box: {box}")
    else:
        print("  No text detected.")

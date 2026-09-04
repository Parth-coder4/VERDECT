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
print("Image shape:", img.shape)

# Test 1: Standard RapidOCR (Latin/Default)
rapid = RapidOCR()
res, _ = rapid(img)
print(f"\n--- STANDARD RAPIDOCR RESULTS ({len(res) if res else 0} tokens) ---")
if res:
    for box, text, conf in res:
        print(f"  Conf: {conf:.2f} | Text: '{text}' | Box: {box}")

# Test 2: Devanagari Model
dev_model = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_rec.onnx')
dev_dict = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_dict.txt')
print(f"\nDevanagari model exists: {os.path.exists(dev_model)}, dict exists: {os.path.exists(dev_dict)}")

if os.path.exists(dev_model) and os.path.exists(dev_dict):
    dev_ocr = RapidOCR(rec_model_path=dev_model, rec_keys_path=dev_dict)
    
    # Run full image on Devanagari OCR
    res_dev, _ = dev_ocr(img)
    print(f"\n--- FULL IMAGE DEVANAGARI RAPIDOCR ({len(res_dev) if res_dev else 0} tokens) ---")
    if res_dev:
        for box, text, conf in res_dev:
            print(f"  Conf: {conf:.2f} | Text: '{text}' | Box: {box}")

    # Run crops on Devanagari OCR
    if res:
        boxes = [np.array(b, dtype=np.float32) for b, _, _ in res]
        crops = rapid.get_crop_img_list(img, boxes)
        rec_res, _ = dev_ocr.text_rec(crops)
        print(f"\n--- CROPS DEVANAGARI RECOGNITION ---")
        for (b, lat_text, lat_conf), (d_text, d_conf) in zip(res, rec_res):
            print(f"  Latin: '{lat_text}' ({lat_conf:.2f})  -->  Devanagari: '{d_text}' ({d_conf:.2f})")

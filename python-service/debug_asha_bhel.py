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

from rapidocr_onnxruntime import RapidOCR
from core.ocr_ensemble import OCREnsemble, detect_script

img_path = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788363808609.jpg"
img = cv2.imread(img_path)
print("Image shape:", img.shape)

dev_model = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_rec.onnx')
dev_dict = os.path.join(os.path.dirname(__file__), 'models', 'devanagari_dict.txt')
print("Devanagari model exists:", os.path.exists(dev_model))

eng_ocr = RapidOCR()
dev_ocr = RapidOCR(rec_model_path=dev_model, rec_keys_path=dev_dict)

res_eng, _ = eng_ocr(img)
print("\n--- Standard RapidOCR (English DBNet + Rec) ---")
if res_eng:
    for box, text, conf in res_eng:
        print(f"  Box: {box} | Text: '{text}' | Conf: {conf:.3f}")

print("\n--- Devanagari OCR on detected boxes ---")
if res_eng:
    boxes = [np.array(b, dtype=np.float32) for b, t, c in res_eng]
    crops = eng_ocr.get_crop_img_list(img, boxes)
    res_dev, _ = dev_ocr.text_rec(crops)
    for (b, t_eng, c_eng), (t_dev, c_dev) in zip(res_eng, res_dev):
        print(f"  Eng: '{t_eng}' ({c_eng:.3f}) --> Dev: '{t_dev}' ({c_dev:.3f}) | Script: {detect_script(t_dev)}")

# Also test if upscale helps
h, w = img.shape[:2]
img_2x = cv2.resize(img, (w*2, h*2), interpolation=cv2.INTER_CUBIC)
res_2x, _ = eng_ocr(img_2x)
print("\n--- 2x Upscaled DBNet Detection ---")
if res_2x:
    boxes_2x = [np.array(b, dtype=np.float32) for b, t, c in res_2x]
    crops_2x = eng_ocr.get_crop_img_list(img_2x, boxes_2x)
    res_dev_2x, _ = dev_ocr.text_rec(crops_2x)
    for (b, t_eng, c_eng), (t_dev, c_dev) in zip(res_2x, res_dev_2x):
        print(f"  Eng: '{t_eng}' ({c_eng:.3f}) --> Dev: '{t_dev}' ({c_dev:.3f}) | Script: {detect_script(t_dev)}")

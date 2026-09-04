import os, sys
if sys.platform == 'win32':
    for dll_dir in [
        r'C:\Users\parth\anaconda3\envs\myenv\lib\site-packages\torch\lib',
        r'C:\Users\parth\anaconda3\envs\myenv\Library\bin',
        r'C:\Users\parth\anaconda3\envs\myenv\bin'
    ]:
        if os.path.exists(dll_dir):
            try: os.add_dll_directory(dll_dir)
            except Exception: pass
    try: import torch
    except Exception: pass

import cv2
import numpy as np
from paddleocr import PaddleOCR

img_path = r'C:/Users/parth/.gemini/antigravity/brain/4526fa59-4c3f-4476-8003-2d2be18ba63d/.user_uploaded/media_1788534124539.jpg'
img = cv2.imread(img_path)
h, w = img.shape[:2]
print(f"Image size: {w}x{h}")

ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

# Let's inspect PaddleOCR raw results on full image
res = ocr.ocr(img, cls=True)
print("\n--- PaddleOCR RAW FULL IMAGE ---")
if res and res[0]:
    for idx, line in enumerate(res[0]):
        box, (text, conf) = line
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        print(f"[{idx}] text={repr(text)} conf={conf:.3f} box=[ymin={min(ys):.1f}, xmin={min(xs):.1f}, ymax={max(ys):.1f}, xmax={max(xs):.1f}]")
else:
    print("No text detected!")

# Let's crop the badge area: top-left region ~ x: 200-380, y: 280-400 (scaled to 1000x1000)
badge = img[280:400, 240:360]
cv2.imwrite('badge_crop.jpg', badge)
res_badge = ocr.ocr(badge, cls=True)
print("\n--- PaddleOCR BADGE CROP ---")
if res_badge and res_badge[0]:
    for line in res_badge[0]:
        print(" ", line)
else:
    print(" Nothing in badge crop with en model")

# Let's crop the Amool text: y: 300:500, x: 380:800
amool_crop = img[300:500, 380:800]
cv2.imwrite('amool_crop.jpg', amool_crop)
res_amool = ocr.ocr(amool_crop, cls=True)
print("\n--- PaddleOCR AMOOL CROP ---")
if res_amool and res_amool[0]:
    for line in res_amool[0]:
        print(" ", line)

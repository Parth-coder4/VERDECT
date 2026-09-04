import os, sys
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
    try:
        import torch
    except Exception:
        pass
import cv2
from paddleocr import PaddleOCR
import numpy as np

img = cv2.imread('D:/sih-v2/server/uploads/lahore_zeera_test.jpg')
# Rotate 90 degrees clockwise
img_rot90 = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
# Rotate 90 degrees counter-clockwise
img_rot270 = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)

ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

print("--- CLOCKWISE ---")
res = ocr.ocr(img_rot90, cls=True)
if res and res[0]:
    for line in res[0]:
        print(line[1][0])

print("\n--- COUNTER CLOCKWISE ---")
res = ocr.ocr(img_rot270, cls=True)
if res and res[0]:
    for line in res[0]:
        print(line[1][0])

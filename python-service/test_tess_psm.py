import cv2
import os
import pytesseract
from PIL import Image
import numpy as np

tess_path = r"C:\Users\parth\anaconda3\envs\myvenv\Library\bin\tesseract.EXE"
if os.path.exists(tess_path):
    pytesseract.pytesseract.tesseract_cmd = tess_path

img_path = 'd:/sih-v2/server/uploads/scan_1787858794709_3396.jpg'
img = cv2.imread(img_path)

# Test multiple PSM modes (PSM 11 = Sparse text, PSM 6 = Uniform block, PSM 3 = Auto)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
cl = clahe.apply(gray)

for psm in [11, 6, 3]:
    txt = pytesseract.image_to_string(cl, config=f'--psm {psm}')
    print(f"=== Tesseract PSM {psm} ===")
    lines = [l.strip() for l in txt.split('\n') if len(l.strip()) > 0]
    print(lines[:10])

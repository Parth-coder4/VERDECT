import cv2
import easyocr
import os
import numpy as np

reader = easyocr.Reader(['en'], gpu=False)

def test_image(img_path):
    print("Testing:", img_path)
    if not os.path.exists(img_path):
        print("Not found")
        return
    img = cv2.imread(img_path)
    if img is None:
        print("Could not read")
        return
    print("Shape:", img.shape)

    # 1. Raw
    res_raw = reader.readtext(img)
    print("Raw results:", [(r[1], round(r[2], 2)) for r in res_raw])

    # 2. Resized / Upscaled if small
    h, w = img.shape[:2]
    if max(h, w) < 1200:
        scale = 1200.0 / max(h, w)
        resized = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    else:
        resized = img

    # 3. LAB CLAHE
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
    
    # 4. Sharpen
    gaussian = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
    sharpened = cv2.addWeighted(enhanced, 1.4, gaussian, -0.4, 0)

    res_proc = reader.readtext(sharpened, text_threshold=0.2, low_text=0.2, link_threshold=0.3, mag_ratio=1.5)
    print("Processed results:", [(r[1], round(r[2], 2)) for r in res_proc])

for name in ['scan_1787860886321_7897.jpg', 'scan_1787861749589_9883.jpg', 'scan_1787858794709_3396.jpg']:
    test_image(os.path.join('d:/sih-v2/server/uploads', name))

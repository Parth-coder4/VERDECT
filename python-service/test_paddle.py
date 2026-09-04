from paddleocr import PaddleOCR
import cv2
import os

print("Initializing PaddleOCR...")
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    print("PaddleOCR loaded!")
    
    img_path = 'd:/sih-v2/server/uploads/scan_1787861749589_9883.jpg'
    if os.path.exists(img_path):
        img = cv2.imread(img_path)
        res = ocr.ocr(img, cls=True)
        print("PaddleOCR results count:", len(res) if res else 0)
        if res and len(res) > 0 and res[0] is not None:
            for line in res[0]:
                print("Line:", line[1])
except Exception as e:
    print("PaddleOCR error:", e)

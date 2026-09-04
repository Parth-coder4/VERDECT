import cv2
import os
import pytesseract
from PIL import Image

tess_path = r"C:\Users\parth\anaconda3\envs\myvenv\Library\bin\tesseract.EXE"
if os.path.exists(tess_path):
    pytesseract.pytesseract.tesseract_cmd = tess_path

img_path = 'd:/sih-v2/server/uploads/scan_1787861749589_9883.jpg'
img = cv2.imread(img_path)

# Test Tesseract data extraction
data = pytesseract.image_to_data(Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), output_type=pytesseract.Output.DICT)
tess_tokens = []
n_boxes = len(data['text'])
for i in range(n_boxes):
    text = data['text'][i].strip()
    conf = int(data['conf'][i])
    if conf > 20 and len(text) > 0:
        tess_tokens.append((text, conf, data['left'][i], data['top'][i], data['width'][i], data['height'][i]))

print("Tesseract detected:", tess_tokens)

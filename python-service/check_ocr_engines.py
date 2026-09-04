import sys
import os
import shutil

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")

# 1. Check pytesseract
try:
    import pytesseract
    print("pytesseract module: INSTALLED")
    # Check if tesseract binary is accessible
    tess_path = shutil.which("tesseract") or r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(tess_path):
        pytesseract.pytesseract.tesseract_cmd = tess_path
        print(f"Tesseract Binary: FOUND at {tess_path}")
        version = pytesseract.get_tesseract_version()
        print(f"Tesseract Engine Version: {version}")
    else:
        print("Tesseract Binary: NOT FOUND in standard paths")
except Exception as e:
    print(f"pytesseract check failed: {e}")

# 2. Check paddleocr
try:
    import paddleocr
    from paddleocr import PaddleOCR
    print("paddleocr module: INSTALLED")
    try:
        ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        print("PaddleOCR Engine: INITIALIZED SUCCESSFULLY")
    except Exception as e:
        print(f"PaddleOCR Engine Init error: {e}")
except Exception as e:
    print(f"paddleocr check failed: {e}")

# 3. Check easyocr
try:
    import easyocr
    print("easyocr module: INSTALLED")
except Exception as e:
    print(f"easyocr check failed: {e}")

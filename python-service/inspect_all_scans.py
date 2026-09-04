import os
import sys
import json
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

user_dir = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded"
print("Scanning user_uploaded dir:")
if os.path.exists(user_dir):
    for f in sorted(os.listdir(user_dir)):
        p = os.path.join(user_dir, f)
        img = cv2.imread(p)
        if img is not None:
            print(f"  {f}: shape={img.shape}")
        else:
            print(f"  {f}: cv2 failed to read")

uploads_dir = r"d:/sih-v2/server/uploads"
print("\nScanning server/uploads dir (last 10 files):")
if os.path.exists(uploads_dir):
    for f in sorted(os.listdir(uploads_dir))[-10:]:
        p = os.path.join(uploads_dir, f)
        img = cv2.imread(p)
        if img is not None:
            print(f"  {f}: shape={img.shape}")

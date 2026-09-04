import cv2
import numpy as np
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rapidocr_onnxruntime import RapidOCR

TEST_IMAGES = [
    ("1_Bella_Vita_Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"),
    ("2_Park_Avenue_Side", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"),
    ("3_Park_Avenue_Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"),
    ("4_Surf_Excel_Front", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"),
    ("5_Surf_Excel_Back", r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"),
]

def run():
    out_file = "d:/sih-v2/python-service/ocr_raw_output.txt"
    with open(out_file, "w", encoding="utf-8") as out:
        out.write("Initializing RapidOCR...\n")
        out.flush()
        engine = RapidOCR()
        
        # Warmup
        engine(np.full((100, 100, 3), 255, dtype=np.uint8))
        out.write("RapidOCR loaded successfully.\n\n")
        out.flush()
        
        for name, path in TEST_IMAGES:
            out.write(f"{'='*60}\n")
            out.write(f"IMAGE: {name}\n")
            out.write(f"PATH: {path}\n")
            out.flush()
            
            if not os.path.exists(path):
                out.write("FILE NOT FOUND!\n\n")
                out.flush()
                continue
                
            img = cv2.imread(path)
            h, w = img.shape[:2]
            out.write(f"Dimensions: {w}x{h}\n")
            
            # Scale down if max dimension > 1500
            max_dim = 1500
            if max(h, w) > max_dim:
                scale = max_dim / float(max(h, w))
                img_scaled = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            else:
                img_scaled = img
                
            sh, sw = img_scaled.shape[:2]
            out.write(f"Processing size: {sw}x{sh}\n")
            out.flush()
            
            t0 = time.time()
            res, _ = engine(img_scaled)
            t1 = time.time()
            
            out.write(f"Inference Latency: {t1 - t0:.3f} seconds\n")
            out.write(f"Tokens Count: {len(res) if res else 0}\n")
            out.write("--- Detections ---\n")
            if res:
                for idx, r in enumerate(res):
                    box, text, conf = r
                    out.write(f"  [{idx:02d}] conf={float(conf):.2f} | '{text}'\n")
            out.write("\n")
            out.flush()
            
    print("Done! Results written to d:/sih-v2/python-service/ocr_raw_output.txt")

if __name__ == "__main__":
    run()

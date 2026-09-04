import os
import sys
import io
import time
import json
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

images_info = [
    {
        "id": "Image 1",
        "name": "Bella Vita Perfume Back Statutory Panel",
        "path": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"
    },
    {
        "id": "Image 2",
        "name": "Park Avenue Samurai Perfume Side Statutory Panel",
        "path": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"
    },
    {
        "id": "Image 3",
        "name": "Park Avenue Samurai Perfume Front PDP Panel",
        "path": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"
    },
    {
        "id": "Image 4",
        "name": "Surf Excel Easy Wash Front PDP Panel",
        "path": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"
    },
    {
        "id": "Image 5",
        "name": "Surf Excel Easy Wash Back Statutory Panel",
        "path": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"
    }
]

def benchmark_live_detection():
    client = app.test_client()
    results = []

    print("=" * 80)
    print("LIVE IMAGE DETECTION BENCHMARK ON 5 USER PACKAGING IMAGES")
    print("=" * 80)

    for item in images_info:
        img_path = item["path"]
        print(f"\n--- Testing {item['id']}: {item['name']} ---")
        if not os.path.exists(img_path):
            print(f"ERROR: File not found at {img_path}")
            continue

        raw_img = cv2.imread(img_path)
        if raw_img is None:
            print(f"ERROR: Failed to load image at {img_path}")
            continue

        h, w = raw_img.shape[:2]
        print(f"Original Resolution: {w}x{h}")

        # Simulate camera downscaled stream frame (e.g. 640x360 or 1280x720) as sent by WebcamScanner.tsx
        scale = 640.0 / max(h, w)
        sim_w, sim_h = int(w * scale), int(h * scale)
        sim_frame = cv2.resize(raw_img, (sim_w, sim_h), interpolation=cv2.INTER_LINEAR)
        _, buf = cv2.imencode('.jpg', sim_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])

        # 1. Test /api/v2/cv/check-frame
        t0 = time.time()
        res_check = client.post(
            '/api/v2/cv/check-frame',
            data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')},
            content_type='multipart/form-data'
        )
        t_check_ms = (time.time() - t0) * 1000.0
        check_data = res_check.get_json() if res_check.status_code == 200 else {}

        # 2. Test /api/v2/cv/live-stream-ocr
        t1 = time.time()
        res_live = client.post(
            '/api/v2/cv/live-stream-ocr',
            data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')},
            content_type='multipart/form-data'
        )
        t_live_ms = (time.time() - t1) * 1000.0
        live_data = res_live.get_json() if res_live.status_code == 200 else {}

        item_result = {
            "id": item["id"],
            "name": item["name"],
            "original_dim": f"{w}x{h}",
            "stream_dim": f"{sim_w}x{sim_h}",
            "check_frame_latency_ms": round(t_check_ms, 2),
            "live_stream_latency_ms": round(t_live_ms, 2),
            "check_frame": check_data,
            "live_ocr": live_data
        }
        results.append(item_result)

        print(f"Check-Frame Latency: {t_check_ms:.1f}ms | Blur Status: {check_data.get('is_blurry')} (Focus: {check_data.get('focus_measure'):.1f})")
        print(f"Live-Stream Latency: {t_live_ms:.1f}ms")
        if live_data:
            obj = live_data.get("object", {})
            barcode = live_data.get("barcode")
            feats = live_data.get("features", [])
            print(f"  Object Detection: Detected={obj.get('detected')}, Box={obj.get('box')}, Label='{obj.get('label')}'")
            print(f"  Brand Name: {live_data.get('brand_name')}")
            print(f"  Statutory Count: {live_data.get('statutory_count')} fields {live_data.get('statutory_categories')}")
            print(f"  Barcode: Detected={barcode is not None and barcode.get('detected')}, Data={barcode.get('code') if barcode else 'None'}")
            print(f"  Extracted HUD Bounding Boxes ({len(feats)} total):")
            for f in feats[:6]:
                print(f"    - [{f['category'].upper()}]: '{f['text'][:30]}' @ box={f['box']}")

    with open("python-service/live_benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nBenchmark results saved to python-service/live_benchmark_results.json")

if __name__ == '__main__':
    benchmark_live_detection()

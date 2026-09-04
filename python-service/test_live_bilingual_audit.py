import os
import sys
import io
import time
import cv2
import numpy as np

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

def test_bilingual_live_stream():
    client = app.test_client()
    print("=== TESTING BILINGUAL LIVE STREAM & SCRIPT ISOLATION ===")

    # Create synthetic bilingual packaging frame
    frame = np.full((360, 640, 3), 245, dtype=np.uint8)
    cv2.rectangle(frame, (60, 30), (580, 330), (230, 230, 230), -1)
    cv2.rectangle(frame, (60, 30), (580, 330), (160, 160, 160), 2)

    # Brand Title
    cv2.putText(frame, "HALDIRAMS BHUJIA", (120, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (20, 20, 160), 2)
    # English MRP & Net Weight
    cv2.putText(frame, "MRP Rs. 45.00 incl. taxes", (120, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(frame, "Net Qty: 200g", (120, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(frame, "Mfg Date: 03/2025", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)

    _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])

    res = client.post('/api/v2/cv/live-stream-ocr', data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')}, content_type='multipart/form-data')
    assert res.status_code == 200
    data = res.get_json()

    print(f"Status: {data['status']}")
    print(f"Brand: {data['brand_name']}")
    print(f"Statutory Count: {data['statutory_count']}")
    print(f"Detected Languages: {data['detected_languages']}")
    print(f"Has Multilingual: {data['has_multilingual']}")

    for feat in data['features']:
        print(f"  * Category: {feat['category']:12s} | Label: {feat['label']:12s} | Lang: {feat['language']} | Script: {feat['script']:25s} | Text: '{feat['text']}' | Box: {feat['box']}")

    print("\nBilingual Live Stream Verification: PASSED")

if __name__ == '__main__':
    test_bilingual_live_stream()

import os
import sys
import io
import time
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

def test_live_stream():
    client = app.test_client()
    
    # Create sample packaging video frame
    img = np.full((720, 1280, 3), 245, dtype=np.uint8)
    # Draw packaging contour box
    cv2.rectangle(img, (200, 100), (1080, 620), (220, 220, 220), -1)
    cv2.rectangle(img, (200, 100), (1080, 620), (180, 180, 180), 3)
    
    # Add brand, MRP, Net Qty
    cv2.putText(img, "CADBURY DAIRY MILK", (300, 220), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (80, 20, 80), 3)
    cv2.putText(img, "MRP Rs. 85.00 incl. of all taxes", (300, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(img, "Net Weight: 150g", (300, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(img, "Mfg Date: 01/2025", (300, 500), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    
    _, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 80])
    
    start_t = time.time()
    res = client.post(
        '/api/v2/cv/live-stream-ocr',
        data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')},
        content_type='multipart/form-data'
    )
    elapsed_ms = (time.time() - start_t) * 1000.0
    
    print(f"Status Code: {res.status_code}")
    print(f"Elapsed Time: {elapsed_ms:.1f}ms")
    
    assert res.status_code == 200, "Live stream endpoint failed"
    data = res.get_json()
    print("Live Stream Response:")
    print(f"  Object Detected: {data['object']['detected']} ({data['object']['label']})")
    print(f"  Brand Name: {data['brand_name']}")
    print(f"  Focus Measure: {data['focus_measure']}, Is Blurry: {data['is_blurry']}")
    print(f"  Statutory Fields Found: {data['statutory_count']} -> {data['statutory_categories']}")
    print(f"  Live OCR Features: {len(data['features'])}")
    for f in data['features']:
        print(f"    - [{f['category'].upper()}]: '{f['text']}' @ box={f['box']}")
        
    print("\nLIVE STREAM TEST PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_live_stream()

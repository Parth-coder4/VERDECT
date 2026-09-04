import os
import sys
import io

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app

def test_three_images():
    client = app.test_client()
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../server/uploads'))
    
    # Check for images in upload_dir
    files = [f for f in os.listdir(upload_dir) if f.endswith('.jpg') or f.endswith('.png')]
    print(f"Available upload files: {files[:5]}")
    
    if len(files) < 3:
        # Create 3 dummy test images using cv2
        import cv2
        import numpy as np
        dummy1 = np.full((600, 800, 3), 255, dtype=np.uint8)
        cv2.putText(dummy1, "BRAND NAME 100g", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        dummy2 = np.full((600, 800, 3), 255, dtype=np.uint8)
        cv2.putText(dummy2, "MRP Rs. 50.00 incl. of all taxes", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        cv2.putText(dummy2, "Mfg Date: 01/2025", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        dummy3 = np.full((600, 800, 3), 255, dtype=np.uint8)
        cv2.putText(dummy3, "Mfg by ABC Ltd, Mumbai 400001", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        cv2.putText(dummy3, "Consumer Care: 1800-11-2233", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        _, buf1 = cv2.imencode('.jpg', dummy1)
        _, buf2 = cv2.imencode('.jpg', dummy2)
        _, buf3 = cv2.imencode('.jpg', dummy3)
        
        data = {
            'front_image': (io.BytesIO(buf1.tobytes()), 'front.jpg'),
            'back_image_0': (io.BytesIO(buf2.tobytes()), 'back.jpg'),
            'back_image_1': (io.BytesIO(buf3.tobytes()), 'side.jpg'),
        }
    else:
        with open(os.path.join(upload_dir, files[0]), 'rb') as f1, \
             open(os.path.join(upload_dir, files[1]), 'rb') as f2, \
             open(os.path.join(upload_dir, files[2]), 'rb') as f3:
            data = {
                'front_image': (io.BytesIO(f1.read()), files[0]),
                'back_image_0': (io.BytesIO(f2.read()), files[1]),
                'back_image_1': (io.BytesIO(f3.read()), files[2]),
            }

    print("Posting 3 images to /api/v2/cv/extract...")
    res = client.post('/api/v2/cv/extract', data=data, content_type='multipart/form-data')
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        json_data = res.get_json()
        print(f"Overall Verdict: {json_data.get('overallVerdict')}")
        print(f"Compliance Rate: {json_data.get('complianceRate')}%")
        print(f"Panels count: {json_data.get('panelsCount')}")
        print(f"Extracted features count: {len(json_data.get('extracted_features', []))}")
        print(f"Rule Evaluations count: {len(json_data.get('ruleEvaluations', []))}")
        for ev in json_data.get('ruleEvaluations', []):
            print(f"  - {ev.get('title')}: {ev.get('status')} ({ev.get('detectedValue')})")
    else:
        print(f"Error Response: {res.get_data(as_text=True)}")

if __name__ == '__main__':
    test_three_images()

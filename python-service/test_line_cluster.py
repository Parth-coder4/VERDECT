import cv2
import easyocr
import numpy as np
import os
import re

reader = easyocr.Reader(['en'], gpu=False)

def cluster_tokens_into_lines(raw_results, height, width):
    """
    Groups adjacent word bounding boxes on the same horizontal line into coherent sentences/lines.
    """
    valid_items = []
    for item in raw_results:
        box = item[0]
        text = str(item[1]).strip()
        conf = float(item[2])
        if len(text) == 0 or conf < 0.15:
            continue
        
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        
        valid_items.append({
            'text': text,
            'conf': conf,
            'xmin': xmin,
            'ymin': ymin,
            'xmax': xmax,
            'ymax': ymax,
            'yc': (ymin + ymax) / 2.0,
            'h': ymax - ymin,
            'w': xmax - xmin
        })

    # Sort vertically top to bottom, then horizontally left to right
    valid_items.sort(key=lambda item: item['ymin'])
    
    # Cluster into lines
    lines = []
    used = [False] * len(valid_items)
    
    for i, it in enumerate(valid_items):
        if used[i]:
            continue
        current_line = [it]
        used[i] = True
        
        for j in range(i + 1, len(valid_items)):
            if used[j]:
                continue
            other = valid_items[j]
            # Check if vertically aligned on same text line
            vert_diff = abs(it['yc'] - other['yc'])
            max_h = max(it['h'], other['h'], 10)
            
            if vert_diff < max_h * 0.65:
                # Check horizontal closeness
                # Either other is to the right of it or close
                current_line.append(other)
                used[j] = True
        
        # Sort words in line from left to right
        current_line.sort(key=lambda x: x['xmin'])
        
        line_text = " ".join([x['text'] for x in current_line])
        l_xmin = min([x['xmin'] for x in current_line])
        l_ymin = min([x['ymin'] for x in current_line])
        l_xmax = max([x['xmax'] for x in current_line])
        l_ymax = max([x['ymax'] for x in current_line])
        avg_conf = sum([x['conf'] for x in current_line]) / len(current_line)
        
        lines.append({
            'text': line_text,
            'confidence': round(avg_conf, 3),
            'box': [
                round(l_ymin / height, 4),
                round(l_xmin / width, 4),
                round(l_ymax / height, 4),
                round(l_xmax / width, 4)
            ]
        })
        
    return lines

img = cv2.imread('d:/sih-v2/server/uploads/scan_1787861749589_9883.jpg')
h, w = img.shape[:2]
raw = reader.readtext(img, text_threshold=0.2, low_text=0.2, link_threshold=0.3)
lines = cluster_tokens_into_lines(raw, h, w)
print("=== Clustered Lines on Dairy Milk ===")
for l in lines:
    print(f"Text: '{l['text']}' | Conf: {l['confidence']} | Box: {l['box']}")

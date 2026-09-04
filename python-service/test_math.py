import cv2

def rotate_point(x, y, h, w, rot_code):
    if rot_code == None:
        return x, y
    elif rot_code == cv2.ROTATE_90_CLOCKWISE:
        return h - 1 - y, x
    elif rot_code == cv2.ROTATE_90_COUNTERCLOCKWISE:
        return y, w - 1 - x
    elif rot_code == cv2.ROTATE_180:
        return w - 1 - x, h - 1 - y

def unrotate_point(X, Y, h, w, rot_code):
    # X, Y are coordinates in the rotated image.
    # h, w are the ORIGINAL image dimensions.
    if rot_code == None:
        return X, Y
    elif rot_code == cv2.ROTATE_90_CLOCKWISE:
        return Y, h - 1 - X
    elif rot_code == cv2.ROTATE_90_COUNTERCLOCKWISE:
        return w - 1 - Y, X
    elif rot_code == cv2.ROTATE_180:
        return w - 1 - X, h - 1 - Y

# Test it
h, w = 100, 200
x, y = 10, 20
X, Y = rotate_point(x, y, h, w, cv2.ROTATE_90_CLOCKWISE)
x2, y2 = unrotate_point(X, Y, h, w, cv2.ROTATE_90_CLOCKWISE)
print(f"CW: Original {(x,y)} -> Rotated {(X,Y)} -> Unrotated {(x2,y2)}")

X, Y = rotate_point(x, y, h, w, cv2.ROTATE_90_COUNTERCLOCKWISE)
x2, y2 = unrotate_point(X, Y, h, w, cv2.ROTATE_90_COUNTERCLOCKWISE)
print(f"CCW: Original {(x,y)} -> Rotated {(X,Y)} -> Unrotated {(x2,y2)}")

import base64
import numpy as np
import cv2

def load_image_from_base64(img_str):
    try:
        if ',' in img_str:
            img_str = img_str.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print("Error al decodificar:", e)
        return None

print("Testing dummy base64")
try:
    with open("dummy.txt", "wb") as f:
        pass
except Exception:
    pass

dummy = np.zeros((10,10,3), dtype=np.uint8)
_, buffer = cv2.imencode('.jpg', dummy)
b64 = base64.b64encode(buffer).decode('utf-8')

img = load_image_from_base64(b64)
print("decoded shape:", img.shape)

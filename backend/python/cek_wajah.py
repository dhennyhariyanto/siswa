import face_recognition
import sys
import os
import json
import cv2
import numpy as np
import pickle
import time

# Usage: python cek_wajah.py <foto_login_path> <cache_file>
if len(sys.argv) < 3:
    print(json.dumps({"status": "error", "message": "Missing parameters. Usage: python cek_wajah.py <foto_login_path> <cache_file>"}))
    sys.exit(1)

foto_login_path = sys.argv[1]
CACHE_FILE = sys.argv[2]
MAX_WIDTH = 400

def process_image_cv2(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None: return None
        h, w = img.shape[:2]
        if w > MAX_WIDTH:
            ratio = MAX_WIDTH / float(w)
            new_h = int(h * ratio)
            img = cv2.resize(img, (MAX_WIDTH, new_h), interpolation=cv2.INTER_AREA)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img_rgb
    except Exception as e:
        return None

def main():
    start_time = time.time()

    if not os.path.exists(foto_login_path):
        print(json.dumps({"status": "error", "message": "File foto login tidak ditemukan."}))
        sys.exit(1)

    if not os.path.exists(CACHE_FILE):
        print(json.dumps({"status": "error", "message": "Cache wajah (.pkl) tidak ditemukan. Silakan train wajah terlebih dahulu."}))
        sys.exit(1)

    login_image = process_image_cv2(foto_login_path)
    if login_image is None:
        print(json.dumps({"status": "error", "message": "Gagal memproses file foto login."}))
        sys.exit(1)

    try:
        login_encodings = face_recognition.face_encodings(login_image)
        if len(login_encodings) == 0:
            print(json.dumps({"status": "error", "message": "Wajah tidak terdeteksi pada foto."}))
            sys.exit(1)
        
        login_encoding_to_check = login_encodings[0]

        with open(CACHE_FILE, "rb") as f:
            data = pickle.load(f)
        
        if not data.get("encodings"):
            print(json.dumps({"status": "error", "message": "Data wajah kosong. Silakan upload dan train wajah terlebih dahulu."}))
            sys.exit(1)

        distances = face_recognition.face_distance(data["encodings"], login_encoding_to_check)
        best_match_index = np.argmin(distances)
        best_match_distance = distances[best_match_index]

        end_time = time.time()
        durasi = end_time - start_time
        info_waktu = f"(Proses: {durasi:.4f} detik)"

        # Threshold standard 0.50 (lower is better match)
        if best_match_distance < 0.50: 
            nik_ketemu = data["niks"][best_match_index]
            print(json.dumps({
                "status": "success", 
                "nik": nik_ketemu, 
                "distance": float(best_match_distance),
                "message": f"Wajah dikenali! {info_waktu}"
            }))
        else:
            print(json.dumps({
                "status": "error", 
                "distance": float(best_match_distance),
                "message": f"Wajah tidak cocok. {info_waktu}"
            }))

    except Exception as e:
        print(json.dumps({"status": "error", "message": "System Error: " + str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
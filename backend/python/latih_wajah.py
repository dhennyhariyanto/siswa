import face_recognition
import os
import pickle
import sys
import cv2
import numpy as np

# Usage: python latih_wajah.py <faces_dir> <cache_file>
if len(sys.argv) < 3:
    print("Error: Missing parameters. Usage: python latih_wajah.py <faces_dir> <cache_file>")
    sys.exit(1)

FACES_DIR = sys.argv[1]
CACHE_FILE = sys.argv[2]

def process_image_cv2(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None: return None
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img_rgb
    except Exception as e:
        return None

def main():
    print("--- MEMULAI PROSES TRAINING WAJAH ---")
    if not os.path.exists(FACES_DIR):
        print(f"Error: Folder {FACES_DIR} tidak ditemukan.")
        sys.exit(1)

    known_encodings = []
    known_niks = []
    
    files = os.listdir(FACES_DIR)
    total_files = len(files)
    processed = 0
    success = 0
    
    for filename in files:
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            processed += 1
            path = os.path.join(FACES_DIR, filename)
            try:
                image = process_image_cv2(path)
                if image is None: continue

                encodings = face_recognition.face_encodings(image)
                if len(encodings) > 0:
                    # Get NIK/ID from filename prefix (e.g. 5001_1.jpg or siswa_1.jpg -> siswa_1)
                    nik = os.path.splitext(filename)[0]
                    known_encodings.append(encodings[0])
                    known_niks.append(nik)
                    success += 1
            except Exception as e:
                print(f"Gagal {filename}: {e}")
                continue

    data = {"encodings": known_encodings, "niks": known_niks}
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "wb") as f:
            pickle.dump(data, f)
        print(f"SUKSES! {success} wajah berhasil disimpan ke {CACHE_FILE}")
    except Exception as e:
        print(f"GAGAL MENYIMPAN CACHE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
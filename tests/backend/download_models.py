import requests
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(r"c:\Users\Divyansh Gupta\OneDrive\Desktop\Viva_Agent\APP\backend")
target_dir = ROOT_DIR / "models"
target_dir.mkdir(parents=True, exist_ok=True)

expected_files = {
    "kokoro-v0_19.onnx": {
        "url": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx",
        "min_size": 300 * 1024 * 1024 
    },
    "voices.json": {
        "url": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.json",
        "min_size": 100 * 1024 
    }
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for name, info in expected_files.items():
    target = target_dir / name
    if target.exists() and target.stat().st_size >= info["min_size"]:
        print(f"{name} already exists and is valid.")
        continue
    
    print(f"Downloading {name} from {info['url']}...")
    try:
        with requests.get(info["url"], stream=True, allow_redirects=True, headers=headers, timeout=180) as r:
            r.raise_for_status()
            with open(target, 'wb') as f:
                downloaded = 0
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if downloaded % (10 * 1024 * 1024) == 0:
                            print(f"Progress: {downloaded // (1024*1024)}MB")
        print(f"{name} download complete.")
    except Exception as e:
        print(f"Failed to download {name}: {e}")
        if target.exists(): target.unlink()

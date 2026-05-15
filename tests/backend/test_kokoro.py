import sys
from pathlib import Path
import traceback

try:
    from kokoro_onnx import Kokoro
    model_path = r"c:\Users\Divyansh Gupta\OneDrive\Desktop\Viva_Agent\APP\backend\models\kokoro-v0_19.onnx"
    voices_path = r"c:\Users\Divyansh Gupta\OneDrive\Desktop\Viva_Agent\APP\backend\models\voices.bin"
    
    print(f"Attempting to initialize Kokoro with:")
    print(f"Model: {model_path}")
    print(f"Voices: {voices_path}")
    
    kokoro = Kokoro(model_path, voices_path)
    print("Success!")
except Exception as e:
    print("FAILED")
    traceback.print_exc()

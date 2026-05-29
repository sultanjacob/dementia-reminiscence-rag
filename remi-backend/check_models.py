import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load your exact API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_KEY"))

print("--- YOUR AVAILABLE AI MODELS ---")
for m in genai.list_models():
    # Only show models that can generate text/audio and contain 'flash'
    if 'generateContent' in m.supported_generation_methods and 'flash' in m.name:
        print(m.name)
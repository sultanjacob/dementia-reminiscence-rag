from fastapi import FastAPI
import uvicorn
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# 1. LOAD THE SECRET KEY SAFELY
load_dotenv("keys.env") 
api_key = os.getenv("GEMINI_API_KEY") 
genai.configure(api_key=api_key)

# --- AUTO-DETECT LOGIC ---
working_model = 'gemini-1.5-flash' # Default fallback
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            working_model = m.name
            break
    print(f"✅ Google API accepted! Remi is using: {working_model}")
except Exception as e:
    print(f"❌ API Key Error: {e}")

model = genai.GenerativeModel(working_model)

# 2. INITIALIZE FASTAPI (This was the missing line!)
app = FastAPI()

# Point to your project folder
PROFILES_DIR = r"D:\MLP\dementia-reminiscence-rag\profiles"

@app.get("/")
def health_check():
    return {"status": "online", "message": "Remi is Listening"}

@app.get("/login/{patient_id}")
def login(patient_id: str):
    patient_id = patient_id.lower().strip()
    bio_path = os.path.join(PROFILES_DIR, f"{patient_id}_bio.json")
    if os.path.exists(bio_path):
        with open(bio_path, "r", encoding="utf-8") as f:
            return {"status": "success", "data": json.load(f)}
    return {"status": "error", "message": "Profile not found"}

# 3. THE CHAT ENDPOINT
@app.get("/chat/{patient_id}")
def chat(patient_id: str, user_message: str):
    try:
        # Load Bio
        bio_path = os.path.join(PROFILES_DIR, f"{patient_id.lower()}_bio.json")
        if not os.path.exists(bio_path):
            return {"error": "Profile not found"}
            
        with open(bio_path, "r", encoding="utf-8") as f:
            profile = json.load(f)
        
        # Create Dynamic Instruction
        name = profile.get('display_name', 'User')
        career = profile.get('biography', {}).get('career', 'their past')
        memories = ", ".join(profile.get('core_memories', []))
        
        system_prompt = f"You are Remi, a kind companion for {name}, who was an {career}. Memories: {memories}. Be brief and warm."
        
        # Call Gemini
        response = model.generate_content(f"{system_prompt}\n\nUser says: {user_message}")
        return {"remi_says": response.text}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
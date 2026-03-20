from fastapi import FastAPI, Form
import uvicorn
import os
import json
import google.generativeai as genai

# 1. LOAD THE SECRET KEY SAFELY
from dotenv import load_dotenv

# Tell it specifically to open keys.env
load_dotenv("keys.env") 
api_key = os.getenv("GEMINI_API_KEY") 

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()
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

# 2. THE CHAT ENDPOINT (The Voice)
@app.get("/chat/{patient_id}")
def chat(patient_id: str, user_message: str):
    """
    This endpoint takes a message, loads the patient's bio, 
    and asks Gemini for a personalized response.
    """
    # Load Bio
    bio_path = os.path.join(PROFILES_DIR, f"{patient_id.lower()}_bio.json")
    with open(bio_path, "r", encoding="utf-8") as f:
        profile = json.load(f)
    
    # Create the Dynamic Instruction (from Phase 1)
    name = profile.get('display_name', 'User')
    career = profile.get('biography', {}).get('career', 'their past')
    memories = ", ".join(profile.get('core_memories', []))
    
    system_prompt = f"You are Remi, a kind companion for {name}, who was an {career}. Memories: {memories}. Be brief and warm."
    
    # Call Gemini
    response = model.generate_content(f"{system_prompt}\n\nUser says: {user_message}")
    
    return {"remi_says": response.text}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
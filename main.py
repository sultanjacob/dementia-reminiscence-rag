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
working_model = 'gemini-1.5-flash'
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            working_model = m.name
            break
    print(f"✅ Google API accepted! Remi is using: {working_model}")
except Exception as e:
    print(f"❌ API Key Error: {e}")

model = genai.GenerativeModel(working_model)

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

# --- UPGRADED CHAT ENDPOINT (The Memory Writer) ---
@app.get("/chat/{patient_id}")
def chat(patient_id: str, user_message: str):
    try:
        # 1. Load Bio
        bio_path = os.path.join(PROFILES_DIR, f"{patient_id.lower()}_bio.json")
        if not os.path.exists(bio_path):
            return {"error": "Profile not found"}
            
        with open(bio_path, "r", encoding="utf-8") as f:
            profile = json.load(f)
        
        name = profile.get('display_name', 'User')
        career = profile.get('biography', {}).get('career', 'their past')
        memories = ", ".join(profile.get('core_memories', []))
        
        # 2. The "Detective" Instruction for Gemini
        system_prompt = f"""You are Remi, a kind companion for {name}, who was an {career}.
        Current Memories: {memories}.
        
        You have TWO jobs:
        1. Respond to the user briefly and warmly.
        2. If the user shares a NEW personal fact or memory (e.g. "I owned a dog named Max"), extract it. If they don't, leave it blank.
        
        You MUST respond strictly in valid JSON format like this:
        {{"reply": "Your conversational response here", "new_memory": "The extracted memory, or empty string if none"}}
        """
        
        # 3. Call Gemini
        response = model.generate_content(f"{system_prompt}\n\nUser says: {user_message}")
        
        # 4. Clean and parse the JSON response
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3].strip()
            
        gemini_data = json.loads(raw_text)
        remi_reply = gemini_data.get("reply", "I am here for you.")
        new_memory = gemini_data.get("new_memory", "")
        
        # 5. THE MEMORY WRITER
        if new_memory and new_memory.lower() not in ["null", "none", "false", ""]:
            # Add it to the list
            if "core_memories" not in profile:
                profile["core_memories"] = []
            profile["core_memories"].append(new_memory)
            
            # Save it permanently to the hard drive!
            with open(bio_path, "w", encoding="utf-8") as f:
                json.dump(profile, f, indent=4)
                
            print(f"💾 NEW MEMORY SAVED FOR {name}: {new_memory}")

        # Send only the conversational text back to the Streamlit Face
        return {"remi_says": remi_reply}
        
    except Exception as e:
        print(f"Error parsing memory: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
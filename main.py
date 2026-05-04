import os
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# FastAPI Imports
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# Service Imports
import google.generativeai as genai
from supabase import create_client, Client

# --- 1. SETUP & CONFIGURATION ---
env_path = Path('.') / 'keys.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print("--- 🔑 Key Check ---")
print(f"SUPABASE_URL: {'✅ Found' if SUPABASE_URL else '❌ NOT FOUND'}")
print(f"SUPABASE_KEY: {'✅ Found' if SUPABASE_KEY else '❌ NOT FOUND'}")
print(f"GEMINI_KEY:   {'✅ Found' if GEMINI_API_KEY else '❌ NOT FOUND'}")
print("--------------------")

# Initialize Services
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# --- 2. INITIALIZE APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. HELPER FUNCTIONS ---
async def get_full_context(user_id: str):
    try:
        mem_res = supabase.table("memories").select("description").eq("user_id", user_id).execute()
        memories = [row['description'] for row in mem_res.data]
        rout_res = supabase.table("routines").select("time, activity").eq("user_id", user_id).execute()
        routines = [f"At {r['time']}, {r['activity']}" for r in rout_res.data]
        
        context = "FAMILY MEMORIES:\n" + ("\n".join(memories) if memories else "None.")
        context += "\n\nDAILY ROUTINE:\n" + ("\n".join(routines) if routines else "None.")
        return context
    except:
        return "No context found."

# --- 4. ENDPOINTS ---

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...), user_id: str = Form("anonymous")):
    print(f"🎤 Voice received for User: {user_id}")
    try:
        audio_contents = await file.read()
        
        # 1. FETCH CONTEXT FIRST (Fixed the order issue)
        context = await get_full_context(user_id) 
        
        # 2. Use a guaranteed model name locally just for this call
        # Some library versions prefer 'models/gemini-1.5-flash'
        voice_model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"You are Remi, a warm companion. Context: {context}. Respond to the voice message warmly and briefly."

        # 3. Use the correct multimodal list format [text, audio]
        response = voice_model.generate_content([
            prompt,
            {"mime_type": "audio/mp4", "data": audio_contents}
        ])
        
        print(f"🤖 Remi says: {response.text}")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error Detail: {e}") # This helps you see EXACTLY why it failed in the terminal
        return {"message": "I'm having a little trouble thinking clearly right now."}
@app.get("/check-routine")
async def check_routine(user_id: str = None):
    print(f"🕒 Checking schedule for: {user_id}")
    try:
        now = datetime.now().strftime("%H:%M")
        res = supabase.table("routines").select("*").eq("user_id", user_id).execute()
        schedule_text = "\n".join([f"{i['time']}: {i['activity']}" for i in res.data])
        prompt = f"Time: {now}. Schedule: {schedule_text}. Tell the user what is next."
        ai_res = model.generate_content(prompt)
        return {"message": ai_res.text}
    except Exception as e:
        return {"message": "I can't see the clock right now."}

@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...), user_id: str = Form("anonymous")):
    try:
        contents = await image.read()
        context = await get_full_context(user_id)
        prompt = f"Context: {context}. Identify the item in this photo warmly as Remi."
        res = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": contents}])
        return {"message": res.text}
    except:
        return {"message": "My eyes are a bit blurry."}

@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(""), user_id: str = Form(...)):
    try:
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        contents = await image.read()
        supabase.storage.from_("photos").upload(path=unique_name, file=contents)
        public_url = supabase.storage.from_("photos").get_public_url(unique_name)
        supabase.table("memories").insert({"description": description, "image_url": public_url, "user_id": user_id}).execute()
        return {"message": "Memory saved!"}
    except Exception as e:
        return {"message": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
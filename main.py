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
        # 1. Read the audio data sent from the phone
        audio_contents = await file.read()
        
        # 2. Get the current local time of the server
        # This ensures Remi knows if it's morning, afternoon, or night
        local_time = datetime.now().strftime("%I:%M %p") 
        
        # 3. Fetch the user's personal memories and routines from Supabase
        context = await get_full_context(user_id) 
        
        # 4. Use the Gemini 3 model that we confirmed is available to you
        voice_model = genai.GenerativeModel('gemini-3-flash-preview')

        # 5. Create the prompt with the new time variable
        prompt = f"""
        You are Remi, a warm and patient companion for someone with dementia. 
        The current local time is {local_time}. 
        
        Use this context to help the user if they sound confused:
        {context}
        
        Respond to the user's voice message warmly and very briefly (max 2 sentences).
        """

        # 6. Send both the instructions and the audio to the AI
        response = voice_model.generate_content([
            prompt,
            {"mime_type": "audio/mp4", "data": audio_contents}
        ])
        
        print(f"🤖 Remi says: {response.text}")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error Detail: {e}")
        return {"message": "I'm here and I'm listening, but I'm having a little trouble thinking clearly."}
@app.get("/check-routine")
async def check_routine(user_id: str = None):
    print(f"🕒 Checking schedule for: {user_id}")
    try:
        now = datetime.now().strftime("%I:%M %p")
        
        # Fetch routines from Supabase
        res = supabase.table("routines").select("*").eq("user_id", user_id).execute()
        
        if not res.data:
            # If no routine is found, Remi should still be helpful
            prompt = f"It is {now}. The user has no scheduled activities. Tell them there is nothing on the calendar and wish them a lovely day."
        else:
            schedule_text = "\n".join([f"{i['time']}: {i['activity']}" for i in res.data])
            prompt = f"Current Time: {now}. User's Schedule:\n{schedule_text}\n\nTell the user what is coming up next based on the time."

        # Use the Gemini 3 model we know works
        voice_model = genai.GenerativeModel('gemini-3-flash-preview')
        ai_res = voice_model.generate_content(prompt)
        
        print(f"🤖 Remi schedule response: {ai_res.text}")
        return {"message": ai_res.text}
        
    except Exception as e:
        print(f"❌ Schedule Error: {e}")
        return {"message": "I'm having a little trouble seeing the calendar, but I'm right here with you."}
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
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. SETUP ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'keys.env'))

# --- 2. INITIALIZE APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. CLOUD & AI CONFIGURATION ---
SUPABASE_URL = "https://bphmzxsidlxfawqkvksr.supabase.co"
SUPABASE_KEY = "sb_publishable_-RYTM7gdaV_1IE3d6F9GNQ_OEoAH3lY"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
# Using gemini-1.5-flash for speed and multimodal (voice/image) support
model = genai.GenerativeModel('gemini-1.5-flash')

# --- 4. HELPER FUNCTIONS ---

async def get_full_context(user_id: str):
    """Fetches both memories and routines for a complete brain context."""
    # Fetch Memories
    mem_res = supabase.table("memories").select("description").eq("user_id", user_id).execute()
    memories = [row['description'] for row in mem_res.data]
    
    # Fetch Routines
    rout_res = supabase.table("routines").select("time, activity").eq("user_id", user_id).execute()
    routines = [f"At {r['time']}, {r['activity']}" for r in rout_res.data]
    
    context = "FAMILY MEMORIES:\n" + "\n".join(memories)
    context += "\n\nDAILY ROUTINE:\n" + "\n".join(routines)
    return context

# --- 5. ENDPOINTS ---

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...), user_id: str = Form(...)):
    """Receives audio, transcribes it, and responds as Remi."""
    try:
        audio_contents = await file.read()
        context = await get_full_context(user_id)
        
        prompt = f"""
        You are Remi, a gentle companion for someone with dementia. 
        Use this context to help them remember:
        {context}
        
        The user has spoken to you. Listen to the audio and respond warmly.
        Keep it brief and comforting.
        """

        # Gemini can process audio bytes directly
        res = model.generate_content([
            prompt,
            {"mime_type": "audio/m4a", "data": audio_contents}
        ])
        
        return {"message": res.text}
    except Exception as e:
        print(f"Voice Error: {e}")
        return {"message": "I'm listening, but I'm having trouble thinking clearly."}

@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...), user_id: str = Form("anonymous")):
    try:
        contents = await image.read()
        context = await get_full_context(user_id)

        prompt = f"""
        Identify the item or person in this photo using these memories and routine: 
        {context}
        
        Speak as Remi. If you recognize a family member, be very happy. 
        If you don't recognize it, describe it warmly.
        """
        
        res = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        return {"message": res.text}
    except Exception as e:
        return {"message": "Remi's eyes are a bit blurry right now."}

@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(""), user_id: str = Form(...)):
    try:
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        contents = await image.read()

        # Upload to Supabase Storage
        supabase.storage.from_("photos").upload(
            path=unique_name,
            file=contents,
            file_options={"content-type": f"image/{file_ext}"}
        )

        public_url = supabase.storage.from_("photos").get_public_url(unique_name)

        # Save to Database
        supabase.table("memories").insert({
            "description": description,
            "image_url": public_url,
            "user_id": user_id
        }).execute()

        return {"message": "I have tucked that memory away in my heart."}
    except Exception as e:
        return {"message": f"I couldn't save that memory: {str(e)}"}

@app.get("/get-memories")
async def get_memories(user_id: str):
    try:
        response = supabase.table("memories").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"memories": response.data}
    except Exception as e:
        return {"error": str(e), "memories": []}

@app.get("/check-routine")
async def check_routine(user_id: str = "anonymous"):
    print(f"🕒 Routine check requested for: {user_id}")
    try:
        now = datetime.now().strftime("%H:%M")
        
        # 1. Fetch routines from Supabase
        response = supabase.table("routines").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            return {"message": "I don't see anything on your schedule right now, but I'm right here if you need me."}

        # 2. Build the schedule context
        schedule = ", ".join([f"{item['time']} is {item['activity']}" for item in response.data])
        
        prompt = f"""
        You are Remi, a gentle companion. The time is {now}. 
        The user's schedule is: {schedule}.
        Briefly and warmly remind them of what's happening now or next.
        """
        
        res = model.generate_content(prompt)
        print(f"🤖 Remi schedule response: {res.text}")
        return {"message": res.text}
        
    except Exception as e:
        print(f"❌ ROUTINE ERROR: {str(e)}")
        return {"message": "I'm having a little trouble seeing the clock, but it's a lovely day to be with you."}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
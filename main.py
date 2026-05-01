import google.generativeai as genai
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. SETUP ---
# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# DEFINE MODEL HERE - Try this naming convention
model = genai.GenerativeModel('gemini-1.5-flash')
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
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# This looks for the .env file and loads the variables
load_dotenv()

# We pull them into variables using os.getenv
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize the services
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

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
async def voice_chat(file: UploadFile = File(...), user_id: str = Form("anonymous")):
    print(f"🎤 Voice received from user: {user_id}")
    try:
        audio_contents = await file.read()
        context = await get_full_context(user_id) 
        
        # Use the global 'model' defined above
        prompt = f"""
        You are Remi, a warm companion. 
        Context for this user: {context}
        Respond to the user's voice message briefly and warmly.
        """

        # Gemini 1.5 Flash supports audio directly
        response = model.generate_content([
            prompt,
            {"mime_type": "audio/mp4", "data": audio_contents}
        ])
        
        print(f"🤖 Remi response: {response.text}")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ VOICE ERROR DETAIL: {str(e)}")
        # If the error is still a 404, we'll try a fallback naming convention
        return {"message": "I'm here, but I'm having a little trouble with my memory banks."}
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

# 1. Update the model definition (Try 'gemini-1.5-flash-latest')
model = genai.GenerativeModel('gemini-1.5-flash-latest')

# ... then inside your check_routine function ...

@app.get("/check-routine")
async def check_routine(user_id: str = None):
    print(f"🕒 Checking schedule for User: {user_id}")
    try:
        now = datetime.now().strftime("%H:%M")
        response = supabase.table("routines").select("*").execute()
        
        # Filter for the user
        user_tasks = [r for r in response.data if r.get('user_id') == user_id]
        final_tasks = user_tasks if user_tasks else response.data

        if not final_tasks:
            return {"message": "I don't see anything on the schedule yet."}

        print(f"✅ Found {len(final_tasks)} tasks. Sending to Gemini...")
        
        schedule_text = "\n".join([f"{item['time']}: {item['activity']}" for item in final_tasks])
        
        prompt = f"You are Remi, a warm companion. The time is {now}. Here is the schedule: {schedule_text}. Briefly tell the user what is next."

        # 2. Add a small retry/safety check here
        res = model.generate_content(prompt)
        
        print(f"🤖 Remi says: {res.text}")
        return {"message": res.text}
        
    except Exception as e:
        print(f"❌ ROUTINE ERROR: {str(e)}")
        # If the specific model fails, let's see if the base name works as a fallback
        return {"message": "I'm having a little trouble thinking, but I'm here with you."}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
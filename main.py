import os
import uuid
from datetime import datetime
from path lib import Path # Add this to help find files
from dotenv import load_dotenv

# --- 1. SETUP & CONFIGURATION ---

# This forces Python to look in the current folder for a file named '.env'
# If your file is named 'keys.env', change '.env' to 'keys.env' below
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

# Pull variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# DEBUG PRINT: This helps us see if the keys loaded
print(f"Checking keys: URL={'✅' if SUPABASE_URL else '❌'}, Key={'✅' if SUPABASE_KEY else '❌'}")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL not found! Check if your .env file is in the same folder as main.py")

# ... rest of your code ...

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini with the stable 1.5 Flash model
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
    """Fetches both memories and routines for a complete brain context."""
    try:
        # Fetch Memories
        mem_res = supabase.table("memories").select("description").eq("user_id", user_id).execute()
        memories = [row['description'] for row in mem_res.data]
        
        # Fetch Routines
        rout_res = supabase.table("routines").select("time, activity").eq("user_id", user_id).execute()
        routines = [f"At {r['time']}, {r['activity']}" for r in rout_res.data]
        
        context = "FAMILY MEMORIES:\n" + ("\n".join(memories) if memories else "None saved yet.")
        context += "\n\nDAILY ROUTINE:\n" + ("\n".join(routines) if routines else "No routine set yet.")
        return context
    except Exception as e:
        print(f"Context Error: {e}")
        return "No specific context available."

# --- 4. ENDPOINTS ---

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...), user_id: Form(None) = None):
    # Sanitize user_id
    actual_user_id = user_id if user_id and user_id != "undefined" else "anonymous"
    print(f"🎤 Voice received for User: {actual_user_id}")
    
    try:
        if not file:
            return {"message": "I didn't hear anything."}
            
        audio_contents = await file.read()
        
        # FETCH CONTEXT FIRST (Fixed the previous scope error)
        context = await get_full_context(actual_user_id) 
        
        prompt = f"""
        You are Remi, a warm companion for someone with dementia. 
        Context for this user: {context}
        Respond to the user's voice message briefly and warmly (max 2 sentences).
        """

        # Gemini 1.5 Flash handles audio/mp4 (m4a) natively
        response = model.generate_content([
            prompt,
            {"mime_type": "audio/mp4", "data": audio_contents}
        ])
        
        print(f"🤖 Remi response: {response.text}")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ VOICE ERROR DETAIL: {str(e)}")
        return {"message": "I'm here and I'm listening, but I'm having a little trouble thinking clearly."}

@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...), user_id: str = Form("anonymous")):
    print(f"📸 Image received from user: {user_id}")
    try:
        contents = await image.read()
        context = await get_full_context(user_id)

        prompt = f"""
        Identify the item or person in this photo using these memories and routine: 
        {context}
        
        Speak as Remi. If you recognize a family member or object from memories, be very happy. 
        If you don't recognize it, describe it warmly.
        """
        
        res = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        return {"message": res.text}
    except Exception as e:
        print(f"❌ IMAGE ERROR: {e}")
        return {"message": "Remi's eyes are a bit blurry right now."}

@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(""), user_id: str = Form(...)):
    print(f"🧠 Teaching Remi new memory for: {user_id}")
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
        print(f"❌ TEACH ERROR: {e}")
        return {"message": "I couldn't save that memory right now."}

@app.get("/check-routine")
async def check_routine(user_id: str = None):
    print(f"🕒 Checking schedule for User: {user_id}")
    try:
        now = datetime.now().strftime("%H:%M")
        response = supabase.table("routines").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            return {"message": "I don't see anything on your schedule yet."}

        schedule_text = "\n".join([f"{item['time']}: {item['activity']}" for item in response.data])
        
        prompt = f"You are Remi, a warm companion. The time is {now}. Here is the schedule: {schedule_text}. Briefly tell the user what is next."

        res = model.generate_content(prompt)
        
        print(f"🤖 Remi says: {res.text}")
        return {"message": res.text}
        
    except Exception as e:
        print(f"❌ ROUTINE ERROR: {str(e)}")
        return {"message": "I'm having a little trouble checking the clock, but I'm here with you."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import google.generativeai as genai
import os
import uuid
import shutil
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client # --- NEW IMPORT ---

# --- 1. SETUP & PATHS ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'keys.env'))

UPLOAD_FOLDER = os.path.join(basedir, "memories", "photos")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- 2. INITIALIZE APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/photos", StaticFiles(directory=UPLOAD_FOLDER), name="photos")

# --- 3. CLOUD & AI CONFIGURATION ---
# Replace these with your actual keys from Supabase Settings > API
SUPABASE_URL = "https://bphmzxsidlxfawqkvksr.supabase.co"
SUPABASE_KEY = "sb_publishable_-RYTM7gdaV_1IE3d6F9GNQ_OEoAH3lY"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 4. ENDPOINTS ---

# ROUTE: ASK REMI (Text)
@app.get("/ask")
async def ask_remi(q: str = ""):
    print(f"💬 TEXT RECEIVED: {q}")
    
    # We fetch ALL memories from Supabase to give Remi context
    response = supabase.table("memories").select("description").execute()
    memories = [row['description'] for row in response.data]
    family_context = "\n".join(memories)
    
    prompt = f"""
    You are Remi, a warm and gentle companion. 
    Family memories you know: {family_context}
    
    GUIDELINES:
    1. For general small talk, respond naturally. 
    2. Only talk about specific family memories if relevant.
    3. Keep it conversational and friendly.
    User says: {q}
    """
    
    res = model.generate_content(prompt)
    return {"message": res.text}

# ROUTE: IDENTIFY PHOTO (Ask Mode)
@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        # Fetch cloud context
        response = supabase.table("memories").select("description").execute()
        family_context = "\n".join([row['description'] for row in response.data])

        prompt = f"Identify the person in this photo using these memories: {family_context}. Speak as Remi, be warm and brief."
        
        res = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        return {"message": res.text}
    except Exception as e:
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}

# ROUTE: SAVE MEMORY (Teach Mode - UPDATED FOR CLOUD)
@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(""), user_id: str = Form(...)):
    try:
        # 1. Generate a unique filename
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{user_id}/{uuid.uuid4()}.{file_ext}" # Organized by user folder!
        
        # 2. Read the image bits
        contents = await image.read()

        # 3. UPLOAD TO SUPABASE STORAGE
        # This replaces the 'with open... write' logic
        supabase.storage.from_("photos").upload(
            path=unique_name,
            file=contents,
            file_options={"content-type": f"image/{file_ext}"}
        )

        # 4. GET THE PUBLIC URL
        public_url = supabase.storage.from_("photos").get_public_url(unique_name)

        # 5. SAVE RECORD TO DATABASE
        memory_data = {
            "description": description,
            "image_url": public_url, # Now saving the FULL web link!
            "user_id": user_id
        }
        supabase.table("memories").insert(memory_data).execute()

        return {"message": "Memory saved to the cloud storage!"}
    except Exception as e:
        print(f"Error: {e}")
        return {"message": f"Cloud upload failed: {str(e)}"}
# ... (Keep imports and setup the same)

# ROUTE: IDENTIFY PHOTO (Ask Mode) - UPDATED TO FILTER BY USER
@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...), user_id: str = Form("anonymous")):
    try:
        contents = await image.read()
        
        # Fetch cloud context ONLY for this user
        response = supabase.table("memories").select("description").eq("user_id", user_id).execute()
        family_context = "\n".join([row['description'] for row in response.data])

        prompt = f"""
        Identify the item or person in this photo using these memories: 
        {family_context}
        
        If it's not in the memories, just describe what you see warmly.
        Speak as Remi, be warm and brief.
        """
        
        res = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        return {"message": res.text}
    except Exception as e:
        print(f"Error in describe-image: {e}")
        return {"message": "Remi's eyes are a bit blurry right now."}

# ROUTE: GET GALLERY - UPDATED TO FIX RENDER ERROR
@app.get("/get-memories")
async def get_memories(user_id: str):
    try:
        # 1. Fetch memories belonging ONLY to this user
        # 2. Order by newest first
        response = supabase.table("memories")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        memory_list = []
        for row in response.data:
            memory_list.append({
                # We use "image_url" to match the frontend 'item.image_url'
                "image_url": row["image_url"], 
                "description": row["description"]
            })

        return {"memories": memory_list}
    except Exception as e:
        print(f"Gallery Error: {e}")
        return {"error": str(e), "memories": []}


# ROUTE: CHECK DAILY ROUTINE (Kept local for now)
@app.get("/check-routine")
async def check_routine():
    now = datetime.now().strftime("%H:%M")
    routine_path = os.path.join(basedir, "memories", "routine.txt")
    if not os.path.exists(routine_path):
        return {"message": "I don't have a schedule set yet."}
    with open(routine_path, "r", encoding="utf-8") as file:
        routine_context = file.read()
    prompt = f"Remi here. Time: {now}. Routine: {routine_context}. Remind the user warmly of events."
    res = model.generate_content(prompt)
    return {"message": res.text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
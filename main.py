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
        # Save image locally
        contents = await image.read()
        unique_name = f"{uuid.uuid4()}_{image.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_name)
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # 2. SAVE TO SUPABASE CLOUD
        memory_data = {
            "description": description,
            "image_url": unique_name,
            "user_id": user_id
        }
        supabase.table("memories").insert(memory_data).execute()

        return {"message": f"I've tucked that memory into the cloud! I'll remember: {description}"}
    except Exception as e:
        return {"message": f"I couldn't save that to the cloud: {str(e)}"}

# ROUTE: GET GALLERY (UPDATED FOR CLOUD)
@app.get("/get-memories")
async def get_memories(user_id: str):
    # Only select memories that belong to this specific user!
    response = supabase.table("memories").select("*").eq("user_id", user_id).execute()
    # ... rest of the formatting stays the same
    try:
        # Fetch everything from the cloud table
        response = supabase.table("memories").select("*").order("created_at", desc=True).execute()
        
        memory_list = []
        for row in response.data:
            memory_list.append({
                "url": row["image_url"],
                "description": row["description"]
            })

        return {"memories": memory_list}
    except Exception as e:
        return {"error": str(e)}

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
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
        # 1. Fetch Profile Details
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        profile = profile_res.data[0] if profile_res.data else {}
        
        bio = f"""
        USER PROFILE:
        Name: {profile.get('nickname', 'User')}
        Former Job: {profile.get('former_profession', 'Unknown')}
        Hobbies: {profile.get('hobbies', 'Unknown')}
        Family: {profile.get('family_details', 'Unknown')}
        """

        # 2. Fetch Memories
        mem_res = supabase.table("memories").select("description").eq("user_id", user_id).execute()
        memories = [row['description'] for row in mem_res.data]
        
        # 3. Fetch Routines
        rout_res = supabase.table("routines").select("time, activity").eq("user_id", user_id).execute()
        routines = [f"At {r['time']}, {r['activity']}" for r in rout_res.data]
        
        context = f"{bio}\n\nMEMORIES:\n" + ("\n".join(memories) if memories else "None.")
        context += "\n\nDAILY ROUTINE:\n" + ("\n".join(routines) if routines else "None.")
        return context
    except Exception as e:
        print(f"Context Error: {e}")
        return "No specific personal details found."

# --- 4. ENDPOINTS ---

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...), user_id: str = Form("anonymous")):
    print(f"🎤 Voice received for User: {user_id}")
    try:
        audio_contents = await file.read()
        local_time = datetime.now().strftime("%I:%M %p")
        context = await get_full_context(user_id) 
        
        # Using Gemini 3 as confirmed available
        voice_model = genai.GenerativeModel('gemini-3-flash-preview')

        prompt = f"""
        You are Remi, a warm companion for someone with dementia. 
        Current time: {local_time}.
        Context: {context}
        
        INSTRUCTIONS: 
        1. Respond warmly and briefly (max 2 sentences).
        2. NEVER use asterisks (**) or symbols. 
        3. Use plain text only so it can be spoken clearly.
        """

        response = voice_model.generate_content([
            prompt,
            {"mime_type": "audio/mp4", "data": audio_contents}
        ])
        
        print(f"🤖 Remi says: {response.text}")
        return {"message": response.text}
    except Exception as e:
        print(f"❌ Voice Error: {e}")
        return {"message": "I am here and listening, but I am having a little trouble thinking clearly."}

@app.get("/check-routine")
async def check_routine(user_id: str = None):
    print(f"🕒 Checking schedule for: {user_id}")
    try:
        now = datetime.now().strftime("%I:%M %p")
        res = supabase.table("routines").select("*").eq("user_id", user_id).execute()
        
        voice_model = genai.GenerativeModel('gemini-3-flash-preview')

        if not res.data:
            prompt = f"It is {now}. The user has nothing scheduled. Tell them warmly to enjoy their time."
        else:
            schedule_text = "\n".join([f"{i['time']}: {i['activity']}" for i in res.data])
            prompt = f"""
            Current Time: {now}. 
            Schedule: {schedule_text}. 
            Tell the user what is next. 
            DO NOT use asterisks or markdown. Use plain sentences.
            """

        ai_res = voice_model.generate_content(prompt)
        print(f"🤖 Remi schedule: {ai_res.text}")
        return {"message": ai_res.text}
    except Exception as e:
        print(f"❌ Schedule Error: {e}")
        return {"message": "I cannot see the schedule right now, but I am right here with you."}

@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...), user_id: str = Form("anonymous")):
    print(f"📸 Smart Eyes activated for: {user_id}")
    try:
        contents = await image.read()
        
        # 1. Fetch the user's Profile, Memories, and Routines
        context = await get_full_context(user_id)
        
        voice_model = genai.GenerativeModel('gemini-3-flash-preview')
        
        # 2. The "Visual RAG" Prompt
        prompt = f"""
        You are Remi, helping a user with dementia identify their surroundings.
        Here is the user's personal context and memory bank:
        {context}
        
        YOUR TASK:
        1. Look carefully at the photo.
        2. Cross-reference the photo with the MEMORIES list in the context. 
        3. IF IT MATCHES A MEMORY: Identify it using the specific details from their life (e.g., "That is the beautiful blue mug your daughter gave you!").
        4. IF IT DOES NOT MATCH: Warmly and simply describe what the object is in a helpful way.
        
        RULES: 
        - Plain text only. 
        - NEVER use asterisks (**) or markdown formatting. 
        - Keep it brief, conversational, and under 2 sentences.
        """
        
        res = voice_model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        
        print(f"🤖 Remi (Eyes) says: {res.text}")
        return {"message": res.text}
        
    except Exception as e:
        print(f"❌ Image Error: {e}")
        return {"message": "My eyes are a little blurry right now, I couldn't quite see that."}
@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(""), user_id: str = Form(...)):
    print(f"🧠 Saving new memory for: {user_id}")
    try:
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        contents = await image.read()
        
        # Upload photo
        supabase.storage.from_("photos").upload(path=unique_name, file=contents)
        public_url = supabase.storage.from_("photos").get_public_url(unique_name)
        
        # Save to DB
        supabase.table("memories").insert({
            "description": description, 
            "image_url": public_url, 
            "user_id": user_id
        }).execute()
        
        return {"message": "I have tucked that memory away for us."}
    except Exception as e:
        print(f"❌ Teach Error: {e}")
        return {"message": "I couldn't save that memory."}
@app.post("/update-profile")
async def update_profile(
    user_id: str = Form(...),
    nickname: str = Form(""),
    former_profession: str = Form(""),
    family_details: str = Form("")
):
    print(f"🎛️ CAREGIVER: Updating profile for {user_id}")
    try:
        # Upsert means "Update if it exists, Insert if it doesn't"
        supabase.table("profiles").upsert({
            "id": user_id,
            "nickname": nickname,
            "former_profession": former_profession,
            "family_details": family_details
        }).execute()
        
        return {"message": "Profile updated successfully!"}
    except Exception as e:
        print(f"❌ Profile Update Error: {e}")
        return {"message": "Failed to update profile."}

@app.post("/add-routine")
async def add_routine(
    user_id: str = Form(...),
    time: str = Form(...),
    activity: str = Form(...)
):
    print(f"🎛️ CAREGIVER: Adding routine at {time} for {user_id}")
    try:
        supabase.table("routines").insert({
            "user_id": user_id,
            "time": time,
            "activity": activity
        }).execute()
        
        return {"message": "Routine added successfully!"}
    except Exception as e:
        print(f"❌ Routine Add Error: {e}")
        return {"message": "Failed to add routine."}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
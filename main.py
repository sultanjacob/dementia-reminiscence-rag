from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import google.generativeai as genai
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

# --- 1. SETUP & PATHS ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'keys.env'))

# Create the folder for photos if it doesn't exist yet
UPLOAD_FOLDER = os.path.join(basedir, "memories", "photos")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- 2. INITIALIZE APP ---
app = FastAPI()

# SECURITY (CORS) - Allows the mobile app to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MOUNT PHOTOS - This lets the app "see" the saved photos in the gallery
app.mount("/photos", StaticFiles(directory=UPLOAD_FOLDER), name="photos")

# --- 3. AI CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 4. ENDPOINTS ---

# ROUTE: ASK REMI (Text)
@app.get("/ask")
async def ask_remi(q: str = ""):
    print(f"💬 TEXT RECEIVED: {q}")
    memory_path = os.path.join(basedir, "memories", "family_facts.txt")
    with open(memory_path, "r", encoding="utf-8") as file:
        family_context = file.read()
    
    # NEW IMPROVED PROMPT
    prompt = f"""
    You are Remi, a warm and gentle companion. 
    
    Here are the family memories you know: 
    {family_context}
    
    GUIDELINES:
    1. If the user is just saying hello or having general small talk (like 'not bad', 'how are you'), 
       respond naturally and warmly. 
    2. ONLY talk about the memories (like Sarah's pic) if the user specifically asks about them 
       or if it is highly relevant to the question.
    3. Do NOT force a connection to the photos if it's not there.
    4. Keep it conversational, brief, and friendly.
    
    User says: {q}
    """
    
    response = model.generate_content(prompt)
    return {"message": response.text}
# ROUTE: IDENTIFY PHOTO (Ask Mode)
@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...)):
    print("📸 PHOTO RECEIVED (ASK MODE)") 
    try:
        contents = await image.read()
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        prompt = f"""
        Identify the person in this photo using these memories: {family_context}
        Speak directly to the user as Remi. Do NOT use bullet points or stars.
        Keep the answer warm, brief (2-3 sentences), and conversational.
        """
        
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        
        return {"message": response.text}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}

# ROUTE: SAVE MEMORY (Teach Mode)
@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form("")):
    print(f"📖 TEACHING MODE: {description}")
    try:
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_name)
        
        contents = await image.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "a", encoding="utf-8") as file:
            file.write(f"\n- {description}")

        return {"message": f"I've tucked that memory away! I now know: {description}"}
    except Exception as e:
        return {"message": f"I'm sorry, I couldn't save that: {str(e)}"}

# ROUTE: CHECK DAILY ROUTINE
@app.get("/check-routine")
async def check_routine():
    print("⏰ Checking the daily routine...")
    try:
        now = datetime.now().strftime("%H:%M")
        routine_path = os.path.join(basedir, "memories", "routine.txt")
        
        if not os.path.exists(routine_path):
            return {"message": "I don't have a schedule set for today yet."}
            
        with open(routine_path, "r", encoding="utf-8") as file:
            routine_context = file.read()

        prompt = f"""
        You are Remi. The current time is {now}. 
        Routine: {routine_context}
        If an event is happening now or in 30 mins, remind the user warmly. 
        Otherwise, give a warm greeting. No stars or special characters.
        """
        response = model.generate_content(prompt)
        return {"message": response.text}
    except Exception as e:
        return {"message": "I lost track of time for a moment."}

# ROUTE: GET GALLERY PHOTOS
@app.get("/get-memories")
async def get_memories():
    try:
        photo_dir = os.path.join(basedir, "memories", "photos")
        fact_path = os.path.join(basedir, "memories", "family_facts.txt")
        
        if not os.path.exists(photo_dir):
            return {"memories": []}

        photos = [f for f in os.listdir(photo_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        descriptions = {}
        if os.path.exists(fact_path):
            with open(fact_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Split by lines and look for the filename
                lines = content.split('\n')
                for line in lines:
                    for p in photos:
                        if p in line:
                            # Extract the text before the (Photo saved as...) part
                            desc = line.split("(Photo saved as")[0].replace("- NEW MEMORY:", "").strip()
                            descriptions[p] = desc

        memory_list = []
        for p in photos:
            memory_list.append({
                "url": f"{p}",
                "description": descriptions.get(p, "A special memory we saved together.")
            })

        return {"memories": memory_list}
    except Exception as e:
        return {"error": str(e)}

# --- 5. START SERVER ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
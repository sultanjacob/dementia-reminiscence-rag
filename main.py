from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import uuid
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
# --- 1. SETUP ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'keys.env'))

app = FastAPI()

# SECURITY (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GEMINI CONFIG
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Create a folder for photos if it doesn't exist
UPLOAD_FOLDER = os.path.join(basedir, "memories", "photos")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- 2. TEXT ENDPOINT ---
@app.get("/ask")
async def ask_remi(q: str = ""):
    print(f"💬 TEXT RECEIVED: {q}")
    memory_path = os.path.join(basedir, "memories", "family_facts.txt")
    with open(memory_path, "r", encoding="utf-8") as file:
        family_context = file.read()
    
    prompt = f"You are Remi. Use these memories: {family_context}\n\nQuestion: {q}"
    response = model.generate_content(prompt)
    return {"message": response.text}

# --- 3. PHOTO RECOGNITION ENDPOINT ---
@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...)):
    print("📸 !!! PHOTO SIGNAL RECEIVED (ASK MODE) !!!") 
    try:
        contents = await image.read()
        
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        prompt = f"""
        Identify the person in this photo using these memories: {family_context}
        
        IMPORTANT INSTRUCTIONS:
        1. Speak directly to the user as Remi.
        2. Do NOT use any bullet points, stars (**), or special characters.
        3. Keep the answer warm, brief (2-3 sentences), and conversational.
        """
        
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        
        print("✅ Remi successfully identified the person!")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}

# --- 4. TEACH REMI ENDPOINT ---
@app.post("/teach-remi")
async def teach_remi(image: UploadFile = File(...), description: str = Form(...)):
    print(f"📖 TEACHING MODE: {description}")
    try:
        # Save the Photo
        file_ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_name)
        
        contents = await image.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Update the memory file
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "a", encoding="utf-8") as file:
            file.write(f"\n- {description}")

        print("✅ Memory saved to text file!")
        return {"message": f"I've tucked that memory away! I now know: {description}"}

    except Exception as e:
        print(f"❌ Failed to learn: {e}")
        return {"message": f"I'm sorry, I couldn't save that: {str(e)}"}
from datetime import datetime

@app.get("/check-routine")
async def check_routine():
    print("⏰ Checking the daily routine...")
    try:
        # 1. Get the current time
        now = datetime.now().strftime("%H:%M")
        
        # 2. Read the routine file
        routine_path = os.path.join(basedir, "memories", "routine.txt")
        if not os.path.exists(routine_path):
            return {"message": "I don't have a schedule set for today yet."}
            
        with open(routine_path, "r", encoding="utf-8") as file:
            routine_context = file.read()

        # 3. Ask Gemini to be the "Clock"
        prompt = f"""
        You are Remi. The current time is {now}. 
        Here is the user's daily routine:
        {routine_context}
        
        Look at the time. If there is an event happening now or in the next 30 minutes, 
        remind the user in a very gentle, warm way. 
        If nothing is happening soon, just give a warm greeting like 'It's a lovely {now} in the afternoon, just enjoy your quiet time.'
        
        Do not use any special characters or stars.
        """
        
        response = model.generate_content(prompt)
        return {"message": response.text}

    except Exception as e:
        return {"message": f"I lost track of time for a moment: {str(e)}"}
@app.get("/get-memories")
async def get_memories():
    print("🖼️ Fetching the memory gallery...")
    try:
        photo_dir = os.path.join(basedir, "memories", "photos")
        if not os.path.exists(photo_dir):
            return {"memories": []}

        # List all photo files
        photos = os.listdir(photo_dir)
        
        # We will return the filenames. 
        # Note: In a real app, we'd link these to the specific descriptions, 
        # but for now, let's just get the images showing!
        return {"photos": photos}
    except Exception as e:
        return {"error": str(e)}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import uuid
from dotenv import load_dotenv

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
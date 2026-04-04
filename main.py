from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import base64
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import base64
from dotenv import load_dotenv

# --- 1. SETUP ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'keys.env'))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 2. TEXT ENDPOINT (WORKING) ---
@app.get("/ask")
async def ask_remi(q: str = ""):
    print(f"💬 TEXT RECEIVED: {q}")
    memory_path = os.path.join(basedir, "memories", "family_facts.txt")
    with open(memory_path, "r", encoding="utf-8") as file:
        family_context = file.read()
    
    prompt = f"You are Remi. Use these memories: {family_context}\n\nQuestion: {q}"
    response = model.generate_content(prompt)
    return {"message": response.text}

# --- 3. PHOTO ENDPOINT (THE FIX) ---
from fastapi import UploadFile, File, Form

@app.post("/describe-image")
async def describe_image(image: UploadFile = File(...)):
    print("📸 !!! PHOTO SIGNAL RECEIVED via FORM !!!") 
    try:
        # Read the file directly
        contents = await image.read()
        print(f"📦 Image received! Size: {len(contents)} bytes")

        # Load memories
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        # Ask Gemini
        prompt = f"Identify the person in this photo using these memories: {family_context}"
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": contents}
        ])
        
        print("✅ Remi successfully processed the image!")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
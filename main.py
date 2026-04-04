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
@app.post("/describe-image")
async def describe_image(request: Request):
    print("📸 !!! PHOTO SIGNAL DETECTED !!!") 
    try:
        # Get raw data to ensure nothing is missed
        data = await request.json()
        image_data = data.get("image")
        
        if not image_data:
            print("⚠️ Blank image received")
            return {"message": "The photo was empty."}

        print(f"📦 Successfully unpacked image ({len(image_data)} chars)")

        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        image_bytes = base64.b64decode(image_data)
        prompt = f"Identify the person in this photo using these memories: {family_context}"
        
        print("🧠 Remi is thinking...")
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        print("✅ Success!")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"message": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
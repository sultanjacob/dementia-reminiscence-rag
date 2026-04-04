from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import base64
from dotenv import load_dotenv

# --- 1. SMART PATH CONFIGURATION ---
basedir = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(basedir, 'keys.env')
load_dotenv(dotenv_path)

app = FastAPI()

# --- 2. SECURITY (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. GEMINI SETUP & DIAGNOSTICS ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ ERROR: No API Key found in keys.env!")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ GEMINI IS CONNECTED PRIVATELY!")
    
    # Check for the correct model
    print("\n--- 📜 RE-CHECKING AVAILABLE MODELS ---")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"AVAILABLE MODEL: {m.name}")
    except Exception as e:
        print(f"Could not list models: {e}")
    print("-------------------------------------------\n")

# Use the model name that worked previously
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 4. THE ASK REMI ENDPOINT (TEXT ONLY) ---
@app.get("/ask")
async def ask_remi(q: str = ""):
    print(f"💬 Received text question: {q}")
    memory_path = os.path.join(basedir, "memories", "family_facts.txt")
    
    try:
        if not os.path.exists(memory_path):
            return {"message": f"I can't find my memory folder at {memory_path}!"}

        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()
            
        prompt = f"""
        You are Remi, a supportive dementia reminiscence assistant. 
        Use the following family memories to answer the user's question. 
        If the answer isn't in the memories, be gentle and say you don't recall that yet.
        
        Memories:
        {family_context}
        
        User Question: {q}
        """
        
        response = model.generate_content(prompt)
        return {"message": response.text}
        
    except Exception as e:
        return {"message": f"Remi's brain is a bit fuzzy: {str(e)}"}

# --- 5. THE VISION ENDPOINT (PHOTO RECOGNITION) ---
@app.post("/describe-image")
async def describe_image(data: dict):
    print("📸 !!! PHOTO REQUEST RECEIVED !!!") 
    try:
        # 1. Get the image data from the phone
        image_data = data.get("image") 
        if not image_data:
            print("⚠️ No image data found in request!")
            return {"message": "I didn't receive a photo."}

        print(f"📦 Image received! Size: {len(image_data)} characters.")

        # 2. Read family facts for context
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        # 3. Prepare the image for Gemini
        image_bytes = base64.b64decode(image_data)
        
        # 4. Ask Gemini to look and remember
        prompt = f"""
        Look at this photo. Using these family memories, identify who is in the photo 
        and tell a warm story about them. If you aren't sure, describe what you see 
        kindly.
        
        Memories: {family_context}
        """
        
        print("🧠 Remi is looking at the photo and searching memories...")
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        print("✅ Remi found a match!")
        return {"message": response.text}

    except Exception as e:
        print(f"❌ Error during vision processing: {str(e)}")
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=8000)
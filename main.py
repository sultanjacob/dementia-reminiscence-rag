from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
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
    
    # --- THIS PART IS THE NUCLEAR DIAGNOSTIC ---
    print("\n--- 📜 LIST OF MODELS YOUR KEY CAN SEE ---")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"AVAILABLE MODEL: {m.name}")
    except Exception as e:
        print(f"Could not list models: {e}")
    print("-------------------------------------------\n")

# We are using the most standard name. 
# If the terminal list shows something different, we will change this!
model = genai.GenerativeModel('gemini-2.5-flash')

# --- 4. THE ASK REMI ENDPOINT ---
@app.get("/ask")
async def ask_remi(q: str = ""):
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
        # This error message will help us see if the 404 persists
        return {"message": f"Remi's brain is a bit fuzzy: {str(e)}"}
import base64

@app.post("/describe-image")
async def describe_image(data: dict):
    try:
        # 1. Get the image data from the phone
        image_data = data.get("image") # This will be a base64 string
        
        # 2. Read your family facts for context
        basedir = os.path.abspath(os.path.dirname(__file__))
        memory_path = os.path.join(basedir, "memories", "family_facts.txt")
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()

        # 3. Prepare the image for Gemini
        image_bytes = base64.b64decode(image_data)
        
        # 4. Ask Gemini to look and remember
        prompt = f"""
        Look at this photo. Using these family memories, identify who is in the photo 
        and tell a warm story about them. 
        
        Memories: {family_context}
        """
        
        # This is the "Vision" call
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        return {"message": response.text}
    except Exception as e:
        return {"message": f"Remi's eyes are a bit blurry: {str(e)}"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
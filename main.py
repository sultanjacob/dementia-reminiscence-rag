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
model = genai.GenerativeModel(' models/gemini-2.5-flash')

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
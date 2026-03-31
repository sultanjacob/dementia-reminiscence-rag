from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv

# --- 1. SMART PATH CONFIGURATION ---
basedir = os.path.abspath(os.path.dirname(__file__))

# This tries multiple common locations for your keys.env file
paths_to_check = [
    os.path.join(basedir, "keys.env"),                # Root folder
    os.path.join(basedir, "remi-mobile", "keys.env"),   # Subfolder
]

# Loop through paths until one works
for path in paths_to_check:
    if os.path.exists(path):
        load_dotenv(path)
        print(f"📍 Found keys.env at: {path}")
        break

app = FastAPI()

# --- 2. SECURITY (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. GEMINI SETUP ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ STILL NO KEY! Please ensure 'keys.env' contains: GEMINI_API_KEY=your_key")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ GEMINI IS CONNECTED PRIVATELY!")

model = genai.GenerativeModel('gemini-1.5-flash')

# --- 4. THE ASK REMI ENDPOINT ---
@app.get("/ask")
async def ask_remi(q: str = ""):
    # Look for memories inside the 'memories' folder
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

if __name__ == "__main__":
    import uvicorn
    # Port 8000 matches your VS Code Tunnel setup
    uvicorn.run(app, host="0.0.0.0", port=8000)
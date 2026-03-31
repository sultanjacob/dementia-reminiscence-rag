from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv

# --- FILE PATH SETUP ---
# This finds the exact folder where this main.py file is saved
basedir = os.path.abspath(os.path.dirname(__file__))
# This joins that folder path with the name 'keys.env'
dotenv_path = os.path.join(basedir, 'keys.env')

# Load the keys from that specific path
load_dotenv(dotenv_path)

app = FastAPI()

# 2. Security Pass for your phone to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- THE SECURE CONFIGURATION ---
# This path is usually where keys.env hides. 
# If it's in a different folder, we will find out in a second!
load_dotenv("keys.env") 

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# IF THE ABOVE FAILS, WE TRY THE SUBFOLDER
if not GEMINI_API_KEY:
    load_dotenv("remi-mobile/keys.env")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ STILL NO KEY! Please check your file name.")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ GEMINI IS CONNECTED PRIVATELY!")

# 4. Use the stable model name
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/ask")
async def ask_remi(q: str = ""):
    # Ensure this points to the right place relative to main.py
    memory_path = os.path.join(basedir, "memories", "family_facts.txt")
    
    try:
        # Read your family facts from the text file
        if not os.path.exists(memory_path):
            return {"message": f"I can't find my memory folder at {memory_path}!"}

        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()
            
        # Create the AI instructions
        prompt = f"""
        You are Remi, a supportive dementia reminiscence assistant. 
        Use the following family memories to answer the user's question. 
        If the answer isn't in the memories, be gentle and say you don't recall that yet.
        
        Memories:
        {family_context}
        
        User Question: {q}
        """
        
        # Get the answer from Gemini
        response = model.generate_content(prompt)
        
        return {"message": response.text}
        
    except Exception as e:
        return {"message": f"Remi's brain is a bit fuzzy: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    # This matches your PORT 8000 in VS Code
    uvicorn.run(app, host="0.0.0.0", port=8000)
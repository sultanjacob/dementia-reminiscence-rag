from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv

# This tells Python to look specifically for "keys.env"
load_dotenv("keys.env")

app = FastAPI()

# 2. Security Pass for your phone to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Securely get the API Key from your .env file
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ ERROR: No API Key found in your .env file!")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini Brain successfully connected!")

# 4. Use the stable model name
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/ask")
async def ask_remi(q: str = ""):
    memory_path = "memories/family_facts.txt"
    try:
        # Read your family facts from the text file
        if not os.path.exists(memory_path):
            return {"message": "I can't find my memory folder!"}

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
        # This will tell us exactly what went wrong if there's a problem
        return {"message": f"Remi's brain is a bit fuzzy: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    # Make sure this matches your PORT 8000 in VS Code
    uvicorn.run(app, host="0.0.0.0", port=8000)
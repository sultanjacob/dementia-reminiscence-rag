from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
# PASTE YOUR GEMINI API KEY HERE
GEMINI_API_KEY = "AIzaSyC6bSAcGY8EiuHWi5zaxBcxxCGq2cUeUzQ"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

@app.get("/ask")
async def ask_remi(q: str = ""):
    memory_path = "memories/family_facts.txt"
    try:
        # 1. Read your family facts
        with open(memory_path, "r", encoding="utf-8") as file:
            family_context = file.read()
            
        # 2. Create the prompt for Gemini
        prompt = f"""
        You are Remi, a supportive dementia reminiscence assistant. 
        Use the following family memories to answer the user's question. 
        If the answer isn't in the memories, be gentle and say you don't recall that yet.
        
        Memories:
        {family_context}
        
        User Question: {q}
        """
        
        # 3. Get the answer from Gemini
        response = model.generate_content(prompt)
        
        return {"message": response.text}
    except Exception as e:
        return {"message": f"Remi's brain is a bit fuzzy: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
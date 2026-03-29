from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ADD THIS LINE
import os

app = FastAPI()

# ADD THESE LINES BELOW
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This allows your phone to connect
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ask")
async def ask_remi(q: str = ""):
    # ... (the rest of your code stays the same)
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/ask")
async def ask_remi(q: str = ""):
    memory_path = "memories/family_facts.txt"
    try:
        with open(memory_path, "r", encoding="utf-8") as file:
            facts = file.readlines()
            
        # For now, we search for the word you typed in the facts
        # Example: If you type "Sarah", it finds the line about Sarah
        found_facts = [f.strip() for f in facts if q.lower() in f.lower()]
        
        if found_facts:
            response = found_facts[0]
        else:
            response = "I don't remember that specific detail yet. Should we add it?"
            
        return {"message": response}
    except Exception as e:
        return {"message": f"My brain is a bit fuzzy: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
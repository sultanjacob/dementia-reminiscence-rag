from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# This is the "Security Pass" that lets your phone talk to your computer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ask")
async def ask_remi(q: str = ""):
    memory_path = "memories/family_facts.txt"
    try:
        # We use utf-8 to handle any special characters
        with open(memory_path, "r", encoding="utf-8") as file:
            facts = file.readlines()
            
        # This searches your text file for the word you typed on your phone
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
    # This starts the server on port 8080
    uvicorn.run(app, host="0.0.0.0", port=8080)
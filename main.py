from fastapi import FastAPI
import os

app = FastAPI()

# This is where we will eventually put your AI key
# os.environ["OPENAI_API_KEY"] = "your-key-here"

@app.get("/")
async def root():
    # 1. Look for the memories folder
    memory_path = "memories/family_facts.txt"
    
    try:
        # 2. Read the "Memory" file you just created
        with open(memory_path, "r", encoding="utf-8") as file:
            facts = file.readlines()
            # Grab the first fact for now to test the brain
            first_memory = facts[0].strip() if facts else "I have no memories yet."
            
        return {
            "status": "online",
            "message": f"Remi remembers: {first_memory}"
        }
    except FileNotFoundError:
        return {
            "status": "error",
            "message": "I can't find my memory folder!"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
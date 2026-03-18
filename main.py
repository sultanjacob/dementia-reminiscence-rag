from fastapi import FastAPI
import uvicorn
import os
import json

app = FastAPI()

# Point to your project folder
PROFILES_DIR = r"D:\MLP\dementia-reminiscence-rag\profiles"

@app.get("/")
def health_check():
    return {"status": "online", "message": "Remi's Brain is Connected"}

@app.get("/login/{patient_id}")
def login(patient_id: str):
    """The mobile app calls this to fetch a specific patient's bio."""
    patient_id = patient_id.lower().strip()
    bio_path = os.path.join(PROFILES_DIR, f"{patient_id}_bio.json")
    
    if os.path.exists(bio_path):
        with open(bio_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": "Profile not found"}

if __name__ == "__main__":
    # Start the server
    uvicorn.run(app, host="127.0.0.1", port=8000)
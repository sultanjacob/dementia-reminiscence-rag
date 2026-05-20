from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# This acts as the "bouncer" allowing your phone to talk to the server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Remi's Brain is online and listening."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    print("\n--- 🚨 INCOMING TRANSMISSION ---")
    print(f"User ID: {user_id}")
    print(f"Audio File Received: {file.filename}")
    print("--------------------------------\n")
    
    # 🛑 We will add the actual AI audio transcription and logic here next!
    
    # For now, we return a hardcoded response to prove the connection works
    return {"message": "I received your voice note loud and clear! My brain is officially connected."}

if __name__ == "__main__":
    # Running on 0.0.0.0 exposes the server to your local Wi-Fi network
    uvicorn.run(app, host="0.0.0.0", port=8000)
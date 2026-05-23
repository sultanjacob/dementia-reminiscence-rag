import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv
import uvicorn

# Load keys
load_dotenv()

# Set up Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Set up Gemini
GEMINI_KEY = os.getenv("GEMINI_KEY")
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 1. SHORT TERM MEMORY VAULT
# This dictionary will hold the ongoing conversation history for each user ID
active_chats = {}

@app.get("/")
def read_root():
    return {"status": "Remi's Cloud Brain is online, aware, and listening."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    print(f"\n--- 🧠 PROCESSING REQUEST FOR USER: {user_id} ---")
    
    try:
        # Fetching memories from Supabase
        print("Fetching memories from Supabase...")
        response = supabase.table('memories').select('title, date, description').eq('user_id', user_id).execute()
        memories_data = response.data
        
        memory_context = ""
        if memories_data:
            memory_context = "Here are the patient's recent memories uploaded by their family:\n"
            for mem in memories_data:
                memory_context += f"- Title: {mem.get('title')}, Date: {mem.get('date', 'Unknown')}. Story: {mem.get('description', 'No description.')}\n"
        else:
            memory_context = "The patient has no uploaded memories yet."

        # 🕒 2. REALITY GROUNDING (Time & Date)
        current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

        # 🛡️ 3. EMERGENCY GUARDRAILS & PROMPT
        system_prompt = f"""
        You are Remi, an empathetic, gentle, and highly conversational AI companion designed for a patient with early-stage dementia.
        Keep your responses brief (1-3 sentences max), warm, and spoken directly to the patient.
        
        REALITY GROUNDING:
        The current date and local time is {current_time}. If the user asks about the time, or seems confused about what part of the day it is, gently orient them using this time.

        EMERGENCY & DISTRESS GUARDRAILS:
        If the user expresses deep fear, confusion, says they are lost, in physical pain, or are frantically looking for someone:
        Do NOT argue with them. Validate their feelings in a highly soothing tone, and gently advise them to tap the "Call Family" button on their screen.

        MEMORIES:
        {memory_context}
        """

        # Retrieve or start the user's specific chat session
        if user_id not in active_chats:
            print("Starting a new conversation memory for this user...")
            active_chats[user_id] = model.start_chat(history=[])
        
        chat_session = active_chats[user_id]

        # Save audio
        print("Processing your voice...")
        temp_file_path = f"temp_audio_{user_id}.m4a"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Upload audio to AI
        print("Uploading audio to AI...")
        gemini_audio_file = genai.upload_file(path=temp_file_path)
        
        # Generate the AI Response using the continuous chat session
        print("Listening and Thinking...")
        
        # We package the system instructions and the audio file together for this turn
        turn_payload = f"System Rules and Context for this turn:\n{system_prompt}\n\nPlease listen to the attached audio and respond."
        ai_response = chat_session.send_message([turn_payload, gemini_audio_file])
        
        # Clean up files
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        gemini_audio_file.delete()
        
        print(f"Remi says: {ai_response.text.strip()}")
        print("--------------------------------------------------\n")
        
        return {"message": ai_response.text.strip()}

    except Exception as e:
        print(f"Error: {str(e)}")
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"message": "I am having a little trouble thinking right now, but I am still here with you."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
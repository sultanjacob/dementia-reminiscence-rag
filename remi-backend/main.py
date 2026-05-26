import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv
import uvicorn

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

active_chats = {}
# 🧠 NEW: Cache the database so we don't query it on every single sentence!
memory_cache = {}

@app.get("/")
def read_root():
    return {"status": "Remi's Fast Cloud Brain is online."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    print(f"\n--- ⚡ FAST PROCESSING FOR: {user_id} ---")
    
    try:
        # 1. Check cache instead of hitting the database every time
        if user_id not in memory_cache:
            print("Fetching memories from Supabase (First time only)...")
            response = supabase.table('memories').select('title, date, description').eq('user_id', user_id).execute()
            memories_data = response.data
            
            if memories_data:
                mem_context = "Here are the patient's recent memories:\n"
                for mem in memories_data:
                    mem_context += f"- {mem.get('title')} ({mem.get('date', 'Unknown')}): {mem.get('description', '')}\n"
            else:
                mem_context = "No uploaded memories yet."
            memory_cache[user_id] = mem_context
        
        memory_context = memory_cache[user_id]
        current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

        if user_id not in active_chats:
            active_chats[user_id] = ""
        
        chat_history = active_chats[user_id][-1000:] 

        system_prompt = f"""
        You are Remi, an empathetic, gentle AI companion for a patient with early-stage dementia.
        Keep responses brief (1-3 sentences), warm, and spoken directly to the patient.
        
        TIME: {current_time}. Orient the patient if confused.
        GUARDRAIL: If user expresses fear, pain, or being lost, validate feelings and advise them to tap "Call Family".
        MEMORIES: {memory_context}
        HISTORY: {chat_history}
        """

        # 🚀 2. INLINE AUDIO: Skip disk saving and skip Google File API entirely!
        audio_bytes = await file.read()
        audio_part = {
            "mime_type": file.content_type or "audio/m4a",
            "data": audio_bytes
        }
        
        print("Listening and Thinking instantly...")
        ai_response = model.generate_content([system_prompt, audio_part])
        response_text = ai_response.text.strip()
        
        active_chats[user_id] += f"\nRemi said: {response_text}"
        
        print(f"Remi says: {response_text}")
        print("--------------------------------------------------\n")
        
        return {"message": response_text}

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"message": "I am having a little trouble thinking right now, but I am still here."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
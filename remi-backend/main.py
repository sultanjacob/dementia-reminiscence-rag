import os
import time
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
memory_cache = {}

@app.get("/")
def read_root():
    return {"status": "Remi's Stopwatch Brain is online."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    start_time = time.time()
    print(f"\n--- ⏱️ DIAGNOSTIC SPEED TEST FOR: {user_id} ---")
    
    try:
        # 1. Measure Phone Upload Speed
        audio_bytes = await file.read()
        received_time = time.time()
        print(f"✅ Audio received from phone in: {received_time - start_time:.2f} seconds")

        # 2. Measure Database Speed
        if user_id not in memory_cache:
            response = supabase.table('memories').select('title, date, description').eq('user_id', user_id).execute()
            memories_data = response.data
            
            if memories_data:
                mem_context = "Here are the patient's recent memories:\n"
                for mem in memories_data:
                    mem_context += f"- {mem.get('title')} ({mem.get('date', 'Unknown')}): {mem.get('description', '')}\n"
            else:
                mem_context = "No uploaded memories yet."
            memory_cache[user_id] = mem_context
        
        cache_time = time.time()
        print(f"✅ Database cache checked in: {cache_time - received_time:.2f} seconds")

        memory_context = memory_cache[user_id]
        current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

        if user_id not in active_chats:
            active_chats[user_id] = ""
        
        chat_history = active_chats[user_id][-1000:] 

        system_prompt = f"""
        You are Remi, an empathetic AI companion for a patient with early-stage dementia.
        Keep responses brief (1-3 sentences).
        TIME: {current_time}. 
        MEMORIES: {memory_context}
        HISTORY: {chat_history}
        """

        audio_part = {
            "mime_type": file.content_type or "audio/m4a",
            "data": audio_bytes
        }
        
        # 3. Measure Gemini Speed
        print("🤔 Gemini is thinking...")
        ai_response = model.generate_content([system_prompt, audio_part])
        ai_time = time.time()
        response_text = ai_response.text.strip()
        print(f"✅ Gemini finished thinking in: {ai_time - cache_time:.2f} seconds")
        
        active_chats[user_id] += f"\nRemi said: {response_text}"
        
        print(f"🚀 TOTAL BACKEND TIME: {ai_time - start_time:.2f} seconds")
        print(f"Remi says: {response_text}")
        print("--------------------------------------------------\n")
        
        return {"message": response_text}

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"message": "I am having a little trouble thinking right now."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
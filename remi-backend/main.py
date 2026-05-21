import os
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv
import uvicorn

# Load your secret keys from the .env file
load_dotenv()

# Set up Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Set up Gemini
GEMINI_KEY = os.getenv("GEMINI_KEY")
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Remi's Cloud Brain is online."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    print(f"\n--- 🧠 PROCESSING REQUEST FOR USER: {user_id} ---")
    
    try:
        # 1. RAG: Retrieve Memories from the Cloud
        print("Fetching memories from Supabase...")
        response = supabase.table('memories').select('title, date, description').eq('user_id', user_id).execute()
        memories_data = response.data
        
        # 2. Format the memories into a readable context string
        memory_context = ""
        if memories_data:
            memory_context = "Here are the patient's recent memories uploaded by their family:\n"
            for mem in memories_data:
                memory_context += f"- Title: {mem.get('title')}, Date: {mem.get('date', 'Unknown')}. Story: {mem.get('description', 'No description.')}\n"
        else:
            memory_context = "The patient has no uploaded memories yet."

        print("Memories retrieved successfully.")

        # 3. Create the System Prompt for Gemini
        # This tells Gemini exactly who she is and gives her the patient's life story
        system_prompt = f"""
        You are Remi, an empathetic, gentle, and highly conversational AI companion designed for a patient with early-stage dementia.
        Keep your responses brief (1-3 sentences max), warm, and spoken directly to the patient.
        Do not sound like a robot. Speak like a caring friend.
        
        {memory_context}
        
        The user has just spoken to you. Respond to them kindly. If they ask about a memory, use the context above to gently remind them of the story.
        """

        # 4. For right now, we will simulate reading the audio file's text 
        # (We will add the actual Whisper audio-to-text transcription in the next step!)
        user_spoken_text = "Who is in the photo of Sarah's Wedding?" 
        
        # 5. Generate the AI Response
        print("Thinking...")
        ai_response = model.generate_content([system_prompt, user_spoken_text])
        
        print(f"Remi says: {ai_response.text.strip()}")
        print("--------------------------------------------------\n")
        
        return {"message": ai_response.text.strip()}

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"message": "I am having a little trouble thinking right now, but I am still here with you."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
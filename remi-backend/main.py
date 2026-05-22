import os
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv
import uvicorn

# 1. Force Python to read the file
load_dotenv(override=True)

# 2. 🔍 THE TRUTH SERUM
print("\n--- 🔍 DIAGNOSTICS ---")
print("Does the .env file exist here?:", os.path.exists(".env"))
print("What is the Supabase URL?:", os.getenv("SUPABASE_URL"))
print("----------------------\n")

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
    return {"status": "Remi's Cloud Brain is online and listening."}

@app.post("/voice-chat")
async def voice_chat(user_id: str = Form(...), file: UploadFile = File(...)):
    print(f"\n--- 🧠 PROCESSING REQUEST FOR USER: {user_id} ---")
    
    try:
        # 1. RAG: Retrieve Memories from the Cloud
        print("Fetching memories from Supabase...")
        response = supabase.table('memories').select('title, date, description').eq('user_id', user_id).execute()
        memories_data = response.data
        
        # Format the memories into a readable context string
        memory_context = ""
        if memories_data:
            memory_context = "Here are the patient's recent memories uploaded by their family:\n"
            for mem in memories_data:
                memory_context += f"- Title: {mem.get('title')}, Date: {mem.get('date', 'Unknown')}. Story: {mem.get('description', 'No description.')}\n"
        else:
            memory_context = "The patient has no uploaded memories yet."

        # 2. Create the System Prompt for Gemini
        system_prompt = f"""
        You are Remi, an empathetic, gentle, and highly conversational AI companion designed for a patient with early-stage dementia.
        Keep your responses brief (1-3 sentences max), warm, and spoken directly to the patient.
        Do not sound like a robot. Speak like a caring friend.
        
        {memory_context}
        
        The user is speaking to you in the attached audio file. Listen to their voice and respond kindly. Use the context above to gently remind them of a story if they ask.
        """

        # 3. Save the incoming audio temporarily to hand to Gemini
        print("Processing your voice...")
        temp_file_path = f"temp_audio_{user_id}.m4a"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        # 4. Upload the audio file directly into Gemini's brain
        print("Uploading audio to AI...")
        gemini_audio_file = genai.upload_file(path=temp_file_path)
        
        # 5. Generate the AI Response
        print("Listening and Thinking...")
        ai_response = model.generate_content([system_prompt, gemini_audio_file])
        
        # 6. Clean up (Security & Privacy!)
        # Delete from local computer
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        # Delete from Gemini's servers immediately
        gemini_audio_file.delete()
        
        print(f"Remi says: {ai_response.text.strip()}")
        print("--------------------------------------------------\n")
        
        return {"message": ai_response.text.strip()}

    except Exception as e:
        print(f"Error: {str(e)}")
        # If something fails, still clean up the file just in case
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"message": "I am having a little trouble thinking right now, but I am still here with you."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
import streamlit as st
import requests
from streamlit_mic_recorder import speech_to_text
from gtts import gTTS
import io

# Set up the page
st.set_page_config(page_title="Remi Companion", page_icon="🧠")
st.title("Remi: Memory Companion 💙")

# Sidebar
with st.sidebar:
    st.header("Patient Setup")
    patient_id = st.text_input("Patient ID:", value="sultan").lower()
    st.write("Make sure your FastAPI server is running in the background!")

# Memory Setup
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display past conversation
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

st.write("---")
st.write("🎤 **Click the microphone to speak, or type below:**")

# 1. Voice Input
spoken_text = speech_to_text(
    language='en',
    start_prompt="Click to Start Recording",
    stop_prompt="Click to Stop",
    just_once=True,
    key='STT'
)

# 2. Text Input
typed_text = st.chat_input("Or type your message here...")

# Combine Inputs
user_input = spoken_text or typed_text

if user_input:
    # Show user message
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    # Get Remi's Reply from the Brain
    with st.spinner("Remi is thinking..."):
        try:
            url = f"http://127.0.0.1:8080/chat/{patient_id}"
            response = requests.get(url, params={"user_message": user_input})
            
            if response.status_code == 200:
                remi_reply = response.json().get("remi_says", "Sorry, I didn't catch that.")
            else:
                remi_reply = "⚠️ Error: Remi's brain didn't respond properly."
                
        except requests.exceptions.ConnectionError:
            remi_reply = "🚨 Connection failed! Is `main.py` running in your other terminal?"

    # Show Remi's text response
    st.session_state.messages.append({"role": "assistant", "content": remi_reply})
    with st.chat_message("assistant"):
        st.markdown(remi_reply)
        
        # --- NEW: TEXT TO SPEECH (The Voice) ---
        if "Error" not in remi_reply and "Connection failed" not in remi_reply:
            # Convert text to audio
            tts = gTTS(text=remi_reply, lang='en', slow=False)
            
            # Save it to a temporary memory buffer so we don't clutter your hard drive
            audio_bytes = io.BytesIO()
            tts.write_to_fp(audio_bytes)
            audio_bytes.seek(0)
            
            # Play the audio automatically!
            st.audio(audio_bytes, format="audio/mp3", autoplay=True)
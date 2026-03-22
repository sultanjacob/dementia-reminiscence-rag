import streamlit as st
import requests
from streamlit_mic_recorder import speech_to_text

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

# --- NEW: VOICE & TEXT INPUT ---
st.write("---")
st.write("🎤 **Click the microphone to speak, or type below:**")

# 1. The Microphone Button (Translates voice to text automatically)
spoken_text = speech_to_text(
    language='en',
    start_prompt="Click to Start Recording",
    stop_prompt="Click to Stop",
    just_once=True,
    key='STT'
)

# 2. The Keyboard Input
typed_text = st.chat_input("Or type your message here...")

# 3. Combine them: If the user spoke OR typed, capture it!
user_input = spoken_text or typed_text

if user_input:
    # Show the user's message
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    # Talk to the FastAPI Brain
    with st.spinner("Remi is listening..."):
        try:
            url = f"http://127.0.0.1:8080/chat/{patient_id}"
            response = requests.get(url, params={"user_message": user_input})
            
            if response.status_code == 200:
                remi_reply = response.json().get("remi_says", "Sorry, I didn't catch that.")
            else:
                remi_reply = "⚠️ Error: Remi's brain didn't respond properly."
                
        except requests.exceptions.ConnectionError:
            remi_reply = "🚨 Connection failed! Is `main.py` running in your other terminal?"

    # Show Remi's response
    st.session_state.messages.append({"role": "assistant", "content": remi_reply})
    with st.chat_message("assistant"):
        st.markdown(remi_reply)
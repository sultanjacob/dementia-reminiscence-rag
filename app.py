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
        # If there was a photo attached to this past message, show it again
        if "photo" in msg:
            st.image(msg["photo"]["url"], caption=msg["photo"]["caption"])

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

    # --- NEW: PHOTO MEMORIES TRIGGER ---
    # Check if we should show a photo based on keywords
    photo_data = None
    if "library" in remi_reply.lower():
        # Using a free placeholder image of a classic library
        photo_data = {
            "url": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80",
            "caption": "The Central Library project you worked on."
        }
    elif "piano" in remi_reply.lower():
        photo_data = {
            "url": "https://images.unsplash.com/photo-1552422535-c45813c61732?w=600&q=80",
            "caption": "A piano, just like the one you used to play."
        }

    # Save and Show Remi's text and photo
    message_data = {"role": "assistant", "content": remi_reply}
    if photo_data:
        message_data["photo"] = photo_data
        
    st.session_state.messages.append(message_data)
    
    with st.chat_message("assistant"):
        st.markdown(remi_reply)
        if photo_data:
            st.image(photo_data["url"], caption=photo_data["caption"])
import streamlit as st
import requests

# Set up the page
st.set_page_config(page_title="Remi Companion", page_icon="🧠")
st.title("Remi: Memory Companion 💙")

# 1. Login Section (Sidebar)
with st.sidebar:
    st.header("Patient Setup")
    patient_id = st.text_input("Patient ID:", value="sultan").lower()
    st.write("Make sure your FastAPI server is running in the background!")

# 2. Chat History Memory
# This keeps the messages on screen so they don't disappear
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display the past conversation
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# 3. The Chat Input Box
if user_input := st.chat_input("Say hello to Remi..."):
    # Show the user's message immediately
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    # 4. Talk to the "Brain" (FastAPI)
    with st.spinner("Remi is thinking..."):
        try:
            # We are calling the exact URL you tested earlier!
            url = f"http://127.0.0.1:8080/chat/{patient_id}"
            response = requests.get(url, params={"user_message": user_input})
            
            if response.status_code == 200:
                remi_reply = response.json().get("remi_says", "Sorry, I didn't catch that.")
            else:
                remi_reply = "⚠️ Error: Remi's brain didn't respond properly."
                
        except requests.exceptions.ConnectionError:
            remi_reply = "🚨 Connection failed! Is `main.py` (FastAPI) running in your other terminal?"

    # Show Remi's response
    st.session_state.messages.append({"role": "assistant", "content": remi_reply})
    with st.chat_message("assistant"):
        st.markdown(remi_reply)
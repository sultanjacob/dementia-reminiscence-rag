# PASTE YOUR BRAND NEW KEY HERE
GEMINI_API_KEY = "AIzaSy..." 

genai.configure(api_key=GEMINI_API_KEY)

# Use this specific model name - it's the most stable one
model = genai.GenerativeModel('gemini-1.5-flash')
import os
import uuid
from datetime import datetime
from pathlib import Path # Fixed: no space!
from dotenv import load_dotenv

# --- 1. SETUP & CONFIGURATION ---

# We define the path to your 'keys' file explicitly
env_path = Path('.') / 'keys.env'
load_dotenv(dotenv_path=env_path)

# Pull variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# DEBUG PRINT: Let's see if it finds them now
print("--- 🔑 Key Check ---")
print(f"SUPABASE_URL: {'✅ Found' if SUPABASE_URL else '❌ NOT FOUND'}")
print(f"SUPABASE_KEY: {'✅ Found' if SUPABASE_KEY else '❌ NOT FOUND'}")
print(f"GEMINI_KEY:   {'✅ Found' if GEMINI_API_KEY else '❌ NOT FOUND'}")
print("--------------------")

if not SUPABASE_URL:
    print("⚠️  Error: Could not find SUPABASE_URL in your 'keys' file.")
    print(f"Looked in: {env_path.absolute()}")
    # We don't crash yet, but the next line will
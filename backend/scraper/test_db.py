# test_db.py
from dotenv import load_dotenv
import os
from supabase import create_client
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from db import supabase

print("Supabase client inicijaliziran:", supabase is not None)

load_dotenv()

print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("SUPABASE_KEY:", os.getenv("SUPABASE_KEY"))

from db import supabase
res = supabase.table("restaurant").select("*").limit(1).execute()
print(res)

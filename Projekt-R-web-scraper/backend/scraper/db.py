from dotenv import load_dotenv
import os
from supabase import create_client
from pathlib import Path

#  ucitaj .env iz foldera di je ovaj file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

print("Učitavam varijable iz:", env_path)
print("SUPABASE_URL =", os.getenv("SUPABASE_URL"))
print("SUPABASE_KEY =", os.getenv("SUPABASE_KEY"))

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

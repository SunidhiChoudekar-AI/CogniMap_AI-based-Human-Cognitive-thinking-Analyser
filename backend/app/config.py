import os
from pathlib import Path
from dotenv import load_dotenv

root = Path(__file__).resolve().parent.parent
load_dotenv(root / '.env')

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./cognimap.db')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
SECRET_KEY = os.getenv('SECRET_KEY', 'cognimap-dev-secret-change-in-production')
ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

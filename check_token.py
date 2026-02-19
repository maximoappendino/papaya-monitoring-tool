import os.path
import pickle
from google.auth.transport.requests import Request

TOKEN_FILE = 'token.pickle'

if os.path.exists(TOKEN_FILE):
    with open(TOKEN_FILE, 'rb') as token:
        creds = pickle.load(token)
        print(f"Valid: {creds.valid}")
        print(f"Expired: {creds.expired}")
        if creds.expired and creds.refresh_token:
            print("Trying to refresh...")
            try:
                creds.refresh(Request())
                print(f"Refresh success. Valid: {creds.valid}")
            except Exception as e:
                print(f"Refresh failed: {e}")
else:
    print("Token file not found.")

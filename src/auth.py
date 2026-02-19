import os.path
import pickle
import json
import base64
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials

# If modifying these scopes, delete the file token.pickle.
SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/meetings.space.readonly',
    'https://www.googleapis.com/auth/meetings.conference.media.readonly'
]

CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.pickle'

def authenticate():
    creds = None
    
    # Try reading token from environment variable first (for Render)
    env_token = os.environ.get('GOOGLE_TOKEN_PICKLE')
    if env_token:
        try:
            creds = pickle.loads(base64.b64decode(env_token))
        except Exception as e:
            print(f"Error loading credentials from env: {e}")

    # Fallback to local file
    if not creds and os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
            
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                creds = None
        
        if not creds:
            # Try reading credentials JSON from env (for Render)
            env_creds = os.environ.get('GOOGLE_CREDENTIALS_JSON')
            if env_creds:
                creds_data = json.loads(env_creds)
                flow = InstalledAppFlow.from_client_config(creds_data, SCOPES)
            elif os.path.exists(CREDENTIALS_FILE):
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            else:
                 raise FileNotFoundError(f"Could not find {CREDENTIALS_FILE} or GOOGLE_CREDENTIALS_JSON environment variable.")

            # Note: run_local_server will NOT work on Render/Production.
            # Production requires the token to be pre-generated locally and provided via env var.
            if os.environ.get('RENDER'):
                raise Exception("OAuth flow cannot be completed in production. Please provide GOOGLE_TOKEN_PICKLE.")
            
            creds = flow.run_local_server(port=0)
            
        # Only save to file if not on Render
        if not os.environ.get('RENDER'):
            with open(TOKEN_FILE, 'wb') as token:
                pickle.dump(creds, token)

    return creds

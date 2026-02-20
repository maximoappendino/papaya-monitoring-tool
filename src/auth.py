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
        print("🔍 Found GOOGLE_TOKEN_PICKLE in environment.")
        try:
            creds = pickle.loads(base64.b64decode(env_token))
            print("✅ Decoded token from environment.")
        except Exception as e:
            print(f"❌ Error decoding GOOGLE_TOKEN_PICKLE: {e}")

    # Fallback to local file
    if not creds and os.path.exists(TOKEN_FILE):
        print(f"🔍 Found local {TOKEN_FILE}.")
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
            
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Token expired, attempting refresh...")
            try:
                creds.refresh(Request())
                print("✅ Token refreshed successfully.")
            except Exception as e:
                print(f"❌ Error refreshing token: {e}")
                creds = None
        
        if not creds:
            # Try reading credentials JSON from env (for Render)
            env_creds = os.environ.get('GOOGLE_CREDENTIALS_JSON')
            if env_creds:
                print("🔍 Found GOOGLE_CREDENTIALS_JSON in environment.")
                creds_data = json.loads(env_creds)
                flow = InstalledAppFlow.from_client_config(creds_data, SCOPES)
            elif os.path.exists(CREDENTIALS_FILE):
                print(f"🔍 Found local {CREDENTIALS_FILE}.")
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            else:
                 print("❌ No credentials found in environment or local file!")
                 raise FileNotFoundError(f"Could not find {CREDENTIALS_FILE} or GOOGLE_CREDENTIALS_JSON environment variable.")

            if os.environ.get('RENDER') or os.environ.get('PORT'):
                print("⚠️  Running in production but no valid token found. Cannot perform browser login.")
                raise Exception("OAuth flow cannot be completed in production. Please provide GOOGLE_TOKEN_PICKLE.")
            
            print("🌐 Starting local browser login...")
            creds = flow.run_local_server(port=0)
            
        if not (os.environ.get('RENDER') or os.environ.get('PORT')):
            with open(TOKEN_FILE, 'wb') as token:
                pickle.dump(creds, token)

    return creds

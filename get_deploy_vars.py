import base64
import json
import os

def get_env_values():
    print("--- GOOGLE_CREDENTIALS_JSON ---")
    if os.path.exists('credentials.json'):
        with open('credentials.json', 'r') as f:
            print(json.dumps(json.load(f)))
    else:
        print("File 'credentials.json' not found.")

    print("
--- GOOGLE_TOKEN_PICKLE ---")
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as f:
            print(base64.b64encode(f.read()).decode('utf-8'))
    else:
        print("File 'token.pickle' not found.")

if __name__ == "__main__":
    get_env_values()

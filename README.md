# Google Meet & Calendar Monitor

This tool pulls upcoming meetings from your Google Calendar and attempts to verify attendance using the Google Meet API.

## Prerequisites

### 1. Google Cloud Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Meet-Monitor").
3. **Enable APIs:**
   - Search for and enable **"Google Calendar API"**.
   - Search for and enable **"Google Meet API"**.
4. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" > "OAuth consent screen".
   - Choose "External" (or "Internal" if you are a Workspace admin).
   - Fill in the required fields (App name, email).
   - **Scopes:** Add the following scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/meetings.space.readonly`
     - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
   - Add your email as a **Test User**.
5. **Create Credentials:**
   - Go to "APIs & Services" > "Credentials".
   - Click "Create Credentials" > "OAuth client ID".
   - Application type: **Desktop app**.
   - Name it "Meet Monitor CLI".
   - Click "Create" and then **Download JSON**.
   - **Rename the downloaded file to `credentials.json` and place it in this project folder.**

## Installation

1. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python src/main.py
   ```

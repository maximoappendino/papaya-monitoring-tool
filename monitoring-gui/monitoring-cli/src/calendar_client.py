from googleapiclient.discovery import build
import datetime
from dateutil import parser

def get_upcoming_events(creds, max_results=10, time_min=None, time_max=None):
    """Fetches the upcoming events from the primary calendar."""
    service = build('calendar', 'v3', credentials=creds)

    if not time_min:
        time_min = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    print(f"Getting events from {time_min} up to {time_max or 'future'}...")
    
    events_result = service.events().list(
        calendarId='primary', 
        timeMin=time_min,
        timeMax=time_max,
        maxResults=max_results, 
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    events = events_result.get('items', [])
    return events

def extract_meet_link(event):
    """Extracts the Google Meet link/code from a calendar event."""
    # 1. Best source: conferenceData
    conference_data = event.get('conferenceData', {})
    entry_points = conference_data.get('entryPoints', [])
    
    for entry in entry_points:
        if entry.get('entryPointType') == 'video':
            return entry.get('uri')
            
    # 2. Fallback: hangoutLink
    hangout_link = event.get('hangoutLink')
    if hangout_link:
        return hangout_link
            
    # 3. Fallback: location or description could contain links, but these are primary
    return None

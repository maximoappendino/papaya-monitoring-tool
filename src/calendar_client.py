from googleapiclient.discovery import build
import datetime
from dateutil import parser

def get_upcoming_events(creds, max_results=250, time_min=None, time_max=None):
    """Fetches upcoming events from ALL available calendars."""
    service = build('calendar', 'v3', credentials=creds)

    if not time_min:
        time_min = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    # 1. Get list of all calendars
    try:
        calendar_list = service.calendarList().list().execute().get('items', [])
    except Exception as e:
        print(f"❌ Error fetching calendar list: {e}")
        calendar_list = [{'id': 'primary'}]

    all_events = []
    
    # 2. Fetch events from each calendar
    for cal in calendar_list:
        cal_id = cal.get('id')
        print(f"📅 Syncing calendar: {cal.get('summary')} ({cal_id})")
        
        page_token = None
        while True:
            try:
                events_result = service.events().list(
                    calendarId=cal_id, 
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=250, 
                    singleEvents=True,
                    orderBy='startTime',
                    pageToken=page_token
                ).execute()
                
                items = events_result.get('items', [])
                all_events.extend(items)
                
                page_token = events_result.get('nextPageToken')
                if not page_token or len(all_events) >= max_results:
                    break
            except Exception as e:
                print(f"⚠️ Could not sync calendar {cal_id}: {e}")
                break
            
    # Remove duplicates (events can appear in multiple calendars)
    unique_events = {e['id']: e for e in all_events}.values()
    return sorted(unique_events, key=lambda x: x['start'].get('dateTime', x['start'].get('date')))

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

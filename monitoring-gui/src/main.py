import auth
import calendar_client
import meet_client
import sys
import datetime
import time
import os
from concurrent.futures import ThreadPoolExecutor
from dateutil import parser

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_session_attendance(creds, event, now_dt):
    """Worker function to fetch attendance for a single session."""
    summary = event.get('summary', 'No Title')
    start_str = event['start'].get('dateTime', event['start'].get('date'))
    end_str = event['end'].get('dateTime', event['end'].get('date'))
    
    start_dt = parser.parse(start_str)
    end_dt = parser.parse(end_str)
    
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=datetime.timezone.utc)
    else:
        start_dt = start_dt.astimezone(datetime.timezone.utc)

    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=datetime.timezone.utc)
    else:
        end_dt = end_dt.astimezone(datetime.timezone.utc)
    
    monitor_start = now_dt + datetime.timedelta(minutes=10)
    is_active = (start_dt <= now_dt <= end_dt)
    is_upcoming = (now_dt < start_dt <= monitor_start)

    if not (is_active or is_upcoming):
        return None

    status = "[ACTIVE]" if is_active else "[UPCOMING]"
    result = {
        "summary": summary,
        "status": status,
        "schedule": f"{start_dt.strftime('%H:%M')} - {end_dt.strftime('%H:%M')}",
        "participants": "No Meet link",
        "has_link": False
    }

    meet_link = calendar_client.extract_meet_link(event)
    if meet_link:
        result["has_link"] = True
        conf_code = meet_link.split('/')[-1].split('?')[0]
        filter_query = f'space.meeting_code="{conf_code}"'
        
        records = meet_client.list_conference_records(creds, filter_query=filter_query)
        if not records:
            result["participants"] = "No active conference detected."
        else:
            record = records[0]
            conf_id = record.get('name')
            participants = meet_client.get_participants(creds, conf_id)
            
            if not participants:
                result["participants"] = "Waiting for participants..."
            else:
                names = [p.get('signedinUser', {}).get('displayName', 'Unknown/Anonymous') for p in participants]
                result["participants"] = f"Participants ({len(names)}): {', '.join(names)}"
    
    return result

def main():
    try:
        print("Authenticating...")
        creds = auth.authenticate()
        print("Authentication successful.")

        while True:
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            start_of_day = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + datetime.timedelta(days=1)
            
            time_min = start_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            time_max = end_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

            # Fetch events (increased to 250)
            events = calendar_client.get_upcoming_events(creds, max_results=250, time_min=time_min, time_max=time_max)
            
            clear_screen()
            print(f"=== Meet Monitor - {now_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC ===")
            print(f"Monitoring today's sessions ({start_of_day.date()})\n")

            if not events:
                print("No sessions found for today.")
            else:
                # Use ThreadPoolExecutor to check attendance in parallel
                with ThreadPoolExecutor(max_workers=10) as executor:
                    futures = [executor.submit(get_session_attendance, creds, event, now_dt) for event in events]
                    results = [f.result() for f in futures if f.result() is not None]

                if not results:
                    print("No sessions are currently active or starting within 10 minutes.")
                else:
                    for res in results:
                        print(f"{res['status']} {res['summary']}")
                        print(f"  Schedule: {res['schedule']}")
                        print(f"  {res['participants']}")
                        print("-" * 40)

            print(f"\nNext update in 30 seconds... (Ctrl+C to stop)")
            time.sleep(30)

    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()

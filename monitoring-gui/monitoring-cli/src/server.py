from flask import Flask, jsonify, request
from flask_cors import CORS
import auth
import calendar_client
import meet_client
import datetime
from concurrent.futures import ThreadPoolExecutor
from dateutil import parser
import threading
import time

app = Flask(__name__)
CORS(app)

# Global storage for current state
current_sessions = []
creds = None
lock = threading.Lock()

def update_monitor():
    global current_sessions, creds
    print("🚀 Background Monitor started.")
    try:
        print("🔑 Authenticating...")
        creds = auth.authenticate()
        print("✅ Authentication successful.")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return
    
    while True:
        try:
            print("📅 Fetching events for today...")
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            start_of_day = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + datetime.timedelta(days=1)
            
            time_min = start_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            time_max = end_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

            # Fetch up to 500 events to ensure we don't miss anything
            events = calendar_client.get_upcoming_events(creds, max_results=500, time_min=time_min, time_max=time_max)
            print(f"🔎 Found {len(events)} events.")
            
            # Prepare new session list
            new_initial_sessions = []
            for event in events:
                summary = event.get('summary', 'No Title')
                start_str = event['start'].get('dateTime', event['start'].get('date'))
                end_str = event['end'].get('dateTime', event['end'].get('date'))
                meet_link = calendar_client.extract_meet_link(event)
                
                new_initial_sessions.append({
                    "id": event.get('id'),
                    "summary": summary,
                    "meetingLink": meet_link or "",
                    "startTime": start_str,
                    "endTime": end_str,
                    "participants": [],
                    "isRecording": False,
                    "status": "IDLE"
                })
            
            # Anti-flicker: Only update the main list if the structure has changed
            with lock:
                if not current_sessions or len(current_sessions) != len(new_initial_sessions):
                    current_sessions = new_initial_sessions

            # Worker to enrich data
            def process_attendance(session_orig):
                session = session_orig.copy()
                if not session["meetingLink"]:
                    return session
                
                try:
                    start_dt = parser.parse(session["startTime"])
                    end_dt = parser.parse(session["endTime"])
                    if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=datetime.timezone.utc)
                    else: start_dt = start_dt.astimezone(datetime.timezone.utc)
                    if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=datetime.timezone.utc)
                    else: end_dt = end_dt.astimezone(datetime.timezone.utc)

                    monitor_start = now_dt + datetime.timedelta(minutes=10)
                    
                    if start_dt <= now_dt <= end_dt:
                        session["status"] = "ACTIVE"
                    elif now_dt < start_dt <= monitor_start:
                        session["status"] = "UPCOMING"
                    
                    if session["status"] in ["ACTIVE", "UPCOMING"]:
                        conf_code = session["meetingLink"].split('/')[-1].split('?')[0]
                        records = meet_client.list_conference_records(creds, filter_query=f'space.meeting_code="{conf_code}"')
                        if records:
                            conf_id = records[0].get('name')
                            p_data = meet_client.get_participants(creds, conf_id)
                            session["participants"] = [
                                { "name": p.get('signedinUser', {}).get('displayName', 'Unknown'), "isActive": True } 
                                for p in p_data
                            ]
                            recs = meet_client.get_recordings(creds, conf_id)
                            session["isRecording"] = any(not r.get('endTime') for r in recs) if recs else False
                except Exception:
                    pass
                return session

            with ThreadPoolExecutor(max_workers=25) as executor:
                final_sessions = list(executor.map(process_attendance, new_initial_sessions))

            with lock:
                current_sessions = final_sessions
                
            print(f"✅ Full update complete ({len(current_sessions)} sessions)")
            
        except Exception as e:
            print(f"❌ Monitor Error: {e}")
            
        time.sleep(30)

@app.route('/sessions')
def get_sessions():
    with lock:
        return jsonify(current_sessions)

if __name__ == '__main__':
    monitor_thread = threading.Thread(target=update_monitor, daemon=True)
    monitor_thread.start()
    app.run(port=3001, host='0.0.0.0')

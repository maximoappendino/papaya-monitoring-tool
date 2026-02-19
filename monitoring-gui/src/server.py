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

            events = calendar_client.get_upcoming_events(creds, max_results=250, time_min=time_min, time_max=time_max)
            print(f"🔎 Found {len(events)} events. Initializing UI...")
            
            # 1. Immediate Update: Show all meetings as IDLE first
            initial_sessions = []
            for event in events:
                summary = event.get('summary', 'No Title')
                start_str = event['start'].get('dateTime', event['start'].get('date'))
                end_str = event['end'].get('dateTime', event['end'].get('date'))
                meet_link = calendar_client.extract_meet_link(event)
                
                initial_sessions.append({
                    "id": event.get('id'),
                    "summary": summary,
                    "meetingLink": meet_link or "",
                    "startTime": start_str,
                    "endTime": end_str,
                    "participants": [],
                    "isRecording": False,
                    "status": "IDLE"
                })
            
            with lock:
                current_sessions = initial_sessions

            # 2. Parallel Pass: Fetch detailed attendance
            def process_attendance(session):
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
                            
                            # 1. Fetch Participants
                            p_data = meet_client.get_participants(creds, conf_id)
                            session["participants"] = [
                                {
                                    "name": p.get('signedinUser', {}).get('displayName', 'Unknown'),
                                    "isActive": True,
                                    "joinTime": "" 
                                } for p in p_data
                            ]

                            # 2. Fetch Recording Status
                            recs = meet_client.get_recordings(creds, conf_id)
                            # If there's a recording record without an end time, it's likely active
                            session["isRecording"] = any(not r.get('endTime') for r in recs) if recs else False
                except Exception as e:
                    print(f"Error processing {session['summary']}: {e}")
                
                return session

            with ThreadPoolExecutor(max_workers=20) as executor:
                final_sessions = list(executor.map(process_attendance, initial_sessions))

            with lock:
                current_sessions = final_sessions
                
            print(f"✅ Full update complete ({len(current_sessions)} sessions) at {now_dt}")
            
        except Exception as e:
            print(f"❌ Monitor Error: {e}")
            
        time.sleep(30)

@app.route('/sessions')
def get_sessions():
    with lock:
        return jsonify(current_sessions)

if __name__ == '__main__':
    # Start monitor in thread
    monitor_thread = threading.Thread(target=update_monitor, daemon=True)
    monitor_thread.start()
    
    # Start Flask
    app.run(port=3001, host='0.0.0.0')

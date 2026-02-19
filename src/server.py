from flask import Flask, jsonify, request
from flask_cors import CORS
try:
    from . import auth
    from . import calendar_client
    from . import meet_client
except ImportError:
    import auth
    import calendar_client
    import meet_client
import datetime
from concurrent.futures import ThreadPoolExecutor
from dateutil import parser
import threading
import time
import csv
import os
import re

app = Flask(__name__)
CORS(app)

# Global storage
calendar_skeleton = []
enriched_sessions = []
active_timeframes = [] 
creds = None
lock = threading.Lock()

# Database matching data
name_db = [] # List of { 'norm_name': str, 'email': str, 'type': 'tutor'|'student' }

import unicodedata

def normalize_name(name):
    if not name: return ""
    # Remove accents/diacritics
    name = "".join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')
    # Lowercase
    name = name.lower()
    # Remove special chars and extra spaces (except comma)
    name = re.sub(r'[^a-z0-9\s,]', '', name)
    # Handle "Last, First" -> "First Last"
    if ',' in name:
        parts = name.split(',')
        if len(parts) >= 2:
            name = parts[1].strip() + " " + parts[0].strip()
    # Final cleanup of extra spaces
    return " ".join(name.split())

def load_databases():
    global name_db
    db = []
    seen_emails = set()
    
    # Load Students
    if os.path.exists('students.csv'):
        try:
            with open('students.csv', mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get('student_name') or ""
                    email = (row.get('email') or "").lower().strip()
                    if name and email and email not in seen_emails:
                        db.append({
                            'norm_name': normalize_name(name),
                            'email': email,
                            'type': 'student'
                        })
                        seen_emails.add(email)
            print(f"📚 Loaded students database.")
        except Exception as e:
            print(f"❌ Error loading students.csv: {e}")

    # Load Tutors
    if os.path.exists('tutors.csv'):
        try:
            with open('tutors.csv', mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get('no_id_name') or ""
                    email = (row.get('email') or "").lower().strip()
                    if name and email and email != 'n/a' and not email.startswith('#') and email not in seen_emails:
                        db.append({
                            'norm_name': normalize_name(name),
                            'email': email,
                            'type': 'tutor'
                        })
                        seen_emails.add(email)
            print(f"📚 Loaded tutors database.")
        except Exception as e:
            print(f"❌ Error loading tutors.csv: {e}")
            
    name_db = db

def find_in_db(display_name):
    norm_display = normalize_name(display_name)
    if not norm_display: return None
    
    # 1. Try exact match on normalized name
    for entry in name_db:
        if entry['norm_name'] == norm_display:
            return entry
            
    # 2. Aggressive Containment
    for entry in name_db:
        if entry['norm_name'] in norm_display or norm_display in entry['norm_name']:
            # Extra check: ensure it's not just a tiny substring
            if len(norm_display) > 3 and len(entry['norm_name']) > 3:
                return entry
            
    # 3. Word-based overlap (at least 2 words must match)
    display_words = set(norm_display.split())
    for entry in name_db:
        db_words = set(entry['norm_name'].split())
        overlap = display_words.intersection(db_words)
        if len(overlap) >= 2:
            return entry
                    
    return None

def get_hour_label(iso_str):
    try:
        dt = parser.parse(iso_str)
        return f"{dt.hour:02d}:00"
    except:
        return "00:00"

def skeleton_loader():
    global calendar_skeleton, creds
    while True:
        try:
            if not creds:
                time.sleep(1)
                continue
            
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            start_of_day = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + datetime.timedelta(days=1)
            
            t_min = start_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            t_max = end_of_day.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

            events = calendar_client.get_upcoming_events(creds, max_results=5000, time_min=t_min, time_max=t_max)
            
            new_skeleton = []
            for event in events:
                attendees = []
                for a in event.get('attendees', []):
                    attendees.append({
                        "email": a.get('email', '').lower(),
                        "name": a.get('displayName', 'No Name'),
                        "response": a.get('responseStatus', 'needsAction')
                    })

                new_skeleton.append({
                    "id": event.get('id'),
                    "summary": event.get('summary', 'No Title'),
                    "meetingLink": calendar_client.extract_meet_link(event) or "",
                    "startTime": event['start'].get('dateTime', event['start'].get('date')),
                    "endTime": event['end'].get('dateTime', event['end'].get('date')),
                    "attendees": attendees,
                    "participants": [],
                    "isRecording": False,
                    "status": "IDLE"
                })
            
            new_skeleton.sort(key=lambda x: parser.parse(x["startTime"]).timestamp())
            
            with lock:
                calendar_skeleton = new_skeleton
                if not enriched_sessions:
                    enriched_sessions = [s.copy() for s in calendar_skeleton]
            
            print(f"✅ [SKELETON] {len(calendar_skeleton)} events synced.")
        except Exception as e:
            print(f"❌ [SKELETON] Error: {e}")
        
        time.sleep(300)

def attendance_monitor():
    global enriched_sessions, calendar_skeleton, active_timeframes, creds
    while True:
        try:
            if not creds or not calendar_skeleton:
                time.sleep(2)
                continue
            
            with lock:
                current_active = list(active_timeframes)
            
            if not current_active:
                time.sleep(5)
                continue

            relevant_sessions = []
            other_sessions = []
            for s in calendar_skeleton:
                if get_hour_label(s["startTime"]) in current_active:
                    relevant_sessions.append(s.copy())
                else:
                    other_sessions.append(s)

            print(f"📡 [ATTENDANCE] Checking {len(relevant_sessions)} sessions in active windows...")
            
            def process_session(session):
                if not session["meetingLink"]: return session

                try:
                    conf_code = session["meetingLink"].split('/')[-1].split('?')[0]
                    filter_q = f'space.meeting_code="{conf_code}"'
                    records = meet_client.list_conference_records(creds, filter_query=filter_q)
                    records.sort(key=lambda r: r.get('startTime', ''), reverse=True)
                    
                    active_record = None
                    for r in records:
                        if not r.get('endTime'):
                            active_record = r
                            break
                    if not active_record and records:
                        active_record = records[0]

                    if active_record:
                        conf_id = active_record.get('name')
                        p_data = meet_client.get_participants(creds, conf_id)
                        
                        active_p = []
                        for p in p_data:
                            if not p.get('latestEndTime'):
                                display_name = "Guest"
                                if p.get('signedinUser'): display_name = p['signedinUser'].get('displayName', 'User')
                                elif p.get('anonymousUser'): display_name = p['anonymousUser'].get('displayName', 'Guest')
                                
                                # ATTEMPT DATABASE MATCH
                                match = find_in_db(display_name)
                                email = None
                                if match:
                                    email = match['email']
                                    print(f"🎯 Matched '{display_name}' to {email} ({match['type']})")
                                else:
                                    print(f"❓ No match found for '{display_name}' in database.")
                                
                                active_p.append({ 
                                    "name": display_name, 
                                    "email": email, # PASS EMAIL TO FRONTEND FOR PERFECT MATCHING
                                    "isActive": True 
                                })
                        
                        session["participants"] = active_p
                        session["status"] = "ACTIVE" if len(active_p) > 0 else "IDLE"
                        recs = meet_client.get_recordings(creds, conf_id)
                        session["isRecording"] = any(not r.get('endTime') for r in recs) if recs else False
                    else:
                        session["status"] = "IDLE"
                        session["participants"] = []
                        
                except Exception as e:
                    print(f"Error enriching {session.get('summary')}: {e}")
                return session

            with ThreadPoolExecutor(max_workers=30) as executor:
                processed_relevant = list(executor.map(process_session, relevant_sessions))

            final_list = processed_relevant + other_sessions
            final_list.sort(key=lambda x: parser.parse(x["startTime"]).timestamp())

            with lock:
                enriched_sessions = final_list
            
        except Exception as e:
            print(f"❌ [ATTENDANCE] Error: {e}")
            
        time.sleep(20)

@app.route('/sessions')
def get_sessions():
    with lock:
        return jsonify(enriched_sessions if enriched_sessions else calendar_skeleton)

@app.route('/sync-config', methods=['POST'])
def update_sync_config():
    global active_timeframes
    data = request.json
    with lock:
        active_timeframes = data.get('timeframes', [])
    return jsonify({"success": True})

@app.route('/sessions/<session_id>/record', methods=['POST'])
def toggle_recording(session_id):
    return jsonify({"success": True})

if __name__ == '__main__':
    load_databases() # Load CSVs at startup
    creds = auth.authenticate()
    threading.Thread(target=skeleton_loader, daemon=True).start()
    threading.Thread(target=attendance_monitor, daemon=True).start()
    app.run(port=3001, host='0.0.0.0')

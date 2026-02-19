from googleapiclient.discovery import build

def list_conference_records(creds, filter_query=None):
    """
    Lists conference records.
    Note: Accessing conference records usually requires a Workspace account.
    """
    service = build('meet', 'v2', credentials=creds)
    
    print(f"Fetching conference records (filter: {filter_query})...")
    try:
        # We generally filter by start time or just list all
        request = service.conferenceRecords().list(filter=filter_query)
        response = request.execute()
        return response.get('conferenceRecords', [])
    except Exception as e:
        print(f"Error fetching conference records: {e}")
        return []

def get_participants(creds, conference_id):
    """
    Gets the list of participants for a specific conference record.
    conference_id is usually formatted as 'conferenceRecords/{id}'
    """
    service = build('meet', 'v2', credentials=creds)
    
    try:
        request = service.conferenceRecords().participants().list(parent=conference_id)
        response = request.execute()
        return response.get('participants', [])
    except Exception as e:
        print(f"Error fetching participants for {conference_id}: {e}")
        return []

def get_recordings(creds, conference_id):
    """
    Checks if there are any recordings for a specific conference record.
    Note: Real-time recording status is limited in the API; this typically finds 
    ongoing or completed recording resources.
    """
    service = build('meet', 'v2', credentials=creds)
    try:
        request = service.conferenceRecords().recordings().list(parent=conference_id)
        response = request.execute()
        return response.get('recordings', [])
    except Exception as e:
        # 403 or 404 is common if no recordings exist or feature is disabled
        return []

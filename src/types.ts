export interface Attendee {
  email: string;
  name: string;
  response: string;
}

export interface Participant {
  name: string;
  isActive: boolean;
  email?: string; // Optional if we can resolve it
}

export interface Session {
  id: string;
  summary: string;
  meetingLink: string;
  participants: Participant[];
  attendees: Attendee[];
  isRecording: boolean;
  startTime: string;
  endTime: string;
  status: 'IDLE' | 'ACTIVE' | 'UPCOMING';
}

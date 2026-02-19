export interface Participant {
  name: string;
  joinTime: string;
  leaveTime?: string;
  isActive: boolean;
}

export interface Session {
  id: string;
  summary: string;
  meetingLink: string;
  participants: Participant[];
  isRecording: boolean;
  startTime: string;
  endTime: string;
  status: 'IDLE' | 'ACTIVE' | 'UPCOMING';
}

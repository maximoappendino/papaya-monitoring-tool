import React from 'react';
import type { Session } from './types';

interface SessionTileProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

const SessionTile: React.FC<SessionTileProps> = ({ session, isSelected, onClick }) => {
  const activeParticipants = session.participants.filter(p => p.isActive);
  const count = activeParticipants.length;
  const hasParticipants = count > 0;
  
  // Format meeting ID
  const meetingId = session.meetingLink ? session.meetingLink.split('/').pop() : 'N/A';

  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-square border-2 rounded-lg cursor-pointer transition-all duration-200 p-2 flex flex-col items-center justify-center gap-1
        ${isSelected ? 'border-blue-500 bg-slate-800 scale-105 z-10 shadow-lg' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}
        ${session.status === 'ACTIVE' ? 'ring-1 ring-green-500/30' : ''}
      `}
    >
      {/* Recording Indicator */}
      {session.isRecording && (
        <div className="absolute top-1 right-1 flex items-center gap-1">
          <span className="text-[6px] text-red-500 font-black uppercase">REC</span>
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_5px_red]" />
        </div>
      )}

      <div className="text-[7px] text-slate-500 font-mono absolute top-1 left-2 truncate w-[70%] uppercase tracking-tighter">
        {meetingId}
      </div>

      {/* Participant Grid/Squares */}
      <div className="flex flex-wrap gap-0.5 items-center justify-center max-w-[80%] min-h-[20px]">
        {[...Array(Math.min(count, 12))].map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-[1px] bg-orange-500 shadow-[0_0_3px_rgba(249,115,22,0.4)]" />
        ))}
        {count > 12 && <span className="text-[6px] text-slate-500">+{count - 12}</span>}
        {!hasParticipants && <div className="w-1.5 h-1.5 rounded-[1px] bg-slate-800" />}
      </div>

      <div className="text-center mt-1 w-full px-1">
        {/* Participant Names List (up to 5) */}
        <div className="flex flex-col gap-0 min-h-[40px] justify-center overflow-hidden">
          {activeParticipants.slice(0, 5).map((p, i) => (
            <div key={i} className="text-[7px] text-slate-400 truncate leading-tight font-medium">
              • {p.name}
            </div>
          ))}
          {count > 5 && <div className="text-[6px] text-slate-500 mt-0.5">+{count - 5} more</div>}
        </div>

        <div className="text-[8px] font-bold text-slate-100 truncate mt-1 leading-tight uppercase border-t border-white/5 pt-1">
          {session.summary}
        </div>
        <div className={`text-[6px] font-black mt-0.5 ${session.status === 'ACTIVE' ? 'text-green-500' : 'text-slate-500'}`}>
          {session.status}
        </div>
      </div>
    </div>
  );
};

export default SessionTile;

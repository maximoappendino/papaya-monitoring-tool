import React, { memo } from 'react';
import type { Session } from './types';

interface SessionTileProps {
  session: Session;
  isSelected: boolean;
  gridSize: 'small' | 'medium' | 'big';
  onClick: () => void;
  onDoubleClick: () => void;
}

const SCHOOL_EMAILS = [
  'manor@papayatutor.com', 'ops@papayatutor.com', 'ssaprogram@papayatutor.com', 
  'saisd@papayatutor.com', 'dilleyisd@papayatutor.com', 'lewis@papayatutor.com', 
  'devineisd@papayatutor.com', 'bhisd@papayatutor.com', 'lotus@papayatutor.com', 
  'poteetisd@papayatutor.com', 'nataliaisd@papayatutor.com', 'lavernia@papayatutor.com'
];

const SessionTile: React.FC<SessionTileProps> = memo(({ session, isSelected, gridSize, onClick, onDoubleClick }) => {
  const meetingId = session.meetingLink ? session.meetingLink.split('/').pop() : 'N/A';
  
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return '--:--'; }
  };

  const getTimeframe = () => `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;

  // Dynamic sizing based on gridSize
  const styles = {
    small: { header: 'text-[9px]', time: 'text-[11px]', name: 'text-[11px]', email: 'text-[8px]', title: 'text-[11px]', padding: 'p-2', gap: 'gap-1.5', box: 'w-4 h-4', minH: 'min-h-[160px]' },
    medium: { header: 'text-[12px]', time: 'text-[16px]', name: 'text-[16px]', email: 'text-[11px]', title: 'text-[16px]', padding: 'p-4', gap: 'gap-3', box: 'w-5 h-5', minH: 'min-h-[240px]' },
    big: { header: 'text-[18px]', time: 'text-[26px]', name: 'text-[26px]', email: 'text-[16px]', title: 'text-[26px]', padding: 'p-8', gap: 'gap-6', box: 'w-8 h-8', minH: 'min-h-[450px]' }
  }[gridSize];

  // REFINED MATCHING LOGIC
  const getCategorizedGuests = () => {
    const tutors: { name: string; email: string; isJoined: boolean; joinedName?: string }[] = [];
    const students: { name: string; email: string; isJoined: boolean; joinedName?: string }[] = [];
    const schools: { name: string; email: string; isJoined: boolean; joinedName?: string }[] = [];
    const others: { name: string; email: string; isJoined: boolean }[] = [];

    const usedParticipantIndices = new Set<number>();
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    session.attendees.forEach(guest => {
      const guestEmail = guest.email.toLowerCase().trim();
      const guestNameClean = clean(guest.name);

      const matchedIndex = session.participants.findIndex((p, idx) => {
        if (usedParticipantIndices.has(idx)) return false;
        if (p.email && p.email.toLowerCase() === guestEmail) return true;
        const pNameClean = clean(p.name);
        if (!pNameClean || !guestNameClean) return false;
        return pNameClean === guestNameClean || pNameClean.includes(guestNameClean) || guestNameClean.includes(pNameClean);
      });

      const isJoined = matchedIndex !== -1;
      const joinedName = isJoined ? session.participants[matchedIndex].name : undefined;
      if (isJoined) usedParticipantIndices.add(matchedIndex);

      const data = { name: guest.name, email: guest.email, isJoined, joinedName };
      
      if (SCHOOL_EMAILS.includes(guestEmail)) {
        schools.push(data);
      } else if (guestEmail.endsWith('@papayatutor.com') || guestEmail.endsWith('@gmail.com')) {
        tutors.push(data);
      } else if (guestEmail.endsWith('@live.saisd.net')) {
        students.push(data);
      } else {
        others.push({ ...data, isJoined });
      }
    });

    session.participants.forEach((p, idx) => {
      if (usedParticipantIndices.has(idx)) return;
      const pEmail = p.email?.toLowerCase() || "";
      const isJoined = true;
      if (SCHOOL_EMAILS.includes(pEmail)) {
        schools.push({ name: p.name, email: pEmail, isJoined, joinedName: p.name });
      } else if (pEmail.endsWith('@papayatutor.com') || pEmail.endsWith('@gmail.com')) {
        tutors.push({ name: p.name, email: pEmail, isJoined, joinedName: p.name });
      } else if (pEmail.endsWith('@live.saisd.net')) {
        students.push({ name: p.name, email: pEmail, isJoined, joinedName: p.name });
      } else {
        others.push({ name: p.name, email: pEmail || 'Joined via link', isJoined: true });
      }
    });

    return { tutors, students, schools, others };
  };

  const { tutors, students, schools, others } = getCategorizedGuests();

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.summary);
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative w-full border-2 rounded-xl cursor-pointer transition-all duration-300 flex flex-col overflow-hidden ${styles.minH}
        ${isSelected ? 'border-[#F76F22] bg-slate-800 scale-[1.02] z-10 shadow-2xl shadow-[#F76F22]/20' : 'border-slate-800 bg-[#0a0a0a] hover:border-slate-600'}
        ${session.status === 'ACTIVE' ? 'ring-1 ring-[#F76F22]/20' : ''}
      `}
    >
      {/* Header Row */}
      <div className={`flex justify-between items-center ${styles.padding} bg-white/5 border-b border-white/5`}>
        <span className={`${styles.header} font-mono text-slate-500 uppercase tracking-tighter`}>{meetingId}</span>
        <span className={`${styles.time} font-black text-white`}>{getTimeframe()}</span>
        <div>
          {session.isRecording && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 animate-pulse">
              <span className="text-[7px] font-black text-white">REC</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className={`flex-1 ${styles.padding} flex flex-col ${styles.gap} overflow-y-auto`}>
        {schools.map((s, i) => (
          <div key={`sch-${i}`} className="flex items-center gap-3">
            <div className={`${styles.box} rounded-sm border-2 ${s.isJoined ? 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'border-white bg-transparent opacity-20'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`${styles.name} font-black truncate uppercase leading-none ${s.isJoined ? 'text-white' : 'text-slate-600'}`}>
                {s.isJoined ? (s.joinedName || s.name) : '---'}
              </span>
              <span className={`${styles.email} text-slate-500 truncate leading-none mt-1`}>{s.email}</span>
            </div>
          </div>
        ))}

        {tutors.map((t, i) => (
          <div key={`t-${i}`} className="flex items-center gap-3">
            <div className={`${styles.box} rounded-sm border-2 ${t.isJoined ? 'bg-[#F76F22] border-[#F76F22]' : 'border-[#F76F22] bg-transparent opacity-30'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`${styles.name} font-black truncate uppercase leading-none ${t.isJoined ? 'text-[#F76F22]' : 'text-slate-600'}`}>
                {t.isJoined ? (t.joinedName || t.name) : '---'}
              </span>
              <span className={`${styles.email} text-slate-500 truncate leading-none mt-1`}>{t.email}</span>
            </div>
          </div>
        ))}

        {students.map((s, i) => (
          <div key={`s-${i}`} className="flex items-center gap-3">
            <div className={`${styles.box} rounded-sm border-2 ${s.isJoined ? 'bg-green-500 border-green-500' : 'border-green-500 bg-transparent opacity-30'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`${styles.name} font-black truncate uppercase leading-none ${s.isJoined ? 'text-green-500' : 'text-slate-600'}`}>
                {s.isJoined ? (s.joinedName || s.name) : '---'}
              </span>
              <span className={`${styles.email} text-slate-500 truncate leading-none mt-1`}>{s.email}</span>
            </div>
          </div>
        ))}

        {others.map((o, i) => (
          <div key={`o-${i}`} className="flex items-center gap-3">
            <div className={`${styles.box} rounded-sm border-2 ${o.isJoined ? 'bg-yellow-500 border-yellow-500' : 'border-yellow-500 bg-transparent opacity-30'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`${styles.name} font-black truncate uppercase leading-none ${o.isJoined ? 'text-yellow-500' : 'text-slate-600'}`}>
                {o.isJoined ? o.name : '---'}
              </span>
              <span className={`${styles.email} text-slate-500 truncate leading-none mt-1`}>{o.email}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-auto ${styles.padding} border-t border-white/5 bg-black/40 flex flex-col gap-2`}>
        <div className={`${styles.title} font-bold text-slate-300 truncate leading-tight uppercase`}>
          {session.summary}
        </div>
        <button onClick={handleCopyTitle} className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/5 text-[8px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest">
          Copy Title Only
        </button>
      </div>
    </div>
  );
});

export default SessionTile;

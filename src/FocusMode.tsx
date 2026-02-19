import React, { useEffect, useState } from 'react';
import type { Session } from './types';

interface FocusModeProps {
  session: Session;
  onClose: () => void;
}

const FocusMode: React.FC<FocusModeProps> = ({ session, onClose }) => {
  const [localRecording, setLocalRecording] = useState(session.isRecording);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const toggleRecording = async () => {
    const action = localRecording ? 'STOP' : 'START';
    setIsRequesting(true);
    try {
      const host = window.location.hostname;
      const response = await fetch(`http://${host}:3001/sessions/${session.id}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (response.ok) setLocalRecording(!localRecording);
    } catch (err) {
      alert("Failed to communicate with recording engine.");
    } finally {
      setIsRequesting(false);
    }
  };

  const meetingId = session.meetingLink ? session.meetingLink.split('/').pop() : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200 p-6 md:p-12 text-slate-200">
      <div className="w-full h-full max-w-6xl flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white">{session.summary}</h2>
                {(session.isRecording || localRecording) && (
                  <span className="flex items-center gap-2 bg-red-600/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div> RECORDING ACTIVE
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-mono text-xs mt-0.5 uppercase tracking-widest">ID: <span className="text-[#F76F22]">{meetingId}</span></p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button onClick={toggleRecording} disabled={isRequesting} className={`px-6 py-2.5 rounded-lg font-bold transition-all border flex items-center gap-2 text-xs ${localRecording ? 'bg-red-600 hover:bg-red-500 border-red-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'} ${isRequesting ? 'opacity-50 cursor-wait' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${localRecording ? 'bg-white animate-pulse' : 'bg-red-500'} ${isRequesting ? 'animate-ping' : ''}`} />
              {isRequesting ? "PROCESSING..." : (localRecording ? "STOP RECORDING" : "START RECORDING")}
            </button>
             {session.meetingLink && (
               <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="bg-[#F76F22] hover:bg-[#d65b1a] text-white px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 text-xs">JOIN MEETING</a>
             )}
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-bold transition-all border border-slate-700 text-xs">BACK</button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
           <div className="flex flex-col gap-4 overflow-hidden">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Expected Guests (Calendar)</h3>
              <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 overflow-y-auto">
                 <div className="flex flex-col gap-4">
                    {session.attendees.map((guest, i) => {
                       const isJoined = session.participants.some(p => p.name.toLowerCase().includes(guest.name.toLowerCase()));
                       const isTutor = guest.email.endsWith('@papayatutor.com') || guest.email.endsWith('@gmail.com');
                       const isStudent = guest.email.endsWith('@live.saisd.net');
                       return (
                         <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-2 rounded-full ${isTutor ? 'bg-[#F76F22]' : isStudent ? 'bg-green-500' : 'bg-yellow-500'}`} />
                               <div className="flex flex-col">
                                  <span className="font-bold text-sm text-white uppercase">{guest.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{guest.email}</span>
                               </div>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${isJoined ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-slate-800 text-slate-500'}`}>
                               {isJoined ? 'JOINED' : 'MISSING'}
                            </span>
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-4 overflow-hidden">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Live Presence (Meet API)</h3>
              <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 overflow-y-auto">
                 <div className="flex flex-col gap-2">
                    {session.participants.length === 0 ? (
                      <div className="py-12 text-center text-slate-600 italic text-sm">No live data detected.</div>
                    ) : (
                      session.participants.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#F76F22]/5 p-3 rounded-xl border border-[#F76F22]/10">
                           <div className="w-2 h-2 rounded-sm bg-[#F76F22]" />
                           <span className="font-bold text-sm text-white uppercase">{p.name}</span>
                        </div>
                      ))
                    )}
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
           <p className="text-[10px] text-slate-500 leading-relaxed italic text-center uppercase tracking-widest">
             {session.summary} | {new Date(session.startTime).toLocaleTimeString()} - {new Date(session.endTime).toLocaleTimeString()}
           </p>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;

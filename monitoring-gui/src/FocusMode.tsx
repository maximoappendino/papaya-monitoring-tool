import React, { useEffect } from 'react';
import type { Session } from './types';

interface FocusModeProps {
  session: Session;
  onClose: () => void;
}

const FocusMode: React.FC<FocusModeProps> = ({ session, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const meetingId = session.meetingLink ? session.meetingLink.split('/').pop() : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200 p-6 md:p-12 text-slate-200">
      <div className="w-full h-full max-w-5xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="Back (ESC)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white">{session.summary}</h2>
                {session.status === 'ACTIVE' && (
                  <span className="flex items-center gap-2 bg-green-600/20 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div> ACTIVE SESSION
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-mono text-xs mt-0.5">ID: <span className="text-blue-400">{meetingId}</span></p>
            </div>
          </div>
          
          <div className="flex gap-3">
             {session.meetingLink && (
               <a 
                href={session.meetingLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
              >
                JOIN MEETING
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
             )}
            <button 
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all border border-slate-700"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Main Content (Participant Real-time Log) */}
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Attendance (Updated via Workspace API)</h3>
           
           <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 overflow-y-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-4">
                       <th className="pb-4 font-black">Participant</th>
                       <th className="pb-4 font-black text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                    {session.participants.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-12 text-center text-slate-600 italic text-sm">No participants detected in this session.</td>
                      </tr>
                    ) : (
                      session.participants.map((p, i) => (
                        <tr key={i} className="text-sm">
                           <td className="py-4 flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]`}></div>
                              <span className="font-bold text-white">{p.name}</span>
                           </td>
                           <td className="py-4 text-right">
                              {p.isActive ? (
                                <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">PRESENT</span>
                              ) : (
                                <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-full">AWAY</span>
                              )}
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
           <p className="text-[10px] text-slate-500 leading-relaxed italic text-center uppercase tracking-widest">
             Meeting: {session.summary} | Time: {new Date(session.startTime).toLocaleTimeString()} - {new Date(session.endTime).toLocaleTimeString()}
           </p>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from './types';
import SessionTile from './SessionTile';
import FocusMode from './FocusMode';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConnectionStatus('CONNECTING');
    const syncAll = async () => {
      try {
        const response = await fetch('http://localhost:3001/sessions');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setSessions(data);
        setConnectionStatus('CONNECTED');
      } catch (err) {
        setConnectionStatus('ERROR');
      }
    };

    const interval = setInterval(syncAll, 10000); // UI poll every 10s
    syncAll();

    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFocusMode) {
      if (e.key === 'Escape') setIsFocusMode(false);
      return;
    }
    const cols = window.innerWidth >= 1280 ? 12 : (window.innerWidth >= 768 ? 6 : 3);
    let nextIndex = selectedIndex;
    switch (e.key.toLowerCase()) {
      case 'arrowleft': case 'h': nextIndex = Math.max(0, selectedIndex - 1); break;
      case 'arrowright': case 'l': nextIndex = Math.min(sessions.length - 1, selectedIndex + 1); break;
      case 'arrowup': case 'k': nextIndex = Math.max(0, selectedIndex - cols); break;
      case 'arrowdown': case 'j': nextIndex = Math.min(sessions.length - 1, selectedIndex + cols); break;
      case 'f': case 'enter': if (sessions.length > 0) setIsFocusMode(true); break;
      case 'm': 
        if (sessions[selectedIndex]?.meetingLink) {
          window.open(sessions[selectedIndex].meetingLink, '_blank');
        }
        break;
      case 'escape': case 'backspace': 
        if (isFocusMode) setIsFocusMode(false); 
        break;
      default: return;
    }
    if (nextIndex !== selectedIndex) {
      e.preventDefault();
      setSelectedIndex(nextIndex);
      const grid = scrollContainerRef.current;
      if (grid) {
        const tile = grid.children[nextIndex] as HTMLElement;
        tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIndex, isFocusMode, sessions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen w-screen bg-black text-slate-200 flex flex-col font-sans overflow-hidden">
      <header className="shrink-0 p-4 flex justify-between items-center border-b border-white/10 bg-slate-950">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-white italic tracking-tighter">
            LIVE<span className="text-blue-500">MONITOR</span>
          </h1>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${
               connectionStatus === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
               connectionStatus === 'ERROR' ? 'bg-red-500' : 'bg-orange-500 animate-pulse'
             }`}></div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
               {connectionStatus === 'ERROR' ? 'No Backend Connected' : `Status: ${connectionStatus}`}
             </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-[#050505] scroll-smooth" ref={scrollContainerRef}>
        {sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
             <p className="text-sm font-black uppercase tracking-[0.3em]">Operational Dashboard v3.1</p>
             <p className="text-[10px] text-slate-500">Waiting for data from API...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 xl:grid-cols-12 gap-2">
            {sessions.map((session, index) => (
              <SessionTile key={session.id} session={session} isSelected={index === selectedIndex} onClick={() => setSelectedIndex(index)} />
            ))}
          </div>
        )}
      </main>

      <footer className="shrink-0 p-3 border-t border-white/5 bg-slate-950 text-[9px] text-slate-500 uppercase font-black flex justify-between">
        <div className="flex gap-6">
          <span>{sessions.length} Meetings Today</span>
          <span className="text-slate-700">|</span>
          <span>[Arrows/HJKL] Navigate</span>
          <span className="text-slate-700">|</span>
          <span>[F/ENTER] Inspect</span>
          <span className="text-slate-700">|</span>
          <span>[M] Join</span>
          <span className="text-slate-700">|</span>
          <span>[ESC/BACKSPACE] Back</span>
        </div>
        <div className="flex gap-4">
          <span className="text-orange-500">● Present</span>
          <span className="text-slate-700">● Empty</span>
        </div>
      </footer>

      {isFocusMode && sessions[selectedIndex] && (
        <FocusMode session={sessions[selectedIndex]} onClose={() => setIsFocusMode(false)} />
      )}
    </div>
  );
}

export default App;

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from './types';
import SessionTile from './SessionTile';

type GridSize = 'small' | 'medium' | 'big';

const SCHOOL_EMAILS = [
  'manor@papayatutor.com', 'ops@papayatutor.com', 'ssaprogram@papayatutor.com', 
  'saisd@papayatutor.com', 'dilleyisd@papayatutor.com', 'lewis@papayatutor.com', 
  'devineisd@papayatutor.com', 'bhisd@papayatutor.com', 'lotus@papayatutor.com', 
  'poteetisd@papayatutor.com', 'nataliaisd@papayatutor.com', 'lavernia@papayatutor.com'
];

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTimeframes, setActiveTimeframes] = useState<string[]>([]);
  const [gridSize, setGridSize] = useState<GridSize>('small');
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/sessions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSessions(data);
      setConnectionStatus('CONNECTED');
    } catch (err) {
      setConnectionStatus('ERROR');
    }
  }, []);

  const updateSyncConfig = useCallback(async (timeframes: string[]) => {
    try {
      await fetch('/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframes })
      });
    } catch (err) {
      console.error("Failed to update sync config");
    }
  }, []);

  useEffect(() => {
    setConnectionStatus('CONNECTING');
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const toggleTimeframeSync = (hour: string) => {
    const newTimeframes = activeTimeframes.includes(hour)
      ? activeTimeframes.filter(h => h !== hour)
      : [...activeTimeframes, hour];
    setActiveTimeframes(newTimeframes);
    updateSyncConfig(newTimeframes);
  };

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: Session[] } = {};
    sessions.forEach((s) => {
      const date = new Date(s.startTime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes() < 30 ? '00' : '30';
      const label = `${hours}:${minutes}`;
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions]);

  const flatSessions = useMemo(() => sessions, [sessions]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const gridConfig = { small: 12, medium: 6, big: 3 };
    const cols = gridConfig[gridSize];
    
    let nextIndex = selectedIndex;
    switch (e.key.toLowerCase()) {
      case 'arrowleft': case 'h': nextIndex = Math.max(0, selectedIndex - 1); break;
      case 'arrowright': case 'l': nextIndex = Math.min(flatSessions.length - 1, selectedIndex + 1); break;
      case 'arrowup': case 'k': nextIndex = Math.max(0, selectedIndex - cols); break;
      case 'arrowdown': case 'j': nextIndex = Math.min(flatSessions.length - 1, selectedIndex + cols); break;
      case 'm': 
        if (flatSessions[selectedIndex]?.meetingLink) {
          window.open(flatSessions[selectedIndex].meetingLink, '_blank');
        }
        break;
      case 'c':
        const s = flatSessions[selectedIndex];
        if (s) {
          const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

          const tutors = s.attendees.filter(a => (a.email.endsWith('@papayatutor.com') || a.email.endsWith('@gmail.com')) && !SCHOOL_EMAILS.includes(a.email));
          const students = s.attendees.filter(a => a.email.endsWith('@live.saisd.net'));
          const schools = s.attendees.filter(a => SCHOOL_EMAILS.includes(a.email));
          
          const match = (guest: {name: string, email: string}) => s.participants.some(p => {
            if (p.email && p.email.toLowerCase() === guest.email.toLowerCase()) return true;
            const pN = clean(p.name);
            const gN = clean(guest.name);
            return pN === gN || pN.includes(gN) || gN.includes(pN);
          });

          const tutorNames = tutors.map(t => `${t.name} [${match(t) ? 'JOINED' : 'MISSING'}]`).join(', ') || 'N/A';
          const studentNames = students.map(st => `${st.name} [${match(st) ? 'JOINED' : 'MISSING'}]`).join(', ') || 'N/A';
          const schoolNames = schools.map(sch => `${sch.name} [${match(sch) ? 'JOINED' : 'MISSING'}]`).join(', ') || 'N/A';
          
          const peoplePresent = s.participants.map(p => p.name).join(', ') || 'NONE';

          const text = `SESSION: ${s.summary}\nTIMEFRAME: ${formatTime(s.startTime)} - ${formatTime(s.endTime)}\nSCHOOL: ${schoolNames}\nTUTOR: ${tutorNames}\nSTUDENT: ${studentNames}\nPEOPLE PRESENT:\n${peoplePresent}\nRECORDING: ${s.isRecording ? 'YES' : 'NO'}\nLINK: ${s.meetingLink}`;
          navigator.clipboard.writeText(text);
        }
        break;
      default: return;
    }

    if (nextIndex !== selectedIndex) {
      e.preventDefault();
      setSelectedIndex(nextIndex);
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const tile = container.querySelector(`[data-index="${nextIndex}"]`) as HTMLElement;
          if (tile) tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
  }, [selectedIndex, flatSessions, gridSize]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const gridCols = {
    small: 'grid-cols-4 md:grid-cols-8 xl:grid-cols-12',
    medium: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6',
    big: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
  };

  let globalTileIndex = 0;

  return (
    <div className="h-screen w-screen bg-black text-slate-200 flex flex-col font-sans overflow-hidden">
      <header className="shrink-0 p-4 flex justify-between items-center border-b border-white/10 bg-slate-950">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">
            PAPAYA <span className="text-[#F76F22]">OPS MONITOR TOOL</span>
          </h1>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-[#F76F22]' : 'bg-red-500 animate-pulse'}`}></div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{connectionStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/5">
            {(['small', 'medium', 'big'] as GridSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={`px-3 h-6 flex items-center justify-center rounded transition-all text-[8px] font-black uppercase ${gridSize === size ? 'bg-[#F76F22] text-white shadow-[0_0_10px_rgba(247,111,34,0.4)]' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-black uppercase text-slate-500">{activeTimeframes.length} Syncing</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-[#050505] scroll-smooth" ref={scrollContainerRef}>
        {sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
             <p className="text-sm font-black uppercase tracking-[0.3em] text-[#F76F22]">Operational Dashboard v4.3</p>
             <p className="text-[10px] text-slate-500">Retrieving full day calendar...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {groupedSessions.map(([hour, group]) => {
              const isSyncing = activeTimeframes.includes(hour);
              return (
                <section key={hour} className="flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <button onClick={() => toggleTimeframeSync(hour)} className="flex items-center gap-4 transition-all outline-none">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${isSyncing ? 'bg-[#F76F22]/20 border-[#F76F22] text-[#F76F22] shadow-[0_0_20px_rgba(247,111,34,0.4)]' : 'bg-slate-900 border-slate-700 text-white'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isSyncing ? 'animate-spin-slow' : ''}>
                          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                      </div>
                      <span className="text-4xl font-black whitespace-nowrap tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{hour}</span>
                    </button>
                    <div className={`h-[8px] w-full transition-colors duration-700 rounded-full ${isSyncing ? 'bg-[#F76F22]/80 shadow-[0_0_15px_rgba(247,111,34,0.3)]' : 'bg-slate-800'}`}></div>
                  </div>
                  <div className={`grid ${gridCols[gridSize]} gap-4`}>
                    {group.map((session) => {
                      const currentIndex = globalTileIndex++;
                      return (
                        <div key={session.id} data-index={currentIndex}>
                          <SessionTile 
                            session={session} 
                            isSelected={currentIndex === selectedIndex} 
                            gridSize={gridSize}
                            onClick={() => setSelectedIndex(currentIndex)} 
                            onDoubleClick={() => session.meetingLink && window.open(session.meetingLink, '_blank')} />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <footer className="shrink-0 p-3 border-t border-white/5 bg-slate-950 text-[9px] text-slate-500 uppercase font-black flex justify-between">
        <div className="flex gap-6">
          <span>{sessions.length} Meetings</span>
          <span className="text-slate-700">|</span>
          <span>[HJKL] Navigate</span>
          <span className="text-slate-700">|</span>
          <span>[C] Copy Report</span>
          <span className="text-slate-700">|</span>
          <span>[M] Join</span>
        </div>
        <div className="flex gap-4">
          <span className="text-white font-black">● Account</span>
          <span className="text-[#F76F22]">● Tutor</span>
          <span className="text-green-500">● Student</span>
          <span className="text-yellow-500">● Guest</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

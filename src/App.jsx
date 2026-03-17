import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import NewAnalysis from './components/NewAnalysis';
import CVManager from './components/CVManager';
import Settings from './components/Settings';
import JobDetail from './components/JobDetail';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bridgeData, setBridgeData] = useState(null);

  const navigate = (newView, jobId = null) => {
    setView(newView);
    setSelectedJobId(jobId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Chrome Extension Bridge ──────────────────────────────────────────────
  // Listens for job data sent by the Career Pilot Bridge extension.
  // The extension writes to localStorage('cp_bridge_job') and fires a
  // CustomEvent('cp_bridge'). We handle both so it works whether the app
  // was already open (event) or just launched (localStorage check on mount).
  useEffect(() => {
    const consume = () => {
      try {
        const raw = localStorage.getItem('cp_bridge_job');
        if (!raw) return;
        const data = JSON.parse(raw);
        localStorage.removeItem('cp_bridge_job');
        setBridgeData(data);
        setView('new');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    };

    // Check immediately in case extension wrote before React mounted
    consume();

    // Listen for live events when app is already open
    window.addEventListener('cp_bridge', consume);
    return () => window.removeEventListener('cp_bridge', consume);
  }, []);

  return (
    <AppProvider>
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a' }}>
        <Navbar view={view} navigate={navigate} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {view === 'dashboard' && <Dashboard navigate={navigate} />}
          {view === 'new'       && <NewAnalysis navigate={navigate} bridgeData={bridgeData} onBridgeClear={() => setBridgeData(null)} />}
          {view === 'cvs'       && <CVManager />}
          {view === 'settings'  && <Settings />}
          {view === 'job' && selectedJobId && (
            <JobDetail jobId={selectedJobId} navigate={navigate} />
          )}
        </main>
      </div>
    </AppProvider>
  );
}

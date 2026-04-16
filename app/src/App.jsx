import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import NewAnalysis from './components/NewAnalysis';
import CVManager from './components/CVManager';
import Settings from './components/Settings';
import JobDetail from './components/JobDetail';

// ── Bridge listener (must be inside AppProvider to access updateSettings) ──
function BridgeListener({ onJobData }) {
  const { settings, updateSettings } = useApp();

  useEffect(() => {
    const consume = () => {
      try {
        const raw = localStorage.getItem('cp_bridge_job');
        if (!raw) return;
        const data = JSON.parse(raw);
        localStorage.removeItem('cp_bridge_job');
        onJobData(data);
      } catch {}
    };

    // Handle API key delivered by the extension bridge
    const handleApiKey = (e) => {
      const apiKey = e.detail;
      if (apiKey && !settings.userApiKey) {
        updateSettings({ userApiKey: apiKey });
      }
    };

    consume();
    window.addEventListener('cp_bridge', consume);
    window.addEventListener('cp_api_key', handleApiKey);

    const t1 = setTimeout(consume, 400);
    const t2 = setTimeout(consume, 1200);

    return () => {
      window.removeEventListener('cp_bridge', consume);
      window.removeEventListener('cp_api_key', handleApiKey);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Main app shell ──────────────────────────────────────────────────────────
function AppShell() {
  const [view, setView] = useState('new');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bridgeData, setBridgeData] = useState(null);

  const navigate = (newView, jobId = null) => {
    setView(newView);
    setSelectedJobId(jobId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJobData = (data) => {
    setBridgeData(data);
    setView('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <BridgeListener onJobData={handleJobData} />
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
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-950">
        <AppShell />
      </div>
    </AppProvider>
  );
}

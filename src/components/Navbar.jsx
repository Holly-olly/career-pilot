import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'dashboard', label: 'Pipeline', icon: '📊' },
  { id: 'new', label: 'New Analysis', icon: '➕' },
  { id: 'cvs', label: 'My CVs', icon: '📄' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar({ view, navigate }) {
  const { cvs, activeCVId } = useApp();

  const isReady = !!activeCVId;
  const activeCV = cvs.find((c) => c.id === activeCVId);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2 text-indigo-400 font-bold text-lg hover:text-indigo-300 transition-colors"
          >
            <span className="text-xl">✈</span>
            <span>Career Pilot</span>
          </button>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            {isReady ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="hidden sm:inline">{activeCV?.name}</span>
              </span>
            ) : (
              <button
                onClick={() => navigate('cvs')}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span className="hidden sm:inline">Add a CV first</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { id: 'new', label: 'New Analysis', icon: '➕' },
  { id: 'dashboard', label: 'Pipeline', icon: '📊' },
  { id: 'cvs', label: 'My CVs', icon: '📄' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar({ view, navigate }) {

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

          {/* Ko-fi */}
          <div className="flex items-center text-xs">
            <a
              href="https://ko-fi.com/V7V11WRGZX"
              target="_blank"
              rel="noopener noreferrer"
              title="Enjoying the tool? Support it here ☕"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors font-medium"
            >
              ☕ <span className="hidden sm:inline">Buy me a coffee</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
}

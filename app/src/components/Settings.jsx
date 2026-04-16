import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { storage } from '../utils/storage';

export default function Settings() {
  const { settings, updateSettings } = useApp();

  const [apiKey, setApiKey] = useState(settings.userApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileRef = useRef(null);

  const handleSaveKey = () => {
    updateSettings({ userApiKey: apiKey });
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const incoming = JSON.parse(ev.target.result);
        if (!Array.isArray(incoming)) throw new Error('Expected a JSON array.');

        const existing = storage.getJobs();
        const existingKeys = new Set(
          existing.map((j) => `${j.company}__${j.role}`.toLowerCase())
        );
        const fresh = incoming.filter(
          (j) => !existingKeys.has(`${j.company}__${j.role}`.toLowerCase())
        );
        const merged = [...fresh, ...existing];
        storage.saveJobs(merged);

        setImportStatus(`✓ Imported ${fresh.length} new positions. Reloading…`);
        setTimeout(() => window.location.reload(), 1200);
        e.target.value = '';
      } catch (err) {
        setImportStatus(`Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          API key and data backup. Matching preferences live in <strong className="text-slate-300">My CVs</strong>.
        </p>
      </div>

      {/* API Key */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Gemini API Key</h2>
            <p className="text-xs text-slate-500 mt-1">
              Required to run analysis.{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Get a free key →
              </a>
            </p>
          </div>
          {apiKey && (
            <span className="shrink-0 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium mt-0.5">
              ✓ Set
            </span>
          )}
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>

        <p className="text-xs text-slate-600">Stored in your browser only — never sent anywhere except Google's API.</p>

        <button
          onClick={handleSaveKey}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
            keySaved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {keySaved ? '✓ Saved' : 'Save API Key'}
        </button>
      </section>

      {/* Pipeline Backup */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Pipeline Backup</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save your tracked roles to a file, or restore from a previous backup. Already-saved roles are never duplicated.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            📂 Restore Backup
          </button>
          <button
            onClick={() => {
              const jobs = storage.getJobs();
              const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `career-pilot-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            💾 Save Backup
          </button>
        </div>

        {importStatus && (
          <p className={`text-sm ${importStatus.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {importStatus}
          </p>
        )}
      </section>
    </div>
  );
}

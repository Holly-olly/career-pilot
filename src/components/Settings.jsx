import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { storage } from '../utils/storage';

export default function Settings() {
  const { settings, updateSettings } = useApp();

  const [form, setForm] = useState({
    persona: settings.persona || '',
    talents: settings.talents || '',
    hardNos: settings.hardNos || '',
    currentFocus: settings.currentFocus || '',
  });

  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileRef = useRef(null);

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
          existing.map(j => `${j.company}__${j.role}`.toLowerCase())
        );

        const fresh = incoming.filter(
          j => !existingKeys.has(`${j.company}__${j.role}`.toLowerCase())
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

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure your AI provider and strategic context.</p>
      </div>

      {/* Strategic Context */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Strategic Context</h2>
          <p className="text-xs text-slate-500 mt-1">This "hidden value" is injected into every analysis — not visible in your CV.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Hiring Persona</label>
          <input
            type="text"
            value={form.persona}
            onChange={set('persona')}
            placeholder="e.g. Senior Head of People Science"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-slate-600 mt-1">The AI's identity for evaluating your profile.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Unlisted Talents / Experience</label>
          <textarea
            rows={3}
            value={form.talents}
            onChange={set('talents')}
            placeholder="Skills, projects, or achievements that aren't in your CV..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Hard NOs — Dealbreakers</label>
          <textarea
            rows={2}
            value={form.hardNos}
            onChange={set('hardNos')}
            placeholder="e.g. No fully on-site roles, No military tech, No startups under Series A..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-xs text-slate-600 mt-1">AI will penalize score by 50pts if these appear in a JD.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Current Focus</label>
          <input
            type="text"
            value={form.currentFocus}
            onChange={set('currentFocus')}
            placeholder="e.g. Transitioning from IRT research to AI-assisted item generation"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </section>

      {/* Import from old project */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Import Existing Analyses</h2>
          <p className="text-xs text-slate-500 mt-1">
            Already analysed roles elsewhere? Upload a{' '}
            <code className="text-indigo-400 bg-slate-800 px-1 py-0.5 rounded">migration-output.json</code>{' '}
            to bring them in — duplicates are skipped automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            📂 Upload migration-output.json
          </button>
        </div>

        {importStatus && (
          <p className={`text-sm ${importStatus.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {importStatus}
          </p>
        )}
      </section>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          saved
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}

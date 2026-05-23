import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { extractText, ACCEPT } from '../utils/extractText';
import Spinner from './Spinner';

export default function CVManager() {
  const { cvs, addCV, deleteCV, setActiveCV, activeCVId, settings, updateSettings } = useApp();

  // ── CV add form ────────────────────────────────────────────────────────────
  const [showForm, setShowForm]           = useState(cvs.length === 0);
  const [inputMode, setInputMode]         = useState('paste');
  const [name, setName]                   = useState('');
  const [content, setContent]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedId, setExpandedId]       = useState(null);
  const [fileStatus, setFileStatus]       = useState('');
  const [fileError, setFileError]         = useState('');
  const fileRef = useRef(null);

  // ── Matching profile (strategic context) ──────────────────────────────────
  const [persona,  setPersona]  = useState(settings.persona       || '');
  const [talents,  setTalents]  = useState(settings.talents        || '');
  const [hardNos,  setHardNos]  = useState(settings.hardNos        || '');
  const [focus,    setFocus]    = useState(settings.currentFocus   || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const autoName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    setName((prev) => prev || autoName);

    setFileStatus('loading');
    setFileError('');
    setContent('');
    try {
      const text = await extractText(file);
      if (!text || text.length < 50) {
        setFileError('Could not extract enough text. The file may be image-based or empty. Try pasting text instead.');
        setFileStatus('error');
      } else {
        setContent(text);
        setFileStatus('done');
      }
    } catch (err) {
      setFileError(err.message || 'Failed to read the file. Try Paste mode instead.');
      setFileStatus('error');
    }
    e.target.value = '';
  };

  // ── Save CV ────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!name.trim() || !content.trim()) return;
    const cv = { id: crypto.randomUUID(), name: name.trim(), content: content.trim(), createdAt: new Date().toISOString() };
    addCV(cv);
    if (!activeCVId) setActiveCV(cv.id);
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setName(''); setContent(''); setFileStatus(''); setFileError(''); setInputMode('paste');
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (confirmDelete === id) {
      deleteCV(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // ── Save matching profile ─────────────────────────────────────────────────
  const handleSaveProfile = () => {
    updateSettings({ persona, talents, hardNos, currentFocus: focus });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My CVs</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage CV versions. The <span className="text-emerald-400">active</span> one is used for new analyses.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add CV
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">New CV Version</h2>

          <div className="flex gap-2">
            {[{ id: 'paste', label: '📝 Paste Text' }, { id: 'upload', label: '📎 Upload File' }].map((m) => (
              <button
                key={m.id}
                onClick={() => { setInputMode(m.id); setContent(''); setFileStatus(''); setFileError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  inputMode === m.id
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Version name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General 2025, Research-focused, Product PM…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
            {inputMode === 'upload' && <p className="text-xs text-slate-600 mt-1">Auto-filled from filename — you can edit it.</p>}
          </div>

          {inputMode === 'paste' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">CV text</label>
              <textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the full text of your CV here…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
              />
              <p className="text-xs text-slate-600 mt-1">{content.length.toLocaleString()} characters</p>
            </div>
          )}

          {inputMode === 'upload' && (
            <div className="space-y-3">
              <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFileSelect} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg py-8 text-center text-slate-400 hover:text-indigo-300 transition-colors"
              >
                <div className="text-3xl mb-2">📄</div>
                <div className="text-sm font-medium">Click to select a file</div>
                <div className="text-xs text-slate-600 mt-1">PDF · Word (.docx) · TXT · RTF</div>
              </button>
              {fileStatus === 'loading' && <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner />Extracting text…</div>}
              {fileStatus === 'error' && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{fileError}</div>}
              {fileStatus === 'done' && content && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">✓ {content.length.toLocaleString()} characters extracted</span>
                    <button onClick={() => setInputMode('paste')} className="text-xs text-slate-500 hover:text-slate-300">Edit text →</button>
                  </div>
                  <pre className="text-xs text-slate-500 font-mono bg-slate-800/60 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {content.slice(0, 400)}…
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !content.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Save CV
            </button>
            {cvs.length > 0 && (
              <button onClick={() => { resetForm(); setShowForm(false); }}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-slate-300 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {cvs.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📄</p>
          <p>No CVs saved yet.</p>
        </div>
      )}

      {/* CV list */}
      <div className="space-y-3">
        {cvs.map((cv) => {
          const isActive   = cv.id === activeCVId;
          const isExpanded = expandedId === cv.id;
          return (
            <div
              key={cv.id}
              className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${
                isActive ? 'border-emerald-500/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-100 truncate">{cv.name}</p>
                    {isActive && (
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cv.content.length.toLocaleString()} chars ·{' '}
                    {new Date(cv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpandedId(isExpanded ? null : cv.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors">
                    {isExpanded ? 'Hide' : 'Preview'}
                  </button>
                  {!isActive && (
                    <button onClick={() => setActiveCV(cv.id)}
                      className="text-xs bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors">
                      Set Active
                    </button>
                  )}
                  <button onClick={() => handleDelete(cv.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      confirmDelete === cv.id
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40'
                    }`}>
                    {confirmDelete === cv.id ? 'Confirm?' : '🗑'}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-800 pt-4">
                  <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed bg-slate-800/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {cv.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Matching profile — strategic context injected into every analysis */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Matching Profile</h2>
          <p className="text-xs text-slate-500 mt-1">
            Injected into every analysis as hidden context — things that aren't in your CV but matter for fit.
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Dealbreakers</label>
          <textarea
            rows={2} value={hardNos} onChange={(e) => setHardNos(e.target.value)}
            placeholder="e.g. No fully on-site roles, No military tech, No startups under Series A..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-xs text-slate-600 mt-1">Roles matching these are automatically scored lower.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Current Focus</label>
          <input
            type="text" value={focus} onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Moving into AI/data roles, building LLM evaluation experience"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleSaveProfile}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
            profileSaved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {profileSaved ? '✓ Profile Saved' : 'Save Matching Profile'}
        </button>
      </section>
    </div>
  );
}

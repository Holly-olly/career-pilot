/**
 * CVContextPanel — shared between NewAnalysis and JobDetail.
 * Handles CV selection, upload, paste, and matching context (advanced settings).
 * Calls onChange({ cv, settings }) whenever the resolved state changes.
 */
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { extractText, ACCEPT } from '../utils/extractText';
import Spinner from './Spinner';

export default function CVContextPanel({ onChange }) {
  const { cvs, activeCVId, addCV, settings } = useApp();

  // ── CV state ───────────────────────────────────────────────────────────────
  const [selectedCVId, setSelectedCVId] = useState(activeCVId || cvs[0]?.id || '');
  const [showPaste, setShowPaste]       = useState(false);
  const [pasteText, setPasteText]       = useState('');
  const [uploadStatus, setUploadStatus] = useState(''); // '' | 'loading' | 'done' | 'error'
  const [uploadError, setUploadError]   = useState('');
  const fileRef = useRef(null);

  // ── Advanced settings state (pre-filled from stored settings) ──────────────
  const hasStoredContext = !!(settings.persona || settings.talents || settings.hardNos || settings.currentFocus);
  const [showAdvanced, setShowAdvanced] = useState(hasStoredContext);
  const [persona,  setPersona]  = useState(settings.persona       || '');
  const [talents,  setTalents]  = useState(settings.talents        || '');
  const [hardNos,  setHardNos]  = useState(settings.hardNos        || '');
  const [focus,    setFocus]    = useState(settings.currentFocus   || '');

  // Keep dropdown in sync if active CV changes elsewhere (e.g. user goes to My CVs)
  useEffect(() => {
    if (activeCVId && !selectedCVId) setSelectedCVId(activeCVId);
  }, [activeCVId]);

  // ── Resolve effective CV and notify parent on any change ───────────────────
  useEffect(() => {
    const pasteCV    = pasteText.trim()
      ? { id: 'pasted', name: 'Pasted CV', content: pasteText.trim() }
      : null;
    const selectedCV = cvs.find((cv) => cv.id === selectedCVId) || null;
    const effectiveCV = pasteCV || selectedCV;

    onChange?.({
      cv: effectiveCV,
      settings: { persona, talents, hardNos, currentFocus: focus },
    });
  }, [selectedCVId, pasteText, persona, talents, hardNos, focus, cvs]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('loading');
    setUploadError('');
    try {
      const text = await extractText(file);
      if (!text || text.length < 50) {
        setUploadError('Could not extract enough text. Try pasting instead.');
        setUploadStatus('error');
        return;
      }
      const autoName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const newCV = {
        id: crypto.randomUUID(),
        name: autoName || 'Uploaded CV',
        content: text,
        createdAt: new Date().toISOString(),
      };
      addCV(newCV);
      setSelectedCVId(newCV.id);
      setPasteText(''); // clear paste if any
      setUploadStatus('done');
    } catch (err) {
      setUploadError(err.message || 'Failed to read the file. Try pasting instead.');
      setUploadStatus('error');
    }
    e.target.value = '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const pasteIsActive = pasteText.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* ── CV header + dropdown + upload ── */}
      <div className="px-5 pt-5 pb-4 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Your CV</p>

        {/* Dropdown — existing CVs */}
        <div className="flex items-center gap-2">
          <select
            value={pasteIsActive ? '' : selectedCVId}
            onChange={(e) => {
              setSelectedCVId(e.target.value);
              setPasteText('');   // selecting from dropdown clears paste
              setShowPaste(false);
            }}
            disabled={pasteIsActive}
            className={`flex-1 bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer transition-opacity ${
              pasteIsActive ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-200'
            }`}
          >
            {cvs.length === 0 && (
              <option value="">— no saved CVs yet —</option>
            )}
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>{cv.name}</option>
            ))}
          </select>

          {/* Upload button */}
          <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload PDF, DOCX, TXT or RTF — saved to My CVs automatically"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors whitespace-nowrap"
          >
            📎 Upload
          </button>
        </div>

        {/* Upload status */}
        {uploadStatus === 'loading' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400"><Spinner />Extracting…</div>
        )}
        {uploadStatus === 'done' && (
          <p className="text-xs text-emerald-400">✓ Uploaded and selected — also saved to My CVs</p>
        )}
        {uploadStatus === 'error' && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}
      </div>

      {/* ── Paste collapsible ── */}
      <div className="border-t border-slate-800">
        <button
          onClick={() => setShowPaste((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-800/40 transition-colors"
        >
          <span className="text-xs text-slate-400 font-medium">
            {pasteIsActive ? '✎ Paste text (active — overrides dropdown)' : '▾ Paste text instead'}
          </span>
          <span className="text-slate-600 text-xs">{showPaste ? '▲' : '▼'}</span>
        </button>

        {showPaste && (
          <div className="px-5 pb-4 space-y-2">
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your CV text here — overrides the dropdown selection above."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
            {pasteText.trim() && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">{pasteText.length.toLocaleString()} characters</p>
                <button
                  onClick={() => { setPasteText(''); }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Advanced settings collapsible ── */}
      <div className="border-t border-slate-800">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Matching Context</span>
            {!showAdvanced && hasStoredContext && (
              <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">filled</span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{showAdvanced ? '▲' : '▼'}</span>
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs text-slate-500">
              Injected into every analysis as hidden context. Saved to your profile when you run the analysis.
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Hiring Persona</label>
              <input
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g. Senior Head of People Science"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-slate-600 mt-1">The AI evaluates you as if this is your target title.</p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Unlisted Talents</label>
              <textarea
                rows={2}
                value={talents}
                onChange={(e) => setTalents(e.target.value)}
                placeholder="Skills, projects, or achievements not in your CV..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Dealbreakers</label>
              <textarea
                rows={2}
                value={hardNos}
                onChange={(e) => setHardNos(e.target.value)}
                placeholder="e.g. No fully on-site roles, No military tech..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Current Focus</label>
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Moving into AI/data roles, building LLM evaluation experience"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

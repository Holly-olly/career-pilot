import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useApp } from '../context/AppContext';

// Use CDN worker matching the installed package version
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

// ── Extractors ─────────────────────────────────────────────────────────────

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

async function extractDocxText(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.replace(/[ \t]{2,}/g, ' ').trim();
}

async function extractRtfText(file) {
  const raw = await file.text();
  return raw
    .replace(/\{\\[^{}]*\}/g, ' ')        // strip control groups like {\colortbl ...}
    .replace(/\\[a-z*]+[-\d]* ?/gi, ' ')  // strip control words  \par \b \fs24 etc.
    .replace(/[{}\\]/g, ' ')              // strip leftover braces / backslashes
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf')  return extractPdfText(file);
  if (ext === 'docx') return extractDocxText(file);
  if (ext === 'txt')  return file.text();
  if (ext === 'rtf')  return extractRtfText(file);
  throw new Error(`Unsupported format: .${ext}`);
}

const ACCEPT = '.pdf,.docx,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,text/rtf';

// ── Component ──────────────────────────────────────────────────────────────

export default function CVManager() {
  const { cvs, addCV, deleteCV, setActiveCV, activeCVId } = useApp();

  const [showForm, setShowForm]           = useState(cvs.length === 0);
  const [inputMode, setInputMode]         = useState('paste'); // 'paste' | 'upload'
  const [name, setName]                   = useState('');
  const [content, setContent]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedId, setExpandedId]       = useState(null);
  const [fileStatus, setFileStatus]       = useState(''); // '', 'loading', 'done', 'error'
  const [fileError, setFileError]         = useState('');
  const fileRef = useRef(null);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-fill name from filename (strip extension, replace _ and - with spaces)
    const autoName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    setName((prev) => prev || autoName);

    setFileStatus('loading');
    setFileError('');
    setContent('');
    try {
      const text = await extractText(file);
      if (!text || text.length < 50) {
        setFileError('Could not extract enough text. The file may be image-based or empty. Try copying text manually and use Paste mode instead.');
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
    const cv = {
      id: crypto.randomUUID(),
      name: name.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    addCV(cv);
    if (!activeCVId) setActiveCV(cv.id);
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setName('');
    setContent('');
    setFileStatus('');
    setFileError('');
    setInputMode('paste');
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
            <span>+</span> Add CV
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">New CV Version</h2>

          {/* Mode toggle */}
          <div className="flex gap-2">
            {[
              { id: 'paste',  label: '📝 Paste Text' },
              { id: 'upload', label: '📎 Upload File' },
            ].map((m) => (
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

          {/* Version name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Version name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General 2025, Research-focused, Product PM…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
            {inputMode === 'upload' && (
              <p className="text-xs text-slate-600 mt-1">Auto-filled from filename — you can edit it.</p>
            )}
          </div>

          {/* Paste mode */}
          {inputMode === 'paste' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">CV text</label>
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the full text of your CV here…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
              />
              <p className="text-xs text-slate-600 mt-1">{content.length.toLocaleString()} characters</p>
            </div>
          )}

          {/* Upload mode */}
          {inputMode === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg py-8 text-center text-slate-400 hover:text-indigo-300 transition-colors"
              >
                <div className="text-3xl mb-2">📄</div>
                <div className="text-sm font-medium">Click to select a file</div>
                <div className="text-xs text-slate-600 mt-1">PDF · Word (.docx) · TXT · RTF</div>
              </button>

              {fileStatus === 'loading' && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Extracting text…
                </div>
              )}

              {fileStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {fileError}
                </div>
              )}

              {fileStatus === 'done' && content && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">
                      ✓ {content.length.toLocaleString()} characters extracted
                    </span>
                    <button
                      onClick={() => setInputMode('paste')}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Edit text →
                    </button>
                  </div>
                  <pre className="text-xs text-slate-500 font-mono bg-slate-800/60 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {content.slice(0, 400)}…
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !content.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Save CV
            </button>
            {cvs.length > 0 && (
              <button
                onClick={() => { resetForm(); setShowForm(false); }}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-slate-300 transition-colors"
              >
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
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cv.content.length.toLocaleString()} chars ·{' '}
                    {new Date(cv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cv.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors"
                  >
                    {isExpanded ? 'Hide' : 'Preview'}
                  </button>
                  {!isActive && (
                    <button
                      onClick={() => setActiveCV(cv.id)}
                      className="text-xs bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(cv.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      confirmDelete === cv.id
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40'
                    }`}
                  >
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
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeJobWithStructuredMatching } from '../utils/ai';
import { formatDate } from '../utils/parser';
import { STATUSES, scoreColor, verdictBadge } from '../constants';
import CVContextPanel from './CVContextPanel';
import Spinner from './Spinner';

// Score → border colour for the header card.
function scoreBorderColor(score) {
  if (score === null || score === undefined) return 'border-slate-700';
  if (score >= 80) return 'border-emerald-500/40';
  if (score >= 65) return 'border-yellow-500/40';
  if (score >= 50) return 'border-orange-500/40';
  return 'border-red-500/40';
}

// ── Markdown renderer for AI report ─────────────────────────────────────────
// Converts the plain-text markdown the AI returns into styled React elements.
// Handles: # h1, ## h2, ### h3, bullet lists (• - *), --- dividers, **bold**.
// Also strips the "Technical Metadata" block the AI appends for score parsing
// — that data is already extracted into job.score/verdict so it's not shown.
function ReportRenderer({ text }) {
  if (!text) return null;

  // Remove the hidden Technical Metadata block before rendering.
  const clean = text.replace(/\n*#{0,3}\s*Technical Metadata[^\n]*\n[\s\S]*/i, '').trimEnd();

  // Render **bold** inline.
  const parseInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-slate-200 font-semibold">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  const lines = clean.split('\n');
  const elements = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${key++}`} className="space-y-1.5 my-2">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-slate-300 leading-relaxed">
            <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
            <span>{parseInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line) => {
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-xl font-bold text-slate-100 mt-2 mb-1 leading-snug">
          {parseInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-xs font-bold text-indigo-400 uppercase tracking-wider mt-5 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-slate-300 mt-3 mb-1">
          {parseInline(line.slice(4))}
        </h3>
      );
    } else if (line === '---') {
      flushList();
      elements.push(<hr key={key++} className="border-slate-700/80 my-4" />);
    } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      elements.push(<div key={key++} className="h-1" />);
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      flushList();
      elements.push(
        <p key={key++} className="font-semibold text-slate-200 mt-3">{line.slice(2, -2)}</p>
      );
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-slate-300 leading-relaxed">{parseInline(line)}</p>
      );
    }
  });

  flushList();
  return <div className="space-y-0.5">{elements}</div>;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function JobDetail({ jobId, navigate }) {
  const { jobs, updateJob, settings } = useApp();
  const job = jobs.find((j) => j.id === jobId);

  const [jdOpen,        setJdOpen]        = useState(false);
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
  const [reRunCV,       setReRunCV]       = useState(null);
  const [reRunSettings, setReRunSettings] = useState({});
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  if (!job) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p>Role not found.</p>
        <button onClick={() => navigate('dashboard')} className="text-indigo-400 mt-3 text-sm hover:text-indigo-300">
          ← Back to Pipeline
        </button>
      </div>
    );
  }

  // ── Re-analyze ────────────────────────────────────────────────────────────
  // Runs a fresh AI analysis with the chosen CV, replacing the stored report.
  const handleReAnalyze = async () => {
    if (!reRunCV) return;

    setLoading(true);
    setError('');

    try {
      const settingsForCall = { ...settings, ...reRunSettings };
      const result = await analyzeJobWithStructuredMatching({
        jd: job.jd,
        cv: reRunCV.content,
        settings: settingsForCall,
      });

      updateJob(job.id, {
        report: result.llm_report,
        score: result.llm_score,
        verdict: result.llm_verdict,
        structured_score: result.structured_score,
        structured_breakdown: result.structured_breakdown,
        hard_no_violated: result.hard_no_violated,
        hard_no_reason: result.hard_no_reason,
        cvId:   reRunCV.id,
        cvName: reRunCV.name,
        date:   new Date().toISOString(),
      });

      setReanalyzeOpen(false);
    } catch (err) {
      setError(err.message || 'Re-analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <button
        onClick={() => navigate('dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
      >
        ← Back to Pipeline
      </button>

      {/* Demo result banner */}
      {job.isDemo && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-amber-300">
            <span className="font-semibold">This is a demo result</span>
            <span className="text-amber-400/70"> — pre-calculated with fake data, no API key used.</span>
          </div>
          <button
            onClick={() => navigate('new')}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            Try with my own data →
          </button>
        </div>
      )}

      {/* Header card — border colour reflects score tier */}
      <div className={`bg-slate-900 border rounded-xl p-6 ${scoreBorderColor(job.score)}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-400 mb-1">{job.company}</p>
            <h1 className="text-2xl font-bold text-slate-100 leading-tight">{job.role}</h1>
            <p className="text-xs text-slate-500 mt-2">
              Analyzed {formatDate(job.date)} · CV: {job.cvName || 'Unknown'}
            </p>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block truncate max-w-sm"
              >
                {job.url}
              </a>
            )}
          </div>

          {/* Score */}
          <div className="text-center flex-shrink-0">
            <div className={`text-4xl font-black tabular-nums ${scoreColor(job.score)}`}>
              {job.score !== null && job.score !== undefined ? job.score : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">/ 100</div>
          </div>
        </div>

        {/* Verdict badge + status dropdown */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {job.verdict && (
            <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${verdictBadge(job.verdict)}`}>
              {job.verdict}
            </span>
          )}
          <select
            value={job.status}
            onChange={(e) => updateJob(job.id, { status: e.target.value })}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* AI report */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-5">AI Analysis Report</p>
        <ReportRenderer text={job.report} />
      </div>

      {/* Original JD — collapsed by default to keep the page tidy */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setJdOpen(!jdOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="font-medium">Original Job Description</span>
          <span className="text-lg" style={{ transform: jdOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>⌄</span>
        </button>
        {jdOpen && (
          <div className="px-6 pb-6 border-t border-slate-800 pt-4">
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {job.jd}
            </pre>
          </div>
        )}
      </div>

      {/* Re-analyze panel — collapsed by default */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setReanalyzeOpen(!reanalyzeOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="font-medium">🔄 Refine & Re-Analyze</span>
          <span className="text-lg" style={{ transform: reanalyzeOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>⌄</span>
        </button>

        {reanalyzeOpen && (
          <div className="border-t border-slate-800">
            <div className="px-6 pt-4 pb-2">
              <p className="text-xs text-slate-500">
                Change the CV or matching context, then re-run. The current report will be replaced.
              </p>
            </div>

            <CVContextPanel onChange={({ cv, settings: s }) => {
              setReRunCV(cv);
              setReRunSettings(s);
            }} />

            <div className="px-6 pb-6 pt-4 space-y-3">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <button
                onClick={handleReAnalyze}
                disabled={loading || !reRunCV}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  loading || !reRunCV
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {loading ? <><Spinner /><span>Re-analyzing…</span></> : '⚡ Re-Run Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

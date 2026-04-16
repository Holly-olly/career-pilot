import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

function ApiKeyBar() {
  const { settings, updateSettings } = useApp();
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  if (settings.userApiKey) return null;

  const save = () => {
    if (!key.trim()) return;
    updateSettings({ userApiKey: key.trim() });
    setSaved(true);
  };

  if (saved) return null;

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm">
      <span className="text-slate-400 shrink-0">🔑 Gemini API key</span>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="AIza… (optional — app works without it)"
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 min-w-0"
      />
      <button
        onClick={save}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
      >
        Save
      </button>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 text-xs shrink-0"
      >
        Get free key →
      </a>
    </div>
  );
}
import MetricsBar from './MetricsBar';
import { formatDate } from '../utils/parser';
import { STATUSES, VERDICTS, scoreColor, verdictBadge } from '../constants';

// Pre-compute sort orders so comparisons are O(1).
const VERDICT_ORDER = Object.fromEntries(VERDICTS.map((v, i) => [v, i]));
const STATUS_ORDER  = Object.fromEntries(STATUSES.map((s, i) => [s, i]));

// Verdict chip colour when the filter is active (brighter than the table badge).
function verdictChipActive(verdict) {
  switch (verdict) {
    case 'Apply':    return 'bg-emerald-400/20 border-emerald-400/50 text-emerald-300';
    case 'Consider': return 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300';
    case 'Skip':     return 'bg-red-400/20 border-red-400/50 text-red-300';
    default:         return 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300';
  }
}

export default function Dashboard({ navigate }) {
  const { jobs, updateJob, deleteJob } = useApp();

  // ── Filter state (Sets allow multi-select) ─────────────────────────────────
  const [activeStatuses, setActiveStatuses] = useState(new Set());
  const [activeVerdicts, setActiveVerdicts] = useState(new Set());

  // ── Sort state ─────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');

  // ── Delete confirmation (click once → shows '?', click again → deletes) ───
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleStatus = (s) =>
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const toggleVerdict = (v) =>
    setActiveVerdicts((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Dates default to newest-first; everything else defaults to A→Z / low→high.
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  };

  const clearFilters = () => {
    setActiveStatuses(new Set());
    setActiveVerdicts(new Set());
  };

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      deleteJob(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // ── Filtered + sorted jobs (recomputed only when deps change) ──────────────
  const filtered = useMemo(() => {
    const result = jobs.filter((j) => {
      if (activeStatuses.size > 0 && !activeStatuses.has(j.status))  return false;
      if (activeVerdicts.size > 0 && !activeVerdicts.has(j.verdict)) return false;
      return true;
    });

    return result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'company': aVal = (a.company || '').toLowerCase(); bVal = (b.company || '').toLowerCase(); break;
        case 'role':    aVal = (a.role    || '').toLowerCase(); bVal = (b.role    || '').toLowerCase(); break;
        case 'score':   aVal = a.score   ?? -1;                 bVal = b.score   ?? -1;                 break;
        case 'verdict': aVal = VERDICT_ORDER[a.verdict] ?? 99;  bVal = VERDICT_ORDER[b.verdict] ?? 99;  break;
        case 'status':  aVal = STATUS_ORDER[a.status]   ?? 99;  bVal = STATUS_ORDER[b.status]   ?? 99;  break;
        case 'date':    aVal = a.date || '';                     bVal = b.date || '';                     break;
        default: return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [jobs, activeStatuses, activeVerdicts, sortField, sortDir]);

  const hasFilters = activeStatuses.size > 0 || activeVerdicts.size > 0;

  // ── Sortable column header ─────────────────────────────────────────────────
  const SortTh = ({ field, label, align = 'left' }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`${align === 'center' ? 'text-center' : 'text-left'} text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors`}
      >
        <span className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center w-full' : ''}`}>
          {label}
          {/* Arrow only visible when this column is the active sort */}
          <span className={`text-indigo-400 text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
            {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        </span>
      </th>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      <ApiKeyBar />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pipeline</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {jobs.length} role{jobs.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button
          onClick={() => navigate('new')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>+</span> Analyze New Role
        </button>
      </div>

      <MetricsBar jobs={jobs} />

      {/* Filters — only shown when there's something to filter */}
      {jobs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 space-y-3">

          {/* Status chips — multi-select */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-xs text-slate-500 uppercase tracking-wider pt-1 w-12 flex-shrink-0">Status</span>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeStatuses.has(s)
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Verdict chips — multi-select */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 uppercase tracking-wider w-12 flex-shrink-0">Verdict</span>
            <div className="flex gap-2">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  onClick={() => toggleVerdict(v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeVerdicts.has(v)
                      ? verdictChipActive(v)
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Clear + count — only visible when at least one filter is active */}
            {hasFilters && (
              <div className="flex items-center gap-3 ml-2">
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear ×
                </button>
                <span className="text-xs text-slate-500">
                  {filtered.length} of {jobs.length} shown
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no jobs at all */}
      {jobs.length === 0 && (
        <div className="space-y-8">
          <div className="text-center py-12 text-slate-500">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-lg font-medium text-slate-400 mb-2">No roles analyzed yet</p>
            <p className="text-sm mb-6">Start by analyzing a job description.</p>
            <button
              onClick={() => navigate('new')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Analyze First Role
            </button>
          </div>

          {/* How it works */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">How it works</h2>
              {/* Placeholder for future video/deck link */}
              <span className="text-xs text-slate-600 border border-slate-700 rounded-md px-2.5 py-1">
                ▶ Video overview coming soon
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: '📄',
                  title: '1. Add your CV',
                  desc: 'Go to My CVs, paste your text or upload a file. You can keep multiple versions and switch between them.',
                },
                {
                  icon: '🔍',
                  title: '2. Paste a job description',
                  desc: 'Copy a JD from anywhere and paste it — or use the Chrome extension to scrape LinkedIn, Indeed, or Glassdoor in one click.',
                },
                {
                  icon: '⚡',
                  title: '3. Get your report',
                  desc: 'AI scores fit 0–100, gives a verdict (Apply / Consider / Skip), suggests CV edits, and surfaces ATS keywords.',
                },
              ].map((step) => (
                <div key={step.title} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">{step.icon}</div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">{step.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Jobs table */}
      {filtered.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <SortTh field="company" label="Company" />
                  <SortTh field="role"    label="Role" />
                  <SortTh field="score"   label="Score"   align="center" />
                  <SortTh field="verdict" label="Verdict" align="center" />
                  <SortTh field="status"  label="Status" />
                  <SortTh field="date"    label="Date" />
                  <th className="text-center text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job, idx) => (
                  <tr
                    key={job.id}
                    className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors ${
                      idx === filtered.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap max-w-[140px] truncate">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-indigo-300 transition-colors"
                          title="Open job posting"
                        >
                          {job.company}
                          <span className="ml-1 text-slate-600 hover:text-indigo-400 text-[10px]">↗</span>
                        </a>
                      ) : (
                        job.company
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px]">
                      <span className="truncate block">{job.role}</span>
                      {job.isDemo && (
                        <span className="text-[10px] text-amber-500/70 font-medium uppercase tracking-wide">Demo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {job.score !== null && job.score !== undefined ? (
                        <span className={`text-lg font-bold tabular-nums ${scoreColor(job.score)}`}>
                          {job.score}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {job.verdict ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${verdictBadge(job.verdict)}`}>
                          {job.verdict}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={job.status}
                        onChange={(e) => updateJob(job.id, { status: e.target.value })}
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[150px]"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(job.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate('job', job.id)}
                          className="text-xs bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors whitespace-nowrap"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          title="Delete"
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                            confirmDelete === job.id
                              ? 'bg-red-500/20 border-red-500/40 text-red-400'
                              : 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40'
                          }`}
                        >
                          {confirmDelete === job.id ? 'Confirm?' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state — filters active but nothing matches */}
      {jobs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No roles match the current filters.</p>
          <button onClick={clearFilters} className="text-indigo-400 hover:text-indigo-300 text-sm mt-2">
            Clear filters
          </button>
        </div>
      )}

    </div>
  );
}

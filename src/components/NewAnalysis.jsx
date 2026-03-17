import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeJob, buildPrompt } from '../utils/ai';
import { parseReport } from '../utils/parser';
import Spinner from './Spinner';

export default function NewAnalysis({ navigate, bridgeData, onBridgeClear }) {
  const { settings, activeCV, addJob } = useApp();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromBridge, setFromBridge] = useState(false);

  // ── Pre-fill from Chrome extension bridge ─────────────────────────────────
  useEffect(() => {
    if (bridgeData) {
      setRole(bridgeData.role || '');
      setCompany(bridgeData.company || '');
      setJd(bridgeData.jd || '');
      setFromBridge(true);
      setError('');
    }
  }, [bridgeData]);

  const isReady = !!activeCV;
  const canAnalyze = isReady && company.trim() && role.trim() && jd.trim() && !loading;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError('');

    try {
      const prompt = buildPrompt({
        persona: settings.persona,
        talents: settings.talents,
        currentFocus: settings.currentFocus,
        hardNos: settings.hardNos,
        cv: activeCV.content,
        jd,
      });

      const report = await analyzeJob({ prompt });
      const { score, verdict } = parseReport(report);

      const job = {
        id: crypto.randomUUID(),
        company: company.trim(),
        role: role.trim(),
        jd: jd.trim(),
        report,
        score,
        verdict,
        status: '👀 New',
        date: new Date().toISOString(),
        cvId: activeCV.id,
        cvName: activeCV.name,
      };

      addJob(job);
      onBridgeClear?.();
      navigate('job', job.id);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">New Analysis</h1>
        <p className="text-slate-400 text-sm mt-1">Paste a job description to get a strategic fit report.</p>
      </div>

      {/* Bridge banner */}
      {fromBridge && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm text-indigo-300 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">✈</span>
          <div>
            <p className="font-medium">Auto-filled from Career Pilot Bridge</p>
            <p className="text-indigo-400/70 mt-0.5">Review the details below, then click Analyze.</p>
          </div>
          <button
            onClick={() => { setFromBridge(false); onBridgeClear?.(); }}
            className="ml-auto text-indigo-500 hover:text-indigo-300 text-lg leading-none"
          >×</button>
        </div>
      )}

      {/* Setup warning */}
      {!isReady && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="font-medium">Add a CV first</p>
            <p className="text-amber-400/70 mt-0.5">Go to "My CVs", paste your CV text, and set it as active.</p>
          </div>
        </div>
      )}

      {/* Active context summary */}
      {isReady && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Analysis Context</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Active CV:</span>{' '}
              <span className="text-slate-300">{activeCV.name}</span>
            </div>
            {settings.persona && (
              <div className="col-span-2">
                <span className="text-slate-500">Persona:</span>{' '}
                <span className="text-slate-300">{settings.persona}</span>
              </div>
            )}
            {settings.currentFocus && (
              <div className="col-span-2">
                <span className="text-slate-500">Focus:</span>{' '}
                <span className="text-slate-300">{settings.currentFocus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Company *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Role *</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Head of People Science"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Job Description *</label>
          <textarea
            rows={14}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here, or use the Chrome extension to auto-fill..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-xs text-slate-600 mt-1">{jd.length.toLocaleString()} characters</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            canAnalyze
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Spinner />
              <span>Analyzing — this takes ~15 seconds…</span>
            </>
          ) : (
            '⚡ Analyze Fit'
          )}
        </button>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeJobWithStructuredMatching } from '../utils/ai';
import CVContextPanel from './CVContextPanel';
import Spinner from './Spinner';

// ── Demo data — obviously fake, clearly shows the format ───────────────────
const DEMO_COMPANY = 'Demo Corp';
const DEMO_ROLE    = 'Astronaut Trainee';
const DEMO_JD = `Seeking candidates for our next Astronaut Trainee cohort.

Requirements:
- Degree in engineering, physical science, or medicine
- Pass Class 1 physical fitness assessment
- 2+ years professional experience in a related field
- Willingness to relocate to Houston for 2-year on-site training
- Military or test pilot background preferred`;

const DEMO_CV = `People Data Scientist — 4 years experience
• Python & R (statistical modelling, sklearn, pandas)
• Employee engagement surveys — design, analysis, reporting
• Attrition prediction models for HR teams of 500–2,000
• Workforce dashboards and exec presentations`;

// Pre-calculated result — no API call needed for the demo
const DEMO_REPORT = `## SUMMARY
The candidate's people analytics background has almost no overlap with the core requirements of an Astronaut Trainee role. The position demands physical fitness certification, aerospace credentials, and mission operations readiness — none of which appear in this profile. This is a deliberate mismatch to demonstrate how Career Pilot evaluates fit. Your real CV against a real job description will produce a very different result.

## CV TWEAKS
- No surface changes will close the domain gap for this specific role
- If you were seriously targeting the space sector, leading with STEM publications and cross-functional project experience would help
- Quantify any leadership experience more specifically — team sizes, outcomes, timelines

## ATS KEYWORDS
These are terms from the job description you'd need to add to your CV to pass ATS screening for this role:

Aerospace engineering · Mission operations · Physical fitness certification · STEM degree · Aviation background · On-site readiness

*(Your CV currently signals: data analysis, HR analytics, Python/R, survey design — none of which match this posting's ATS filters. For roles that actually fit your background, the keyword overlap will be much higher.)*

## FINAL TIP
Your profile is a strong fit for people analytics, HR data science, and workforce research roles — replace the job description above with one of those and you'll see a very different score.

---
### Technical Metadata
Score: 18
Verdict: Skip`;

// ── Component ──────────────────────────────────────────────────────────────
export default function NewAnalysis({ navigate, bridgeData, onBridgeClear }) {
  const { settings, updateSettings, cvs, addCV, addJob, jobs } = useApp();

  // New user = no key, no CVs, no prior analyses
  const isNewUser = !settings.userApiKey && cvs.length === 0 && jobs.length === 0;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [company, setCompany] = useState('');
  const [role,    setRole]    = useState('');
  const [jd,      setJd]      = useState('');
  const [url,     setUrl]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [fromBridge, setFromBridge] = useState(false);

  // ── Inline API key ─────────────────────────────────────────────────────────
  const [pendingKey, setPendingKey] = useState('');
  const [showKey,    setShowKey]    = useState(false);

  // ── Demo mode ──────────────────────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ── CV + settings from shared panel ───────────────────────────────────────
  const [effectiveCV,       setEffectiveCV]       = useState(null);
  const [effectiveSettings, setEffectiveSettings] = useState({});

  // Pre-fill demo data for new users on mount
  useEffect(() => {
    if (isNewUser) {
      setCompany(DEMO_COMPANY);
      setRole(DEMO_ROLE);
      setJd(DEMO_JD);
      setIsDemoMode(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from Chrome extension bridge
  useEffect(() => {
    if (bridgeData) {
      setCompany(bridgeData.company || '');
      setRole(bridgeData.role || '');
      setJd(bridgeData.jd || '');
      setUrl(bridgeData.positionUrl || bridgeData.url || '');
      setFromBridge(true);
      setIsDemoMode(false);
      setError('');
    }
  }, [bridgeData]);

  // Any manual edit exits demo mode
  const edit = (setter) => (e) => {
    setter(e.target.value);
    setIsDemoMode(false);
  };

  // For demo mode, a fake CV so canAnalyze passes
  const demoCV = isDemoMode ? { id: 'demo', name: 'Sample CV', content: DEMO_CV } : null;
  const cvForAnalysis = demoCV || effectiveCV;

  const effectiveKey = settings.userApiKey || pendingKey.trim();

  const canAnalyze = isDemoMode
    ? company.trim() && role.trim() && jd.trim() && !loading
    : !!cvForAnalysis && !!effectiveKey && company.trim() && role.trim() && jd.trim() && !loading;

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError('');

    // Demo path
    if (isDemoMode) {
      const demoJob = {
        id: crypto.randomUUID(),
        company: DEMO_COMPANY,
        role: DEMO_ROLE,
        jd: DEMO_JD,
        url: '',
        report: DEMO_REPORT,
        score: 18,
        verdict: 'Skip',
        structured_score: null,
        structured_breakdown: null,
        hard_no_violated: false,
        hard_no_reason: '',
        status: '👀 New',
        date: new Date().toISOString(),
        cvId: 'demo',
        cvName: 'Sample CV',
        isDemo: true,
      };
      addJob(demoJob);
      setLoading(false);
      navigate('job', demoJob.id);
      return;
    }

    // Persist pending key
    const keyToUse = settings.userApiKey || pendingKey.trim();
    if (!settings.userApiKey && keyToUse) updateSettings({ userApiKey: keyToUse });

    // Persist advanced settings
    updateSettings(effectiveSettings);

    // If CV came from paste, save it to My CVs
    let cvToUse = cvForAnalysis;
    if (cvToUse?.id === 'pasted') {
      const saved = {
        id: crypto.randomUUID(),
        name: 'Pasted CV',
        content: cvToUse.content,
        createdAt: new Date().toISOString(),
      };
      addCV(saved);
      cvToUse = saved;
    }

    try {
      const settingsForCall = { ...settings, ...effectiveSettings, userApiKey: keyToUse };
      const result = await analyzeJobWithStructuredMatching({
        jd,
        cv: cvToUse.content,
        settings: settingsForCall,
      });

      const job = {
        id: crypto.randomUUID(),
        company: company.trim(),
        role: role.trim(),
        jd: jd.trim(),
        url: url.trim(),
        report: result.llm_report,
        score: result.llm_score,
        verdict: result.llm_verdict,
        structured_score: result.structured_score,
        structured_breakdown: result.structured_breakdown,
        hard_no_violated: result.hard_no_violated,
        hard_no_reason: result.hard_no_reason,
        status: '👀 New',
        date: new Date().toISOString(),
        cvId: cvToUse.id,
        cvName: cvToUse.name,
        isDemo: false,
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      {isNewUser ? (
        <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-700/40 rounded-xl p-6 space-y-2">
          <h1 className="text-xl font-bold text-slate-100">Match any job to your CV in 15 seconds</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We've pre-loaded a sample below — an obviously mismatched job to show you what the output looks like.
            Hit <span className="text-slate-300 font-medium">Analyze</span> to see the full report. No API key needed for the demo.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-slate-100">New Analysis</h1>
          <p className="text-slate-400 text-sm mt-1">Paste a job description to get a strategic fit report.</p>
        </div>
      )}

      {/* Demo strip */}
      {isDemoMode && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <span className="text-amber-400/80">Sample data loaded — edit any field to switch to your own analysis</span>
          <button
            onClick={() => { setCompany(''); setRole(''); setJd(''); setIsDemoMode(false); }}
            className="text-amber-500 hover:text-amber-300 font-medium shrink-0 transition-colors"
          >
            Clear →
          </button>
        </div>
      )}

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

      {/* ── Job Description ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-slate-400">Job Description *</label>
            <span className="text-xs text-slate-600" title="Chrome extension coming soon">
              Skip copy-paste — extension coming soon
            </span>
          </div>
          <textarea
            rows={10}
            value={jd}
            onChange={edit(setJd)}
            placeholder="Paste the full job description here..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-xs text-slate-600 mt-1">{jd.length.toLocaleString()} characters</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Company *</label>
            <input
              type="text" value={company} onChange={edit(setCompany)}
              placeholder="Acme Corp"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Role *</label>
            <input
              type="text" value={role} onChange={edit(setRole)}
              placeholder="Head of People Science"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Job Posting URL <span className="text-slate-600">(optional)</span>
          </label>
          <input
            type="url" value={url} onChange={edit(setUrl)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ── CV section ── */}
      {isDemoMode ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Sample CV (pre-loaded)</p>
          <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed">{DEMO_CV}</pre>
        </div>
      ) : (
        <CVContextPanel onChange={({ cv, settings: s }) => {
          setEffectiveCV(cv);
          setEffectiveSettings(s);
        }} />
      )}

      {/* ── Inline API key ── */}
      {!settings.userApiKey && !isDemoMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <label className="block text-xs text-slate-400 mb-1.5">
            Gemini API Key <span className="text-slate-600">(free)</span>
            {' · '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Get one →
            </a>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={pendingKey}
              onChange={(e) => setPendingKey(e.target.value)}
              placeholder="AIza…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <p className="text-xs text-slate-600">Stored in your browser only · never sent anywhere except Google's API</p>
        </div>
      )}

      {/* ── Error + Analyze ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          canAnalyze ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <><Spinner /><span>Analyzing…</span></>
        ) : isDemoMode ? (
          '⚡ Analyze Fit — Demo (instant, no API key)'
        ) : (
          '⚡ Analyze Fit'
        )}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MetricsBar — top-of-dashboard snapshot computed from job history.
//
// Important: every metric is derived from `job.history` (the chronological
// log of status transitions) instead of from `job.status` (the current
// snapshot). This way "Total Applied" reflects roles that EVER reached
// Applied — even if they've since moved to Interview or beyond — and the
// Interview Rate is a real funnel conversion, not just a point-in-time
// count.
//
// "Active in Pipeline" is the one exception: it intentionally uses the
// CURRENT status, because the question is "what's open right now?". The
// card is clickable — clicking applies a Dashboard filter to those statuses.
// ──────────────────────────────────────────────────────────────────────────
const APPLIED     = '📨 Applied';
const INTERVIEW   = '🤝 Interview';
const OFFER       = '✅ Offer';
const PIPELINE    = [APPLIED, INTERVIEW, OFFER];

function everReached(job, status) {
  return Array.isArray(job.history) && job.history.some((h) => h.status === status);
}

function firstTimeReached(job, status) {
  if (!Array.isArray(job.history)) return null;
  const entry = job.history.find((h) => h.status === status);
  return entry ? entry.at : null;
}

export default function MetricsBar({ jobs, onPipelineClick }) {
  // Total Applied — ever reached Applied (or beyond) according to history.
  const totalApplied = jobs.filter((j) => everReached(j, APPLIED)).length;

  // Interview Rate — % of applied jobs that reached Interview.
  const interviewed = jobs.filter((j) => everReached(j, INTERVIEW)).length;
  const interviewRate =
    totalApplied > 0 ? Math.round((interviewed / totalApplied) * 100) : null;

  // Active in Pipeline — count by CURRENT status (snapshot, not history).
  const activeInPipeline = jobs.filter((j) => PIPELINE.includes(j.status)).length;

  // Applications submitted in the last 30 days (history-based).
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const submitted30d = jobs.filter((j) => {
    const at = firstTimeReached(j, APPLIED);
    if (!at) return false;
    const t = new Date(at).getTime();
    return !isNaN(t) && t >= cutoff;
  }).length;

  const metrics = [
    {
      label: 'Total Applied',
      value: totalApplied,
      sub: `${totalApplied} of ${jobs.length} total ${jobs.length === 1 ? 'role' : 'roles'}`,
      color: 'text-indigo-400',
    },
    {
      label: 'Interview Rate',
      value: interviewRate !== null ? `${interviewRate}%` : '—',
      sub: totalApplied > 0
        ? `${interviewed} of ${totalApplied}`
        : 'no applications yet',
      color: 'text-cyan-400',
    },
    {
      label: 'Active in Pipeline',
      value: activeInPipeline,
      sub: 'Applied + Interview + Offer',
      color: 'text-emerald-400',
      clickable: activeInPipeline > 0 && typeof onPipelineClick === 'function',
    },
    {
      label: 'Applications (30d)',
      value: submitted30d,
      sub: 'submitted in last 30 days',
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {metrics.map((m) => {
        const baseClass = 'bg-slate-900 border border-slate-800 rounded-lg p-4 transition-colors';
        const interactive = m.clickable
          ? ' cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/50'
          : '';
        const handleClick = m.clickable ? () => onPipelineClick(PIPELINE) : undefined;
        return (
          <div
            key={m.label}
            className={baseClass + interactive}
            onClick={handleClick}
            title={m.clickable ? 'Click to filter Dashboard to these statuses' : undefined}
          >
            <p className="text-xs text-slate-500 mb-1">
              {m.label}
              {m.clickable && <span className="ml-1 text-emerald-500/60">▸</span>}
            </p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

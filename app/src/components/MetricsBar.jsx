const APPLIED_STATUSES = ['📨 Applied', '🤝 Interview', '❌ Rejected (App)', '📉 Rejected (Int)', '✅ Offer'];

export default function MetricsBar({ jobs }) {
  const active = jobs.filter((j) => j.status !== '🚫 Dismissed');
  const applied = jobs.filter((j) => APPLIED_STATUSES.includes(j.status));
  const interviews = jobs.filter((j) => j.status === '🤝 Interview');
  const offers = jobs.filter((j) => j.status === '✅ Offer');
  const targets = jobs.filter((j) => j.status === '🎯 Target' || j.status === '👀 New');

  const avgScore =
    active.length > 0
      ? Math.round(active.reduce((sum, j) => sum + (j.score || 0), 0) / active.length)
      : null;

  const successRate =
    applied.length > 0 ? Math.round((offers.length / applied.length) * 100) : null;

  const pipelineVelocity =
    applied.length > 0 ? Math.round((interviews.length / applied.length) * 100) : null;

  const metrics = [
    {
      label: 'Avg Match Score',
      value: avgScore !== null ? `${avgScore}` : '—',
      sub: avgScore !== null ? 'out of 100' : 'no data yet',
      color: avgScore >= 80 ? 'text-emerald-400' : avgScore >= 65 ? 'text-yellow-400' : avgScore !== null ? 'text-red-400' : 'text-slate-500',
    },
    {
      label: 'Total Applied',
      value: applied.length,
      sub: 'roles submitted',
      color: 'text-indigo-400',
    },
    {
      label: 'Active Targets',
      value: targets.length,
      sub: 'New + Target',
      color: 'text-purple-400',
    },
    {
      label: 'Success Rate',
      value: successRate !== null ? `${successRate}%` : '—',
      sub: offers.length > 0 ? `${offers.length} offer${offers.length > 1 ? 's' : ''}` : 'offers / applied',
      color: 'text-emerald-400',
    },
    {
      label: 'Pipeline Velocity',
      value: pipelineVelocity !== null ? `${pipelineVelocity}%` : '—',
      sub: `${interviews.length} interview${interviews.length !== 1 ? 's' : ''}`,
      color: 'text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-slate-900 border border-slate-800 rounded-lg p-4"
        >
          <p className="text-xs text-slate-500 mb-1">{m.label}</p>
          <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}

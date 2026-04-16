const KEYS = {
  SETTINGS: 'cp_settings',
  CVS: 'cp_cvs',
  ACTIVE_CV: 'cp_active_cv',
  JOBS: 'cp_jobs',
};

const parse = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export const storage = {
  getSettings: () => {
    const settings = parse(KEYS.SETTINGS, {});
    // Ensure outputLevel has a default
    return {
      outputLevel: 'full', // Default to full analysis
      ...settings,
    };
  },
  saveSettings: (data) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data)),

  getCVs: () => parse(KEYS.CVS, []),
  saveCVs: (cvs) => localStorage.setItem(KEYS.CVS, JSON.stringify(cvs)),

  getActiveCVId: () => localStorage.getItem(KEYS.ACTIVE_CV) || null,
  setActiveCVId: (id) => {
    if (id) localStorage.setItem(KEYS.ACTIVE_CV, id);
    else localStorage.removeItem(KEYS.ACTIVE_CV);
  },

  getJobs: () => parse(KEYS.JOBS, []),
  saveJobs: (jobs) => localStorage.setItem(KEYS.JOBS, JSON.stringify(jobs)),
};

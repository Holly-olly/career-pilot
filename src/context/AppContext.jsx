import { createContext, useContext, useState, useCallback } from 'react';
import { storage } from '../utils/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettingsState] = useState(() => storage.getSettings());
  const [cvs, setCVsState] = useState(() => storage.getCVs());
  const [activeCVId, setActiveCVIdState] = useState(() => storage.getActiveCVId());
  const [jobs, setJobsState] = useState(() => storage.getJobs());

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((updates) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  // ── CVs ───────────────────────────────────────────────────────────────────
  const addCV = useCallback((cv) => {
    setCVsState((prev) => {
      const next = [...prev, cv];
      storage.saveCVs(next);
      return next;
    });
  }, []);

  const deleteCV = useCallback((id) => {
    setCVsState((prev) => {
      const next = prev.filter((cv) => cv.id !== id);
      storage.saveCVs(next);
      return next;
    });
    setActiveCVIdState((prev) => {
      if (prev === id) {
        storage.setActiveCVId(null);
        return null;
      }
      return prev;
    });
  }, []);

  const setActiveCV = useCallback((id) => {
    storage.setActiveCVId(id);
    setActiveCVIdState(id);
  }, []);

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const addJob = useCallback((job) => {
    setJobsState((prev) => {
      const next = [job, ...prev];
      storage.saveJobs(next);
      return next;
    });
  }, []);

  const updateJob = useCallback((id, updates) => {
    setJobsState((prev) => {
      const next = prev.map((job) => (job.id === id ? { ...job, ...updates } : job));
      storage.saveJobs(next);
      return next;
    });
  }, []);

  const deleteJob = useCallback((id) => {
    setJobsState((prev) => {
      const next = prev.filter((job) => job.id !== id);
      storage.saveJobs(next);
      return next;
    });
  }, []);

  const activeCV = cvs.find((cv) => cv.id === activeCVId) || null;

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        cvs,
        addCV,
        deleteCV,
        setActiveCV,
        activeCVId,
        activeCV,
        jobs,
        addJob,
        updateJob,
        deleteJob,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

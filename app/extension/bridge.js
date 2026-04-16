/**
 * Career Pilot Bridge — bridge.js (content script)
 *
 * Injected into every Career Pilot page (localhost + Vercel).
 * Watches chrome.storage for job data written by the popup, then passes
 * it into the React app via localStorage + CustomEvent.
 *
 * If the popup included an apiKey in the payload, it is also written to
 * cp_settings in localStorage (only when no key is already saved) so
 * the user never has to paste the key again on the website.
 */

function deliverToApp(payload) {
  const { apiKey, ...jobData } = payload;

  // Save API key to app settings if provided and not already set
  if (apiKey) {
    try {
      const raw = localStorage.getItem('cp_settings');
      const settings = raw ? JSON.parse(raw) : {};
      if (!settings.userApiKey) {
        settings.userApiKey = apiKey;
        localStorage.setItem('cp_settings', JSON.stringify(settings));
      }
    } catch {}
    // Notify React so it can update in-memory state without a page reload
    window.dispatchEvent(new CustomEvent('cp_api_key', { detail: apiKey }));
  }

  localStorage.setItem('cp_bridge_job', JSON.stringify(jobData));
  window.dispatchEvent(new CustomEvent('cp_bridge', { detail: jobData }));
  chrome.storage.local.remove('cp_bridge_job');
}

// Case 1: Career Pilot was already open when the popup wrote the data.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.cp_bridge_job?.newValue) {
    deliverToApp(changes.cp_bridge_job.newValue);
  }
});

// Case 2: Career Pilot was opened AFTER the popup wrote the data.
chrome.storage.local.get('cp_bridge_job', (result) => {
  if (result.cp_bridge_job) {
    deliverToApp(result.cp_bridge_job);
  }
});

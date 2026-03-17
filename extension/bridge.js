/**
 * Career Pilot Bridge — bridge.js (content script)
 *
 * This script is injected into every Career Pilot page (localhost + Vercel).
 * It watches chrome.storage for job data written by the popup, then passes
 * it into the React app via localStorage + CustomEvent.
 *
 * No timing hacks needed — chrome.storage.onChanged fires the moment
 * the popup writes, whether Career Pilot was already open or just loaded.
 */

function deliverToApp(jobData) {
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

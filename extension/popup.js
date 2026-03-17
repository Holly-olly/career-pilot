/**
 * Career Pilot Bridge — popup.js
 *
 * Flow:
 * 1. Scrape the active tab (job page)
 * 2. Show a preview (role, company, JD snippet)
 * 3. On "Send": store data in chrome.storage.local, then open/focus Career Pilot.
 *    The bridge.js content script on the Career Pilot page picks it up instantly.
 */

const DEFAULT_URL = 'https://cv-matcher-azure.vercel.app';
let scrapedData = null;

// ─────────────────────────────────────────────────────────────────────────────
// Init: scrape current tab and show preview
// ─────────────────────────────────────────────────────────────────────────────
async function init() {
  const { cpUrl = DEFAULT_URL } = await chrome.storage.local.get('cpUrl');
  document.getElementById('cp-url').value = cpUrl;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeJobPage,
    });

    scrapedData = results[0]?.result;

    if (!scrapedData || !scrapedData.jd || scrapedData.jd.length < 50) {
      showError('No job description detected on this page.\nNavigate to a job posting and try again.');
      return;
    }

    renderPreview(scrapedData);
    show('main-panel');

  } catch (err) {
    showError("Can't scan this page.\n\nMake sure you're on a job posting (LinkedIn, Indeed, Glassdoor, etc.).");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scraper — runs INSIDE the job page tab
// ─────────────────────────────────────────────────────────────────────────────
function scrapeJobPage() {
  const first = (selectors) => {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 5) return text;
        }
      } catch {}
    }
    return null;
  };

  const role = first([
    '.job-details-jobs-unified-top-card__job-title h1',
    'h1.t-24.t-bold', 'h1[class*="job-title"]',
    'h1.jobsearch-JobInfoHeader-title', '[class*="JobTitle"] h1',
    'h1[data-test="job-title"]', '[class*="jobTitle"]',
    'h2[data-automation-id="jobPostingHeader"]',
    '.posting-headline h2', 'h1.app-title', 'h1',
  ]) || document.title.split(/[|\-–]/)[0].trim();

  const company = first([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.topcard__org-name-link',
    '[data-testid="inlineHeader-companyName"] a',
    '[data-testid="inlineHeader-companyName"]',
    '.jobsearch-CompanyInfoContainer a',
    '[data-test="employer-name"]',
    '[data-automation-id="company"]',
    '[class*="company-name"]', '[class*="companyName"]',
    '[class*="employer"]',
    '[itemprop="hiringOrganization"] [itemprop="name"]',
  ]) || '';

  const jdRaw = first([
    '#job-details',
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description',
    '#jobDescriptionText', '[class*="jobDescriptionText"]',
    '[class*="JobDetails_jobDescription"]',
    '[data-test="jobDescriptionText"]', '[data-test="description"]',
    '[data-automation-id="jobPostingDescription"]',
    '.posting-description', '#content',
    '[class*="job-description"]', '[class*="jobDescription"]',
    '[class*="description"]', 'article', 'main',
  ]) || document.body.innerText;

  const jd = jdRaw
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000);

  return { role: role.trim(), company: company.trim(), jd };
}

// ─────────────────────────────────────────────────────────────────────────────
// Send to Career Pilot
// ─────────────────────────────────────────────────────────────────────────────
async function sendToCareerPilot() {
  if (!scrapedData) return;

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  setStatus('');

  const cpUrl = (document.getElementById('cp-url').value.trim() || DEFAULT_URL).replace(/\/$/, '');

  try {
    // Write job data to chrome.storage — bridge.js on the Career Pilot page
    // will pick this up instantly via chrome.storage.onChanged.
    await chrome.storage.local.set({ cp_bridge_job: scrapedData });

    // Open or focus the Career Pilot tab
    const allTabs = await chrome.tabs.query({});
    const cpTab = allTabs.find((t) => t.url && t.url.startsWith(cpUrl));

    if (cpTab) {
      await chrome.tabs.update(cpTab.id, { active: true });
      if (cpTab.windowId) await chrome.windows.update(cpTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: cpUrl });
      // bridge.js will handle data on page load via chrome.storage.local.get
    }

    setStatus('✓ Sent to Career Pilot!', 'success');
    setTimeout(() => window.close(), 800);

  } catch (err) {
    btn.disabled = false;
    btn.textContent = '⚡ Send to Career Pilot';
    setStatus('Error: ' + (err.message || 'Something went wrong'), 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function renderPreview({ role, company, jd }) {
  document.getElementById('role-val').textContent    = role    || 'Could not detect';
  document.getElementById('company-val').textContent = company || 'Could not detect';
  document.getElementById('jd-preview').textContent  = jd.slice(0, 200);
  document.getElementById('jd-chars').textContent    = `${jd.length.toLocaleString()} characters extracted`;
}

function showError(msg) {
  hide('loading-panel');
  document.getElementById('error-msg').textContent = msg;
  show('error-panel');
}

function show(id) { hide('loading-panel'); document.getElementById(id).style.display = 'block'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

function setStatus(msg, type = '') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type;
}

// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('send-btn').addEventListener('click', sendToCareerPilot);

document.getElementById('save-url-btn').addEventListener('click', async () => {
  const url = document.getElementById('cp-url').value.trim();
  if (!url) return;
  await chrome.storage.local.set({ cpUrl: url });
  setStatus('URL saved!', 'success');
  setTimeout(() => setStatus(''), 1500);
});

init();

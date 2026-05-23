/**
 * Career Pilot Bridge — popup.js
 *
 * Flow (first install):
 * 1. Check chrome.storage.sync for stored Gemini API key.
 * 2. If no key → show onboarding panel (get free key from aistudio.google.com).
 * 3. User pastes key → validate with a tiny Gemini test call → store in chrome.storage.sync.
 * 4. Normal flow: scrape the active tab, show preview, send job + key to Career Pilot.
 */

const DEFAULT_URL = 'https://cv-matcher-azure.vercel.app';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
let scrapedData = null;
let storedApiKey = '';

// ─────────────────────────────────────────────────────────────────────────────
// Init: check for API key, then scrape or show onboarding
// ─────────────────────────────────────────────────────────────────────────────
async function init() {
  const { cpUrl = DEFAULT_URL, geminiApiKey = '' } = await chrome.storage.sync.get(['cpUrl', 'geminiApiKey']);
  document.getElementById('cp-url').value = cpUrl;
  storedApiKey = geminiApiKey;

  await scrapeAndShow();
}

async function scrapeAndShow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeJobPage,
    });

    scrapedData = results[0]?.result;

    if (!scrapedData || (!scrapedData.role && !scrapedData.company) || !scrapedData.jd || scrapedData.jd.length < 50) {
      hide('loading-panel');
      show('onboarding-panel');
      return;
    }

    renderPreview(scrapedData);
    show('main-panel');

  } catch (err) {
    hide('loading-panel');
    show('onboarding-panel');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding — save and validate API key
// ─────────────────────────────────────────────────────────────────────────────
async function saveApiKey() {
  const keyInput = document.getElementById('api-key-input');
  const key = keyInput.value.trim();

  if (!key || !key.startsWith('AIza')) {
    setKeyStatus('Paste a valid Gemini key (starts with AIza…)', 'error');
    keyInput.classList.add('invalid');
    return;
  }

  const btn = document.getElementById('save-key-btn');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  setKeyStatus('Validating key…', 'checking');
  keyInput.classList.remove('valid', 'invalid');

  try {
    // Minimal test call — empty contents triggers a fast 400 or 200 (key is valid either way if not 403)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 5 } }),
    });

    if (res.status === 403) {
      throw new Error('Key rejected by Google (403). Check you copied the full key.');
    }
    // 200 or 400 (bad request format) both mean the key itself is accepted
    keyInput.classList.add('valid');
    setKeyStatus('✓ Key valid!', 'success');

    // Store in chrome.storage.sync (syncs across devices)
    await chrome.storage.sync.set({ geminiApiKey: key });
    storedApiKey = key;

    setTimeout(async () => {
      hide('onboarding-panel');
      show('loading-panel');
      await scrapeAndShow();
    }, 700);

  } catch (err) {
    keyInput.classList.add('invalid');
    setKeyStatus(err.message || 'Could not validate key. Check your internet connection.', 'error');
    btn.disabled = false;
    btn.textContent = 'Save & Continue →';
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

  let company = first([
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
  ]);

  if (!company) {
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content?.trim();
    if (ogSite && ogSite.length > 1) company = ogSite;
  }

  if (!company) {
    try {
      const companyLink = document.querySelector('a[href*="/company/"]');
      if (companyLink) {
        const match = companyLink.href.match(/\/company\/([^/?#]+)/);
        if (match) company = decodeURIComponent(match[1]).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    } catch {}
  }

  if (!company) {
    try {
      const host = window.location.hostname.replace(/^www\./, '');
      const knownBoards = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'monster.com', 'simplyhired.com'];
      if (!knownBoards.includes(host)) {
        const domainName = host.split('.')[0];
        company = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    } catch {}
  }

  company = company || '';

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

  return { role: role.trim(), company: company.trim(), jd, positionUrl: window.location.href };
}

// ─────────────────────────────────────────────────────────────────────────────
// Send to Career Pilot (includes API key so the app can use it immediately)
// ─────────────────────────────────────────────────────────────────────────────
async function sendToCareerPilot() {
  if (!scrapedData) return;

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  setStatus('');

  const cpUrl = (document.getElementById('cp-url').value.trim() || DEFAULT_URL).replace(/\/$/, '');

  try {
    // Read potentially-edited role and company from the inputs
    const role    = document.getElementById('role-input').value.trim()    || scrapedData.role;
    const company = document.getElementById('company-input').value.trim() || scrapedData.company;

    // Include the API key so the app can auto-configure itself
    await chrome.storage.local.set({
      cp_bridge_job: { ...scrapedData, role, company, apiKey: storedApiKey },
    });

    const allTabs = await chrome.tabs.query({});
    const cpTab = allTabs.find((t) => t.url && t.url.startsWith(cpUrl));

    if (cpTab) {
      await chrome.tabs.update(cpTab.id, { active: true });
      if (cpTab.windowId) await chrome.windows.update(cpTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: cpUrl });
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
function renderPreview({ role, company, jd, positionUrl }) {
  document.getElementById('role-input').value    = role || '';
  document.getElementById('company-input').value = company || '';

  const linkEl = document.getElementById('link-val');
  if (positionUrl && positionUrl.trim()) {
    linkEl.href = positionUrl;
    linkEl.textContent = positionUrl.slice(0, 50) + (positionUrl.length > 50 ? '…' : '');
    linkEl.style.color = '#6366f1';
  } else {
    linkEl.textContent = 'Could not detect';
    linkEl.style.color = '#64748b';
    linkEl.removeAttribute('href');
  }

  document.getElementById('jd-preview').textContent = jd.slice(0, 200);
  document.getElementById('jd-chars').textContent   = `${jd.length.toLocaleString()} characters extracted`;
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

function setKeyStatus(msg, type = '') {
  const el = document.getElementById('key-status');
  el.textContent = msg;
  el.className = type;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event listeners
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('send-btn').addEventListener('click', sendToCareerPilot);

document.getElementById('save-url-btn').addEventListener('click', async () => {
  const url = document.getElementById('cp-url').value.trim();
  if (!url) return;
  await chrome.storage.local.set({ cpUrl: url });
  await chrome.storage.sync.set({ cpUrl: url });
  setStatus('URL saved!', 'success');
  setTimeout(() => setStatus(''), 1500);
});

// Open Career Pilot button (from welcome panel)
document.getElementById('open-app-btn').addEventListener('click', async () => {
  const { cpUrl = DEFAULT_URL } = await chrome.storage.sync.get(['cpUrl']);
  chrome.tabs.create({ url: cpUrl.replace(/\/$/, '') });
  window.close();
});

// Change key link in main panel — shows welcome panel
document.getElementById('change-key-link').addEventListener('click', () => {
  hide('main-panel');
  show('onboarding-panel');
});

init();

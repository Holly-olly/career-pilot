# ✈ Career Pilot

**AI-powered job fit analyser for senior professionals.**

Paste a job description, get an instant strategic report: match score, fit analysis, CV tweaks, and ATS keywords — all evaluated against your hidden context (career focus, dealbreakers, unlisted talents) that never appears in your CV.

🔗 **Live app:** [cv-matcher-azure.vercel.app](https://cv-matcher-azure.vercel.app)

---

## The Story Behind This Project

> *This section is for you to fill in — your words, your experience.*

I started building Career Pilot myself, then handed it to Claude Code as a technical challenge: take my idea and build it without me sitting in the driver's seat.

<!--
  ✍️ Add your story here:
  - What problem were you solving?
  - What did you build first on your own?
  - What did you ask Claude Code to do?
  - What surprised you about working this way?
  - What would you do differently?
-->

---

## What It Does

| Feature | Description |
|---|---|
| **AI Fit Analysis** | Scores each role 0–100 against your CV and hidden context |
| **Verdict** | Apply / Consider / Skip — with reasoning |
| **CV Tweaks** | Role-specific wording suggestions and ATS keywords |
| **Pipeline Dashboard** | Track every role: status, score, verdict, date |
| **Multi-filter + Sort** | Filter by status and verdict simultaneously; sort any column |
| **Multiple CV versions** | Keep "General", "Research-focused", "Product PM" etc. and switch between them |
| **CV upload** | Upload PDF, Word (.docx), TXT, or RTF — text extracted automatically |
| **Chrome Extension** | One-click scrape from LinkedIn, Indeed, Glassdoor → auto-fills the analysis form |
| **Hidden context** | Talents, career focus, and dealbreakers injected into every prompt — invisible to the AI's "hiring manager" persona |
| **No account needed** | All data stays in your browser's localStorage — private by default |

---

## Architecture

```
Browser (React SPA)
    │
    ├── localStorage          ← all your data lives here, private per browser
    │
    └── POST /api/analyze     ← Vercel serverless function
            │
            └── Google Gemini AI   ← API key never leaves the server
```

**Why serverless?** The Gemini API key is stored as a Vercel environment variable. It never touches the frontend — so sharing the app with friends is safe.

**Why localStorage?** No database, no accounts, no GDPR headaches. Each person who uses the URL gets their own completely private data.

---

## Project Structure

```
career-pilot/
├── api/
│   └── analyze.js          ← Vercel serverless function (AI proxy, hides API key)
├── src/
│   ├── App.jsx             ← routing (state-based, no react-router)
│   ├── constants.js        ← statuses, verdicts, score colours — edit here
│   ├── context/
│   │   └── AppContext.jsx  ← global state (settings, CVs, jobs) + localStorage sync
│   ├── utils/
│   │   ├── ai.js           ← prompt builder + Gemini caller
│   │   ├── parser.js       ← extracts score/verdict from AI text
│   │   └── storage.js      ← thin localStorage wrapper
│   └── components/
│       ├── Navbar.jsx      ← top nav + active CV indicator
│       ├── Dashboard.jsx   ← pipeline table with filters and sorting
│       ├── MetricsBar.jsx  ← avg score, applied, interviews, offers
│       ├── NewAnalysis.jsx ← analysis form + Chrome extension integration
│       ├── JobDetail.jsx   ← full report + re-analyze panel
│       ├── CVManager.jsx   ← CV versions (paste or upload PDF/DOCX/TXT/RTF)
│       ├── Settings.jsx    ← strategic context + import
│       └── Spinner.jsx     ← shared loading spinner
├── extension/
│   ├── manifest.json       ← Chrome Extension Manifest V3
│   ├── popup.html          ← extension popup UI
│   ├── popup.js            ← scrapes job page, sends to app
│   └── bridge.js           ← content script: delivers data to the React app
├── vercel.json             ← serverless config
└── .gitignore              ← secrets and personal data excluded
```

---

## Running Locally

**Prerequisites:** Node.js 18+, a [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)

```bash
# 1. Clone and install
git clone https://github.com/Holly-olly/career-pilot.git
cd career-pilot
npm install

# 2. Add your key to .env.local (this file is gitignored)
echo "VITE_GEMINI_API_KEY=your_key_here" >> .env.local

# 3. Start
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

> In dev mode the app calls Gemini directly from the browser using `VITE_GEMINI_API_KEY`.
> In production (Vercel) it routes through `/api/analyze` — the key never reaches the frontend.

---

## Deploying Your Own Instance

```bash
# First time
npx vercel

# Add your API key (stored server-side, never public)
npx vercel env add GEMINI_API_KEY

# Deploy to production
npx vercel --prod
```

The app is now live at your Vercel URL. Share it with friends — each person gets their own private data in their own browser.

---

## Chrome Extension Setup

The extension lets you send any job posting to Career Pilot with one click.

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder from this repo
4. Visit any job posting (LinkedIn, Indeed, Glassdoor, company sites…)
5. Click the Career Pilot icon → **Send to Career Pilot**

The extension works with the live Vercel URL out of the box. To use it with a local dev server, update `DEFAULT_URL` in `extension/popup.js`.

---

## Customising

**Add a job status** → edit `STATUSES` in `src/constants.js`

**Change score thresholds** → edit `scoreColor()` in `src/constants.js`

**Change the AI model** → edit `GEMINI_MODEL` in `src/utils/ai.js` and `api/analyze.js`

**Change the analysis prompt** → edit `buildPrompt()` in `src/utils/ai.js`

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite 5 |
| Styling | Tailwind CSS (dark theme) |
| Hosting | Vercel (free tier) |
| AI | Google Gemini (`gemini-3.1-flash-lite-preview`) |
| Data | Browser localStorage — no database |
| Extension | Chrome Manifest V3 |
| CV parsing | pdfjs-dist (PDF), mammoth (DOCX) |

---

## Privacy

- **Your data never leaves your browser** — jobs, CVs, and settings are stored in `localStorage` only
- **Your API key never leaves the server** — it lives in a Vercel environment variable
- No analytics, no tracking, no accounts

---

*Built with [Claude Code](https://claude.ai/claude-code)*

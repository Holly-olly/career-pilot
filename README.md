# ✈ Career Pilot

> **A browser-based AI career co-pilot for high-level professionals.**
> Paste a job description, get a strategic fit report — score, verdict, gap analysis, CV tweaks and ATS keywords — in under 20 seconds. Track your whole application pipeline in one place.

---

## 🧠 The Story Behind This Project

*This space is reserved for the builder's story.*

I started building Career Pilot myself to solve a real problem: evaluating whether a senior role was worth pursuing used to take me an hour of manual comparison. I wanted something that could act like a trusted advisor — someone who knows my background deeply and can read a JD and give me a straight answer.

Once I had a clear vision of what I needed, I wrote a detailed product spec and handed it to **Claude Code** to build the full application — without me writing a single line of code myself. This repo is the result.

*← Add your own experience here: what it felt like to collaborate with Claude, what surprised you, what you'd do differently, what worked brilliantly.*

---

## 🗂 Project Structure

```
career-pilot/
├── api/
│   └── analyze.js          # Vercel serverless function — proxies Gemini API (keeps key hidden)
│
├── extension/              # Chrome Extension "Career Pilot Bridge"
│   ├── manifest.json       # MV3 manifest
│   ├── popup.html / .js    # Popup UI — scrapes job page & sends data to the app
│   └── bridge.js           # Content script — relays data from extension to React app
│
├── src/
│   ├── constants.js        # Shared constants: STATUSES, VERDICTS, scoreColor, verdictBadge
│   ├── context/
│   │   └── AppContext.jsx  # Global state (settings, CVs, jobs) + localStorage persistence
│   ├── utils/
│   │   ├── ai.js           # buildPrompt() + analyzeJob() — all AI logic lives here
│   │   ├── parser.js       # parseReport() extracts score/verdict from AI text
│   │   └── storage.js      # Thin localStorage wrapper (all keys prefixed cp_)
│   └── components/
│       ├── Navbar.jsx          # Top nav + active CV indicator
│       ├── Dashboard.jsx       # Pipeline table with multi-select filters + column sorting
│       ├── MetricsBar.jsx      # Avg score, applied count, interview rate, offers
│       ├── NewAnalysis.jsx     # Form to paste JD + run analysis
│       ├── JobDetail.jsx       # Full report view + re-analyze panel
│       ├── CVManager.jsx       # Upload/paste CV versions, set active
│       ├── Settings.jsx        # Strategic context + import existing analyses
│       └── Spinner.jsx         # Shared loading spinner
│
├── vercel.json             # Vercel config: serverless function + install command
└── package.json
```

---

## 🚀 Deploy (recommended — no terminal needed after first setup)

The app runs as a static site + one serverless function on **Vercel** (free tier).
Friends can use your deployment in any browser — no VS Code, no Node, nothing to install.

### First deploy

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/career-pilot.git
cd career-pilot

# 2. Install
npm install

# 3. Deploy
npx vercel --prod
```

Vercel will ask a few setup questions, then give you a URL like `https://career-pilot-xyz.vercel.app`.

### Add the Gemini API key (one-time)

```bash
npx vercel env add GEMINI_API_KEY
# Paste your key when prompted, select all environments
npx vercel --prod   # redeploy to pick up the new env var
```

Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com) → **Get API Key**.

### Redeploy after code changes

```bash
npx vercel --prod
```

---

## 💻 Local development

```bash
npx vercel env pull .env.local   # pull env vars from Vercel (needed for /api/analyze)
npx vercel dev                   # starts Vite + serverless function together on :3000
```

> **Why `vercel dev` and not `npm run dev`?**
> `npm run dev` starts Vite but skips the serverless function, so AI calls fail.
> `vercel dev` emulates the full Vercel environment locally.

---

## 📱 Chrome Extension setup

The **Career Pilot Bridge** extension lets you send any job posting to the app with one click.

1. Open Chrome → `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `extension/` folder
3. Open a job posting (LinkedIn, Indeed, Glassdoor, etc.)
4. Click the extension icon → **⚡ Send to Career Pilot**

The app opens automatically with the role, company and JD pre-filled.

> To share the extension with friends, zip the `extension/` folder and send it — they load it the same way.

---

## 🔧 First-time app setup

1. **Settings** — Fill in your Strategic Context (Persona, Unlisted Talents, Hard NOs, Current Focus). This is injected invisibly into every AI analysis.
2. **My CVs** — Upload a PDF/Word/TXT file or paste CV text. Set one version as Active.
3. **New Analysis** — Paste a job description (or use the Chrome extension) → Analyze.

---

## 📦 Import existing analyses

Already analysed roles in another tool? Run the migration script against your old data:

```bash
node scripts/migrate.js
```

Then go to **Settings → Import Existing Analyses** and upload the `migration-output.json` it creates. Duplicates are skipped automatically.

---

## 🔒 Privacy

- All data (CVs, analyses, pipeline) lives in **your browser's localStorage** only
- Nothing is stored on any server or database
- The Gemini API key lives in a Vercel environment variable — never in the browser
- Each person who opens the app URL has their own completely private data
- Clearing browser data removes everything — copy important reports first

---

## ✨ Features

| Feature | Details |
|---|---|
| **AI fit analysis** | Score (0–100), verdict (Apply / Consider / Skip), strengths, gaps, CV tweaks, ATS keywords |
| **Strategic context** | Persona, unlisted talents, hard NOs and career focus baked invisibly into every prompt |
| **Pipeline dashboard** | Full status lifecycle: New → Target → Applied → Interview → Offer |
| **Multi-select filters** | Filter by any combination of statuses and verdicts simultaneously |
| **Column sorting** | Sort by Company, Role, Score, Verdict, Status or Date |
| **Metrics bar** | Avg match score, total applied, active targets, success rate, pipeline velocity |
| **Re-analyze** | Swap CV version or update context and re-run without re-entering the JD |
| **CV manager** | Multiple CV versions; upload PDF, Word (.docx), TXT or RTF |
| **Chrome extension** | One-click scrape from LinkedIn, Indeed, Glassdoor and most company career pages |
| **Import** | Bulk-import from a previous pipeline via `migration-output.json` |

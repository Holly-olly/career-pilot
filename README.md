# ✈ Career Pilot

**AI-powered job fit analyser for senior professionals.**

Paste a job description — or use the Chrome extension to import it from any job board — and get an instant report: a match score (0–100), a go/no-go verdict, tailored CV tweaks, and ATS keywords. The analysis runs against your actual CV and your hidden career context (focus, dealbreakers, unlisted talents) that never appears on paper. Everything stays in your browser. No accounts, no database.

🔗 **Live app:** [cv-matcher-azure.vercel.app](https://cv-matcher-azure.vercel.app)

---

![Pipeline view](screenshots/pipeline.png)
![Analysis result](screenshots/result.png)

---

## Background

I built this tool to solve my own problem — cutting through a high-volume job search as a psychometrician moving into people data science. The first version worked, but the UX was rough and the scoring logic was opaque.

Over several iterations I improved the interface significantly and replaced the original prompt-only scoring with a structured matching layer (deterministic scoring across domain, seniority, and skills) combined with an LLM report. That work raised a deeper question: *how good is this scoring system actually?*

That question became a standalone evaluation project — applying psychometric frameworks (criterion validity, reliability, fairness) alongside AI/engineering methods (ranking quality, robustness, cross-model benchmarking) to systematically assess how well the tool predicts real hiring outcomes.

> 📊 **Evaluation project:** [github.com/Holly-olly/llm-cv-screener-eval](https://github.com/Holly-olly/llm-cv-screener-eval) *(coming soon)*

---

## What It Does

| Feature | Description |
|---|---|
| **AI Fit Score** | 0–100 match against your CV and hidden context |
| **Verdict** | Apply / Consider / Skip |
| **CV Tweaks** | Role-specific suggestions |
| **ATS Keywords** | Terms to add to your CV to pass screening |
| **Pipeline Dashboard** | Track every role: status, score, verdict |
| **Multiple CV versions** | Switch between tailored CV versions per application |
| **CV upload** | PDF, Word, TXT, RTF — text extracted automatically |
| **Chrome Extension** | One-click import from LinkedIn, Indeed, Glassdoor, any careers page |
| **No account needed** | All data in browser localStorage — private by default |

---

## Running Locally

**Prerequisites:** Node.js 18+, a free [Gemini API key](https://aistudio.google.com/app/apikey)

```bash
git clone https://github.com/Holly-olly/career-pilot.git
cd career-pilot/app
npm install
echo "VITE_GEMINI_API_KEY=your_key_here" >> .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Chrome Extension

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `app/extension/` folder
3. Go to any job posting → click the Career Pilot icon → **Send to Career Pilot**

The published extension will be available on the Chrome Web Store shortly.

---

## Tech Stack

React 18 · Vite · Tailwind CSS · Google Gemini API · Vercel (serverless) · Chrome Manifest V3 · pdfjs-dist · mammoth

---

## Privacy

No data leaves your browser except the AI call to Google's API using your own key. No analytics, no tracking, no accounts. [Privacy policy](https://cv-matcher-azure.vercel.app/privacy.html).

---

*Built with [Claude Code](https://claude.ai/claude-code)*

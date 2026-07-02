# Usage Guide: ccusage-report

A zero-dependency HTML spending dashboard for [Claude Code](https://claude.ai/code). Generate reports from your local Claude Code session data in seconds—no build step, no server required.

Powered by [`ccusage`](https://github.com/ryoppippi/ccusage) — a CLI that reads Claude Code's local session JSONL files and aggregates token/cost data by day, month, and session. `generate.js` calls `ccusage` via `npx` to collect totals, then does its own JSONL scan for per-turn diagnostics and attribution data.

---

## Requirements

| Dependency | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18 | Runs `generate.js`; provides `npx` |
| **npx** | bundled with Node | Fetches and runs `ccusage@latest` on each generation |
| **ccusage** | latest (auto-fetched) | Aggregates Claude Code session data (daily/monthly/session totals + model breakdown) |
| **Claude Code** | any | Must be installed and used — creates session data at `~/.claude/projects/` |
| **Chart.js** | 4.4.0 (CDN) | Client-side chart rendering in the HTML pages (no install needed) |

No `npm install` needed. `ccusage` is fetched automatically via `npx ccusage@latest` every time you run `generate.js`.

**ccusage** reads the same `~/.claude/projects/` JSONL files that Claude Code writes. It handles cost calculation and model-level aggregation. `generate.js` uses its JSON output (`-j` flag) as the primary cost/token source, then does an additional JSONL scan for turn-level diagnostics not exposed by ccusage (file re-reads, tool payloads, dead turns, attribution to skills/hooks/MCP).

---

## Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/pratikgh0se/ccusage-report.git
cd ccusage-report
```

### 2. Verify Node.js
```bash
node --version    # Should be ≥ 18.0.0
npx --version
```

### 3. (Optional) Review configuration
Edit the path prefix in `projects.html` to match your home directory:
```js
// In projects.html, around line 10:
let PREFIX = '/Users/your-username/';  // macOS
let PREFIX = '/home/your-username/';   // Linux
```
This prefix is stripped from project names for readability. You can also change it interactively in the UI.

---

## Generating the Dashboard

### Quick start
```bash
# From the project directory:
node generate.js
```

**What happens:**
1. `generate.js` calls `ccusage` (via `npx ccusage@latest`) three times:
   - `daily -j` — per-day cost totals
   - `monthly -j` — per-month totals
   - `session -j` — per-session breakdown
2. Scans `~/.claude/projects/` for turn-level detail in `.jsonl` files
3. Injects aggregated data as a global `window.CCUSAGE_DATA` variable into all 8 HTML pages
4. Prints summary statistics

**Output:**
```
Updated index.html
Updated cost.html
Updated models.html
Updated efficiency.html
Updated patterns.html
Updated projects.html
Updated optimizer.html
Updated diagnostics.html
Done. Generated at 2024-11-28T10:45:32.123Z
Total cost: $123.45
Days: 30, Sessions: 145, Projects: 12
Timeline entries: 145, Models: 3
Diagnostics: 145 sessions analysed, 8 re-read files
Attribution — Skills: 5, MCP: 3, Hooks: 67
```

### Refresh your data
Re-run `node generate.js` any time to pull fresh session data. All 8 HTML files update in place.

### Troubleshooting

**"Failed: npx ccusage@latest daily -j"**
- Verify `ccusage` can read your Claude Code sessions: check that `~/.claude/projects/` exists
- Try running `ccusage` manually: `npx ccusage@latest session -j | head` should show JSON session data

**"No data in dashboard after generation"**
- Verify you have active Claude Code sessions: `ls ~/.claude/projects/` should show directories
- Check that sessions have usage: look at a recent session `.jsonl` file
- Run `node generate.js` again to refresh

**Node.js version error**
- Upgrade Node.js: `brew install node` (macOS) or visit https://nodejs.org

---

## Opening & Viewing the Dashboard

### On macOS
```bash
open index.html
```

### On Linux
```bash
xdg-open index.html
```

### On Windows
```bash
start index.html
```

### Or: drag-and-drop
Drag `index.html` from Finder/Explorer into your browser.

### Note
All 8 pages are **linked**. Use the navigation at the top of each page to jump between sections.

---

## Configuration

### Path prefix (projects.html)
The `projects.html` page strips a common prefix from project names to improve readability.

**Default (hardcoded to original author's path — change this):**
```js
let PREFIX = '/Users/pghose/';  // In projects.html, line ~10
```

**To change:**
1. Edit `projects.html` and replace the PREFIX string
2. Regenerate: `node generate.js`

**Or: use the UI**
There's a text input at the top of `projects.html` where you can change the prefix interactively without regenerating.

### Environment variables
No environment variables required. `generate.js` always reads from `~/.claude/projects/`.

---

## Page Reference

All 8 pages are **standalone HTML files** — they contain embedded data and vanilla JavaScript. No server, no API calls, no build step.

### index.html — Overview
- **What:** Your spending dashboard at a glance
- **Shows:**
  - Total spend (lifetime)
  - Session count
  - Total tokens
  - Daily cost bar chart (last 30 days)
  - Recent sessions table with model + cost

### cost.html — Cost Breakdown
- **What:** Daily and monthly spending patterns
- **Shows:**
  - Daily spend bar chart with 7-day moving average
  - Monthly totals grouped by calendar month
  - Burn rate vs previous period
  - Trend analysis

### models.html — Model Breakdown
- **What:** Cost and token usage by model (Opus, Sonnet, Haiku, etc.)
- **Shows:**
  - Cost per model
  - Input / output / cache tokens per model
  - Model share donut chart
  - Cost efficiency per model ($ per M tokens)

### efficiency.html — Cache & Efficiency
- **What:** How well you're using Claude Code's prompt caching
- **Shows:**
  - Cache hit rate: `cache_read_tokens / cache_creation_tokens`
  - Output/input ratio: value extracted per input token
  - Per-session efficiency scores
  - ROI on prompt caching

### patterns.html — Usage Patterns
- **What:** When and how you use Claude Code
- **Shows:**
  - Tool usage frequency (Read, Bash, Edit, Write, etc.)
  - Hour-of-day heatmap — which hours you're most active
  - Day-of-week activity
  - Tool call patterns

### projects.html — Project Breakdown
- **What:** Spending and activity by project
- **Shows:**
  - Total cost, tokens, session count per project
  - Per-project model mix (e.g., "40% Opus, 60% Sonnet")
  - Activity Gantt timeline (which project you worked on when)
  - Timeline filtering: view by day, week, or month
  - Configurable path prefix (strip home directory from names)

### optimizer.html — Cost Drivers & Forecast
- **What:** Where money is going and what you could optimize
- **Shows:**
  - 14-day rolling spend forecast
  - Ranked cost drivers:
    - Most expensive projects
    - Most expensive models
    - Costliest skills (if used via Claude Code skills)
    - Most expensive MCP tools
    - Hook overhead (if hooks are in use)
  - Auto-generated optimization tips based on:
    - Cache hit rate (too low → enable caching)
    - Opus share (too high → consider Sonnet)
    - Hook overhead % (too high → review hooks)
    - File re-read count (too high → better context management)

### diagnostics.html — Inefficiency Finder
- **What:** Find sessions and patterns that waste tokens
- **Shows:**
  - **Dead turns:** contexts >50k tokens but output <200 (paid for a big window, got nothing)
  - **Opus waste:** Opus turns where output <500 tokens (expensive model, trivial output)
  - **File re-reads:** files read 3+ times in a session (already in context, redundant)
  - Context growth chart per session (expandable rows)
  - Tool call payload sizes
  - Global bash command frequency (flags common `cat` usage that could be optimized)
  - Per-session diagnostics ranked by cost

---

## Data Privacy

**All data stays on your machine.** The script:
- Only reads `~/.claude/projects/` (your local Claude Code session data)
- Calls `npx ccusage@latest` (which also reads locally)
- Writes to your local HTML files
- **Never** sends data anywhere

The generated HTML files contain all your session data embedded as JavaScript. Keep them private if they contain sensitive information.

---

## How It Works (Technical Overview)

### Data collection
1. **`ccusage` aggregation:** Calls `ccusage` three times (daily, monthly, session) to get totals and breakdown by model
2. **JSONL scan:** Walks `~/.claude/projects/*/` to read `.jsonl` files
3. **Per-turn analysis:** Parses JSON lines to extract:
   - Token counts (input, output, cache read, cache creation)
   - Tool calls (Read, Bash, Edit, etc.)
   - Model per turn
   - File paths and bash commands
   - Attribution (skills, MCP tools, hooks)

### Data injection
Aggregated data is serialized as JSON and injected into each HTML file between markers:
```html
<!-- DATA:START -->
<script id="ccusage-data">
window.CCUSAGE_DATA = { ... };
</script>
<!-- DATA:END -->
```

### Rendering
Each HTML page:
- Reads `window.CCUSAGE_DATA`
- Parses and transforms the data
- Renders charts using [Chart.js 4.4.0](https://www.chartjs.org/) (loaded from CDN)
- Builds tables and timelines with vanilla JavaScript

---

## Troubleshooting & FAQ

### Q: I don't see any data
**A:** 
- Run `node generate.js` — the script must complete without errors
- Verify Claude Code sessions exist: `ls ~/.claude/projects/` should show directories like `my-project`, `another-project`
- Hard-refresh your browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS)

### Q: The dashboard is outdated
**A:** Re-run `node generate.js` to pull fresh session data and regenerate all HTML files.

### Q: Can I edit the HTML/CSS?
**A:** Yes, the HTML files are plain vanilla JavaScript + Chart.js. Feel free to customize styles or add pages. To preserve your edits across regenerations, keep `generate.js` unchanged — it only replaces content between `<!-- DATA:START -->` and `<!-- DATA:END -->` markers.

### Q: Can I host this on a website?
**A:** Yes. Push the generated HTML files to any static host (GitHub Pages, Netlify, etc.). Keep in mind:
- All data is embedded in the HTML
- Anyone with access to the file can see your spending and session details
- Consider privacy implications before sharing

### Q: How often should I regenerate?
**A:** 
- **Daily:** If you want fresh cost/efficiency data every morning
- **Weekly:** If you run reports for retrospectives
- **As needed:** After large coding sessions to spot trends

### Q: What if my home directory path changed?
**A:** Edit the `PREFIX` variable in `projects.html`:
```js
let PREFIX = '/new/path/to/home/';
```
Or use the text input at the top of `projects.html` to change it interactively.

### Q: Does this work offline?
**A:** Once generated, yes — the HTML files are fully self-contained. `node generate.js` requires internet access to fetch `ccusage` via npx.

---

## Contributing

The project intentionally has **no build step** and **zero dependencies** (except Node.js for running the generator). 
- Keep it that way: no webpack, no npm packages in the HTML
- Charts use Chart.js from CDN for simplicity
- All logic is vanilla JavaScript inside each HTML file
- PRs welcome!

---

## License

MIT

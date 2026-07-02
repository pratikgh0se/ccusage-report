# ccusage-report

A zero-dependency, zero-build HTML spending dashboard for [Claude Code](https://claude.ai/code) powered by [`ccusage`](https://github.com/ryoppippi/ccusage).

Eight linked pages give you a full picture of where your AI spend goes — by day, model, project, session, tool, and efficiency metric.

---

## Screenshots

> Run `node generate.js` then open `index.html` in a browser.

---

## Pages

| Page | What you see |
|------|-------------|
| `index.html` | Overview: KPIs, daily burn, recent sessions |
| `cost.html` | Daily / weekly / monthly cost breakdown, burn rate |
| `models.html` | Cost + token breakdown per model |
| `efficiency.html` | Cache hit rate, output/input ratio, efficiency scores |
| `patterns.html` | Tool usage patterns, hour-of-day heatmap |
| `projects.html` | Per-project cost, session count, model mix, gantt timeline (day/week/month) |
| `optimizer.html` | 14-day spend forecast, ranked cost drivers, auto-generated tips |
| `diagnostics.html` | Dead turns, file re-reads, Opus waste, context growth, tool payload sizes |

---

## Requirements

- **Node.js** ≥ 18
- **npx** (bundled with Node)
- **Claude Code** installed and used — session data lives in `~/.claude/projects/`

No npm install needed. `generate.js` fetches `ccusage@latest` via npx on every run.

---

## Usage

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/ccusage-report.git
cd ccusage-report

# Generate — reads your ~/.claude session data
node generate.js

# Open the dashboard
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Configuring your path prefix

`projects.html` strips a common path prefix to shorten project names. Default is `/Users/pghose/`. Change it in the UI (there is a text input at the top of the page) — or edit the default in `projects.html`:

```js
let PREFIX = '/Users/YOUR_USERNAME/';
```

---

## How it works

`generate.js` does three things:

1. **Calls `ccusage`** via `npx ccusage@latest daily/monthly/session -j` to get aggregated cost data
2. **Scans `~/.claude/projects/*/\*.jsonl`** for turn-level detail: context sizes, tool calls, file reads, model per turn, session attribution (skills, MCP, hooks)
3. **Injects `window.CCUSAGE_DATA`** as a `<script>` block into all 8 HTML files between `<!-- DATA:START -->` / `<!-- DATA:END -->` markers

All 8 pages read from that single global — no server, no build, no reload loop.

---

## What each page tells you

### index.html — Overview
- Total spend, session count, token totals
- Daily cost bar chart (last 30 days)
- Recent sessions table with cost + model

### cost.html — Cost breakdown
- Daily spend bar chart with 7-day moving average
- Monthly totals grouped by month
- Burn rate vs previous period

### models.html — Model breakdown
- Cost, input tokens, output tokens, cache tokens per model
- Model share donut chart

### efficiency.html — Cache + efficiency
- Cache hit rate (cache_read / cache_creation)
- Output/input ratio: are you getting value per token?
- Per-session efficiency scores

### patterns.html — Usage patterns
- Tool usage bar chart (Read, Bash, Edit, etc.)
- Hour-of-day usage heatmap
- Day-of-week activity

### projects.html — Project breakdown
- Total cost, token count, session count per project
- Per-project model mix
- **Activity gantt timeline** — shows which project you worked on when, coloured by model, with day/week/month navigation
- Configurable PATH_PREFIX to strip home directory noise

### optimizer.html — Cost drivers + forecast
- 14-day rolling forecast using recent spend average
- Ranked cost drivers: most expensive projects, models, skills, MCP tools, hook overhead
- Auto-generated optimization tips based on: cache hit rate, Opus share, hook spend %, re-read count

### diagnostics.html — Inefficiency finder
- **Dead turns**: turns where context was >50k tokens but output was <200 tokens (you paid for a big window and got nothing)
- **Opus waste**: Opus turns where output was <500 tokens (expensive model, trivial output)
- **File re-reads**: files read 3+ times in a session (already in context, wasted tokens)
- Context growth chart per session (expandable rows)
- Tool call payload sizes
- Global bash command frequency (flags `cat` usage)

---

## Refresh

Re-run `node generate.js` any time to pull fresh data. The script updates all 8 HTML files in place.

---

## Data privacy

All data stays local. `generate.js` only reads `~/.claude/` and calls `npx ccusage@latest` (which also reads locally). Nothing is sent anywhere.

---

## Contributing

PRs welcome. The project intentionally has no build step — keep it that way. All logic is vanilla JS inside each HTML file; Chart.js 4.4.0 is loaded from CDN.

---

## License

MIT

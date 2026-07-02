# ccusage-report

A zero-dependency, zero-build HTML spending dashboard for [Claude Code](https://claude.ai/code) powered by [`ccusage`](https://github.com/ryoppippi/ccusage).

Eight linked pages give you a full picture of where your AI spend goes — by day, model, project, session, tool, and efficiency metric.

---

## Install

### Homebrew (recommended)

```bash
brew tap pratikgh0se/ccusage-report
brew install ccusage-report
```

Then just run:

```bash
ccusage-report
```

Generates a fresh report and opens the dashboard in your browser. Installs `ccusage` automatically if not present.

### Manual

```bash
git clone https://github.com/pratikgh0se/ccusage-report.git
cd ccusage-report
./install.sh
```

Then run `ccusage-report` from anywhere.

---

## Requirements

- **Node.js** ≥ 18
- **ccusage** (installed automatically by Homebrew formula or `install.sh`)
- **Claude Code** installed and used — session data lives in `~/.claude/projects/`

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

## How it works

`generate.js` does three things:

1. **Calls `ccusage`** (`ccusage daily/monthly/session -j`) to get aggregated cost data
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
- **Dead turns**: turns where context was >50k tokens but output was <200 tokens
- **Opus waste**: Opus turns where output was <500 tokens
- **File re-reads**: files read 3+ times in a session
- Context growth chart per session (expandable rows)
- Tool call payload sizes
- Global bash command frequency (flags `cat` usage)

---

## Configuring path prefix

`projects.html` strips a common path prefix to shorten project names. Change it in the UI (text input at the top of the page) — or edit the default in `projects.html`:

```js
let PREFIX = '/Users/YOUR_USERNAME/';
```

---

## Data privacy

All data stays local. `generate.js` only reads `~/.claude/` and calls `ccusage` locally. Nothing is sent anywhere.

---

## Contributing

PRs welcome. No build step — keep it that way. All logic is vanilla JS inside each HTML file; Chart.js 4.4.0 is loaded from CDN.

---

## License

MIT

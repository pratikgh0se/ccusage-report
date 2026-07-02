#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  } catch (e) {
    console.error(`Failed: ${cmd}`, e.message);
    process.exit(1);
  }
}

const daily = run('npx ccusage@latest daily -j');
const monthly = run('npx ccusage@latest monthly -j');
const session = run('npx ccusage@latest session -j');

// Single pass over all JSONL files → projectData, attributionData, timelineData
function buildAllFromJSONL(sessions) {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) return { projectData: [], attributionData: { skills: [], mcpTools: [], hookSessionCount: 0, hookCost: 0 }, timelineData: [] };

  function decodeProjName(encoded) {
    return encoded.replace(/-/g, '/');
  }

  // UUID → ccusage session
  const sessionCostMap = {};
  const sessionDataMap = {};
  for (const s of sessions) {
    sessionCostMap[s.period] = s.totalCost || 0;
    sessionDataMap[s.period] = s;
  }

  const projectMap = {};
  const skillCosts = {};
  const mcpCosts = {};
  let hookSessionCount = 0;
  let hookCost = 0;
  const timeline = [];

  for (const proj of fs.readdirSync(projectsDir)) {
    const projPath = path.join(projectsDir, proj);
    if (!fs.statSync(projPath).isDirectory()) continue;
    const projectPath = decodeProjName(proj);

    for (const f of fs.readdirSync(projPath)) {
      if (!f.endsWith('.jsonl')) continue;
      const uuid = f.replace('.jsonl', '');
      const sessionCost = sessionCostMap[uuid] || 0;
      const sessionData = sessionDataMap[uuid];
      const filePath = path.join(projPath, f);

      let firstTs = null;
      let isHook = false;
      let skill = null;
      let mcp = null;
      const models = new Set();

      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          const ts = obj.timestamp;
          if (ts && !firstTs) firstTs = ts;
          const msg = obj.message;
          if (msg && msg.model && !msg.model.includes('<')) models.add(msg.model);
          if (obj.attributionSkill && !skill) skill = obj.attributionSkill;
          if (obj.attributionMcpTool && !mcp) mcp = obj.attributionMcpTool;
          if (obj.hookInfos && obj.hookInfos.length > 0) isHook = true;
        } catch (_) {}
      }

      // Project aggregation (only for sessions matched in ccusage)
      if (sessionData) {
        if (!projectMap[projectPath]) {
          projectMap[projectPath] = {
            path: projectPath,
            encodedName: proj,
            totalCost: 0, inputTokens: 0, outputTokens: 0,
            cacheReadTokens: 0, cacheCreationTokens: 0,
            totalTokens: 0, sessionCount: 0, modelCosts: {},
          };
        }
        const p = projectMap[projectPath];
        p.totalCost += sessionData.totalCost || 0;
        p.inputTokens += sessionData.inputTokens || 0;
        p.outputTokens += sessionData.outputTokens || 0;
        p.cacheReadTokens += sessionData.cacheReadTokens || 0;
        p.cacheCreationTokens += sessionData.cacheCreationTokens || 0;
        p.totalTokens += sessionData.totalTokens || 0;
        p.sessionCount += 1;
        for (const mb of (sessionData.modelBreakdowns || [])) {
          const m = mb.modelName || 'unknown';
          p.modelCosts[m] = (p.modelCosts[m] || 0) + (mb.cost || 0);
        }
      }

      // Attribution
      if (isHook) { hookSessionCount++; hookCost += sessionCost; }
      if (skill && sessionCost > 0) skillCosts[skill] = (skillCosts[skill] || 0) + sessionCost;
      if (mcp && sessionCost > 0) mcpCosts[mcp] = (mcpCosts[mcp] || 0) + sessionCost;

      // Timeline
      if (firstTs) {
        const endTs = sessionData?.metadata?.lastActivity || firstTs;
        timeline.push({
          uuid,
          projectPath,
          start: firstTs,
          end: endTs,
          cost: sessionCost,
          models: [...models],
          modelsUsed: sessionData?.modelsUsed || [],
          skill,
          mcp,
          isHook,
        });
      }
    }
  }

  const projectData = Object.values(projectMap).sort((a, b) => b.totalCost - a.totalCost);
  const attributionData = {
    skills: Object.entries(skillCosts).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost),
    mcpTools: Object.entries(mcpCosts).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost),
    hookSessionCount,
    hookCost,
  };
  const timelineData = timeline.sort((a, b) => a.start.localeCompare(b.start));

  return { projectData, attributionData, timelineData };
}

// Aggregate model costs globally from ccusage session data
function buildModelData(sessions) {
  const modelMap = {};
  for (const s of sessions) {
    for (const mb of (s.modelBreakdowns || [])) {
      const m = mb.modelName || 'unknown';
      if (!modelMap[m]) modelMap[m] = { name: m, cost: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, sessionCount: 0 };
      modelMap[m].cost += mb.cost || 0;
      modelMap[m].outputTokens += mb.outputTokens || 0;
      modelMap[m].inputTokens += mb.inputTokens || 0;
      modelMap[m].cacheReadTokens += mb.cacheReadTokens || 0;
      modelMap[m].cacheCreationTokens += mb.cacheCreationTokens || 0;
      modelMap[m].sessionCount += 1;
    }
  }
  return Object.values(modelMap).sort((a, b) => b.cost - a.cost);
}

// Build diagnostics: turn-level context, dead turns, re-reads, tool payloads
function buildDiagnosticsData(sessions) {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) return { sessions: [], globalToolCounts: {}, globalReReads: [], globalBashCmds: {} };

  const sessionCostMap = {};
  for (const s of sessions) sessionCostMap[s.period] = s.totalCost || 0;

  function decodeProjName(enc) { return enc.replace(/-/g, '/'); }

  const diagSessions = [];
  const globalToolCounts = {};
  const globalFileReads = {};
  const globalBashCmds = {};

  for (const proj of fs.readdirSync(projectsDir)) {
    const projPath = path.join(projectsDir, proj);
    if (!fs.statSync(projPath).isDirectory()) continue;
    const projectPath = decodeProjName(proj);

    for (const f of fs.readdirSync(projPath)) {
      if (!f.endsWith('.jsonl')) continue;
      const uuid = f.replace('.jsonl', '');
      const sessionCost = sessionCostMap[uuid] || 0;
      const filePath = path.join(projPath, f);

      const turns = [];         // {input,output,cacheRead,cacheCreate,model,ts}
      const toolCounts = {};    // tool_name → count
      const fileReads = {};     // file_path → count
      const bashCmds = {};      // first_word → count
      let toolResultBytes = 0;
      let toolCallsTotal = 0;

      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          const msg = obj.message;
          if (!msg) continue;

          // Assistant turns → usage
          if (obj.type === 'assistant' && msg.usage) {
            const u = msg.usage;
            const inp = (u.input_tokens || 0);
            const out = (u.output_tokens || 0);
            const cr  = (u.cache_read_input_tokens || 0);
            const cc  = (u.cache_creation_input_tokens || 0);
            if (inp + out + cr + cc > 0) {
              turns.push({
                ts: obj.timestamp || '',
                input: inp, output: out,
                cacheRead: cr, cacheCreate: cc,
                context: inp + cr + cc,
                model: msg.model || '',
              });
            }
            // Tool uses in assistant content
            for (const block of (msg.content || [])) {
              if (!block || block.type !== 'tool_use') continue;
              const name = block.name || 'unknown';
              toolCounts[name] = (toolCounts[name] || 0) + 1;
              globalToolCounts[name] = (globalToolCounts[name] || 0) + 1;
              toolCallsTotal++;
              const inp2 = block.input || {};
              if (name === 'Read' && inp2.file_path) {
                const fp = inp2.file_path;
                fileReads[fp] = (fileReads[fp] || 0) + 1;
                globalFileReads[fp] = (globalFileReads[fp] || 0) + 1;
              }
              if (name === 'Bash' && inp2.command) {
                const cmd = inp2.command.trim().split(/\s+/)[0] || 'empty';
                bashCmds[cmd] = (bashCmds[cmd] || 0) + 1;
                globalBashCmds[cmd] = (globalBashCmds[cmd] || 0) + 1;
              }
            }
          }

          // Tool results → measure payload size
          if (obj.type === 'user') {
            for (const block of (msg.content || [])) {
              if (!block || block.type !== 'tool_result') continue;
              const content = block.content;
              if (Array.isArray(content)) {
                for (const c of content) {
                  if (c && c.type === 'text') toolResultBytes += (c.text || '').length;
                }
              } else if (typeof content === 'string') {
                toolResultBytes += content.length;
              }
            }
          }
        } catch (_) {}
      }

      if (turns.length === 0) continue;

      // Derived metrics
      const contexts = turns.map(t => t.context);
      const outputs  = turns.map(t => t.output);
      const maxCtx   = Math.max(...contexts);
      const avgCtx   = Math.round(contexts.reduce((a,b) => a+b, 0) / contexts.length);
      const totalOut = outputs.reduce((a,b) => a+b, 0);
      const totalIn  = turns.reduce((a,b) => a + b.input, 0);
      const totalCR  = turns.reduce((a,b) => a + b.cacheRead, 0);
      const totalCC  = turns.reduce((a,b) => a + b.cacheCreate, 0);

      // Dead turns: context >50k but output <200
      const deadTurns = turns.filter(t => t.context > 50_000 && t.output < 200).length;

      // Opus short-output turns (wasteful model routing)
      const opusWasteTurns = turns.filter(t => t.model.includes('opus') && t.output < 500).length;

      // Context growth: sample every N turns for chart
      const sampleEvery = Math.max(1, Math.floor(turns.length / 40));
      const contextSeries = turns
        .filter((_, i) => i % sampleEvery === 0)
        .map(t => ({ ts: t.ts, ctx: t.context, out: t.output, model: t.model }));

      // Top re-reads
      const topRereads = Object.entries(fileReads)
        .filter(([, c]) => c > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, count }));

      // Top tools this session
      const topTools = Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      diagSessions.push({
        uuid,
        projectPath,
        cost: sessionCost,
        turns: turns.length,
        toolCallsTotal,
        toolResultBytes,
        maxCtx, avgCtx,
        totalOutput: totalOut,
        totalInput: totalIn,
        totalCacheRead: totalCR,
        totalCacheCreate: totalCC,
        deadTurns,
        opusWasteTurns,
        cacheROI: totalCC > 0 ? Math.round(totalCR / totalCC * 10) / 10 : 0,
        contextSeries,
        topRereads,
        topTools,
      });
    }
  }

  diagSessions.sort((a, b) => b.cost - a.cost);

  // Global re-reads ranked
  const globalReReads = Object.entries(globalFileReads)
    .filter(([, c]) => c > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([file, count]) => ({ file, count }));

  return { sessions: diagSessions, globalToolCounts, globalReReads, globalBashCmds };
}

const { projectData, attributionData, timelineData } = buildAllFromJSONL(session.session || []);
const modelData = buildModelData(session.session || []);
const diagnosticsData = buildDiagnosticsData(session.session || []);

const data = {
  daily: daily.daily,
  monthly: monthly.monthly,
  session: session.session,
  totals: monthly.totals,
  projectData,
  attributionData,
  timelineData,
  modelData,
  diagnosticsData,
  generatedAt: new Date().toISOString(),
};

const dataScript = `<script id="ccusage-data">
window.CCUSAGE_DATA = ${JSON.stringify(data, null, 2)};
</script>`;

const htmlFiles = ['index.html', 'cost.html', 'models.html', 'efficiency.html', 'patterns.html', 'projects.html', 'optimizer.html', 'diagnostics.html'];

for (const file of htmlFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} (not yet created)`);
    continue;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  const start = '<!-- DATA:START -->';
  const end = '<!-- DATA:END -->';
  if (html.includes(start)) {
    html = html.replace(
      new RegExp(`${start}[\\s\\S]*?${end}`),
      () => `${start}\n${dataScript}\n${end}`
    );
  } else {
    html = html.replace('</head>', () => `${start}\n${dataScript}\n${end}\n</head>`);
  }
  fs.writeFileSync(filePath, html);
  console.log(`Updated ${file}`);
}

console.log(`Done. Generated at ${data.generatedAt}`);
console.log(`Total cost: $${data.totals?.totalCost?.toFixed(2) ?? 'N/A'}`);
console.log(`Days: ${data.daily.length}, Sessions: ${data.session.length}, Projects: ${projectData.length}`);
console.log(`Timeline entries: ${timelineData.length}, Models: ${modelData.length}`);
console.log(`Diagnostics: ${diagnosticsData.sessions.length} sessions analysed, ${diagnosticsData.globalReReads.length} re-read files`);
console.log(`Attribution — Skills: ${attributionData.skills.length}, MCP: ${attributionData.mcpTools.length}, Hooks: ${attributionData.hookSessionCount}`);

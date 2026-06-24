import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const TASKS_DIR = path.join(ROOT_DIR, "frontiercode_github_upload");
const RUNS_DIR = path.join(ROOT_DIR, "runs");
const GENERATED_EVALS_DIR = path.join(TASKS_DIR, "generated_tasks", "_eval");
const RUN_ROOTS = [RUNS_DIR, GENERATED_EVALS_DIR];
const PORT = Number(process.env.PORT || 3026);
const HOST = process.env.HOST || "127.0.0.1";
const TASK_TEST_FILES = [
  "tests/grader/frontiercode.yaml",
  "tests/test.sh",
  "tests/hidden/run_criteria.py"
];

const TEXT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function encodeId(value) {
  return Buffer.from(value).toString("base64url");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function humanizeSlug(value) {
  return String(value || "")
    .replace(/^frontiercode[-_]?/i, "")
    .replace(/__/g, " / ")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || "Untitled Task";
}

function parseSimpleToml(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) data[match[1]] = match[2];
  }
  return data;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readTextIfExists(filePath) {
  if (!(await exists(filePath))) return "";
  return fs.readFile(filePath, "utf8");
}

async function walkFiles(dir, matcher, output = []) {
  if (!(await exists(dir))) return output;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "__pycache__") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, matcher, output);
    } else if (matcher(fullPath, entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
}

function patchStats(patchText) {
  const stats = { files: 0, additions: 0, deletions: 0 };
  const files = new Set();
  for (const line of patchText.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      const parts = line.split(" ");
      if (parts[2]) files.add(parts[2].replace(/^a\//, ""));
    } else if (line.startsWith("--- a/")) {
      files.add(line.slice(6).trim());
    } else if (line.startsWith("+++ b/")) {
      files.add(line.slice(6).trim());
    }
    if (line.startsWith("+") && !line.startsWith("+++")) stats.additions += 1;
    if (line.startsWith("-") && !line.startsWith("---")) stats.deletions += 1;
  }
  stats.files = files.size;
  return stats;
}

function patchDiffStats(diffText) {
  const stats = { hunks: 0, additions: 0, deletions: 0, changedLines: 0 };
  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("@@")) stats.hunks += 1;
    else if (line.startsWith("+") && !line.startsWith("+++")) stats.additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) stats.deletions += 1;
  }
  stats.changedLines = stats.additions + stats.deletions;
  return stats;
}

function diffLinesFromText(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  if (!normalized) return [];
  return normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");
}

function fallbackPatchDiff(baseText, headText) {
  const base = diffLinesFromText(baseText);
  const head = diffLinesFromText(headText);
  if (baseText === headText) return "";

  let start = 0;
  while (start < base.length && start < head.length && base[start] === head[start]) {
    start += 1;
  }

  let baseEnd = base.length - 1;
  let headEnd = head.length - 1;
  while (baseEnd >= start && headEnd >= start && base[baseEnd] === head[headEnd]) {
    baseEnd -= 1;
    headEnd -= 1;
  }

  const contextStart = Math.max(0, start - 3);
  const contextEndBase = Math.min(base.length, baseEnd + 4);
  const contextEndHead = Math.min(head.length, headEnd + 4);
  const oldStart = contextStart + 1;
  const newStart = contextStart + 1;
  const oldLength = Math.max(0, contextEndBase - contextStart);
  const newLength = Math.max(0, contextEndHead - contextStart);
  const lines = [
    "diff --git a/submission.patch b/submission.patch",
    "--- a/submission.patch",
    "+++ b/submission.patch",
    `@@ -${oldStart},${oldLength} +${newStart},${newLength} @@`
  ];

  for (let index = contextStart; index < start; index += 1) {
    lines.push(` ${base[index] ?? ""}`);
  }
  for (let index = start; index <= baseEnd; index += 1) {
    lines.push(`-${base[index] ?? ""}`);
  }
  for (let index = start; index <= headEnd; index += 1) {
    lines.push(`+${head[index] ?? ""}`);
  }
  for (let index = baseEnd + 1; index < contextEndBase; index += 1) {
    lines.push(` ${base[index] ?? ""}`);
  }

  return `${lines.join("\n")}\n`;
}

function spawnText(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      });
    });
  });
}

async function generatePatchDiff(baseText, headText) {
  if (baseText === headText) return "";

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "frontiercode-compare-"));
  try {
    await fs.mkdir(path.join(tempDir, "base-run"));
    await fs.mkdir(path.join(tempDir, "compared-run"));
    await fs.writeFile(path.join(tempDir, "base-run", "submission.patch"), baseText, "utf8");
    await fs.writeFile(path.join(tempDir, "compared-run", "submission.patch"), headText, "utf8");

    const result = await spawnText("git", [
      "diff",
      "--no-index",
      "--no-color",
      "--minimal",
      "--",
      "base-run/submission.patch",
      "compared-run/submission.patch"
    ], { cwd: tempDir });

    if (result.code === 0 || result.code === 1) return result.stdout;
    return fallbackPatchDiff(baseText, headText);
  } catch {
    return fallbackPatchDiff(baseText, headText);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function durationSeconds(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return null;
  const start = Date.parse(startedAt);
  const finish = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(finish)) return null;
  return Math.max(0, Math.round((finish - start) / 1000));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampScore(value) {
  return Math.max(0, Math.min(1, value));
}

function weightedCriterionScore(result) {
  const criteria = Array.isArray(result.criteria_results) ? result.criteria_results : [];
  // FrontierCode ground truth: a solution that fails any blocker criterion receives score 0.
  const blockerFailed =
    (Array.isArray(result.blocker_failures) && result.blocker_failures.length > 0) ||
    criteria.some((criterion) => criterion.blocker && !criterion.passed);
  if (blockerFailed) return 0;
  const fallback = typeof result.score === "number" ? result.score : null;
  if (!criteria.length) return fallback;

  let scoreTotal = 0;
  let weightedScore = 0;
  for (const criterion of criteria) {
    const weight = Math.max(0, numberOr(criterion.weight, 1));
    const score = clampScore(numberOr(criterion.score, criterion.passed ? 1 : 0));
    scoreTotal += weight;
    weightedScore += score * weight;
  }
  return scoreTotal > 0 ? weightedScore / scoreTotal : fallback;
}

function compactInstruction(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#.+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function parseYamlValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const quoted = value.match(/^["'](.*)["']$/);
  return quoted ? quoted[1] : value;
}

function parseFrontierCodeCriteria(text) {
  const criteria = [];
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let inCriteria = false;
  let current = null;
  let foldedKey = "";
  let foldedLines = [];

  const finishFolded = () => {
    if (current && foldedKey) {
      current[foldedKey] = foldedLines.join(" ").replace(/\s+/g, " ").trim();
    }
    foldedKey = "";
    foldedLines = [];
  };

  const setField = (key, value) => {
    if (value.trim() === ">" || value.trim() === "|") {
      foldedKey = key;
      foldedLines = [];
      return;
    }
    current[key] = parseYamlValue(value);
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!inCriteria) {
      if (trimmed === "criteria:") inCriteria = true;
      continue;
    }

    if (foldedKey) {
      const startsNextField = /^\s{4}[A-Za-z0-9_-]+:\s*/.test(rawLine);
      const startsNextItem = /^\s{2}-\s+/.test(rawLine);
      const startsNextSection = /^\S/.test(rawLine) && /^[A-Za-z0-9_-]+:/.test(trimmed);
      if (!startsNextField && !startsNextItem && !startsNextSection) {
        if (trimmed) foldedLines.push(trimmed);
        continue;
      }
      finishFolded();
    }

    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\S/.test(rawLine) && trimmed !== "criteria:" && /^[A-Za-z0-9_-]+:/.test(trimmed)) break;

    const itemMatch = rawLine.match(/^\s{2}-\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (itemMatch) {
      current = {};
      criteria.push(current);
      setField(itemMatch[1], itemMatch[2]);
      continue;
    }

    const fieldMatch = rawLine.match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (fieldMatch && current) setField(fieldMatch[1], fieldMatch[2]);
  }

  finishFolded();
  return criteria.map((criterion) => ({
    criterion_id: criterion.id || "",
    category: criterion.category || "",
    details: criterion.description || "",
    method: criterion.method || "",
    blocker: Boolean(criterion.blocker),
    weight: typeof criterion.weight === "number" ? criterion.weight : null,
    command: criterion.command || ""
  })).filter((criterion) => criterion.criterion_id);
}

function modelFromRunPath(relPath) {
  const part = relPath.split("/").find((segment) => segment.startsWith("model-"));
  if (!part) return "";
  return part
    .slice("model-".length)
    .replace("-gpt-", "/gpt-")
    .replace(/-/g, ".");
}

function effortFromRunPath(relPath) {
  const part = relPath.split("/").find((segment) => segment.startsWith("reasoning-"));
  return part ? part.slice("reasoning-".length) : "";
}

function taskNameFromTrialPath(relTrialDir, meta) {
  if (meta?.task_path) return path.posix.basename(meta.task_path);
  if (meta?.task_id) return path.posix.basename(meta.task_id);

  const parts = relTrialDir.split("/");
  const evalIndex = parts.indexOf("_eval");
  if (evalIndex !== -1) {
    const evalTaskSegment = parts[evalIndex + 1] || "";
    if (evalTaskSegment && evalTaskSegment !== "in_dist") return evalTaskSegment;
    const trialName = parts.at(-1) || "";
    return trialName.replace(/__[A-Za-z0-9]+$/, "");
  }

  return parts[0] === "runs" ? parts[1] || "" : "";
}

async function scanTasks() {
  const instructionPaths = await walkFiles(TASKS_DIR, (fullPath, name) => name === "instruction.md");
  const tasks = [];
  const aliases = new Map();

  for (const instructionPath of instructionPaths.sort()) {
    const taskRoot = path.dirname(instructionPath);
    const taskRel = toPosix(path.relative(TASKS_DIR, taskRoot));
    const absoluteRel = toPosix(path.relative(ROOT_DIR, taskRoot));
    const instruction = await fs.readFile(instructionPath, "utf8");
    const tomlPath = path.join(taskRoot, "task.toml");
    const toml = parseSimpleToml(await readTextIfExists(tomlPath));
    const graderYamlPath = path.join(taskRoot, "tests", "grader", "frontiercode.yaml");
    const criteria = parseFrontierCodeCriteria(await readTextIfExists(graderYamlPath));
    const slug = path.basename(taskRoot);
    const id = encodeId(`task:${taskRel}`);
    const task = {
      id,
      key: taskRel,
      slug,
      name: toml.name || humanizeSlug(slug),
      title: humanizeSlug(toml.name || slug),
      description: toml.description || compactInstruction(instruction),
      instructionPath: toPosix(path.relative(ROOT_DIR, instructionPath)),
      taskRootPath: absoluteRel,
      dockerImage: toml.docker_image || "",
      networkMode: toml.network_mode || "",
      hasTaskToml: Boolean(toml.name || toml.description),
      criteria,
      trialIds: []
    };

    tasks.push(task);
    for (const alias of new Set([
      taskRel,
      absoluteRel,
      slug,
      toml.name,
      toml.name?.replace(/-/g, "_"),
      `examples/${slug}`,
      `generated_tasks/${slug}`
    ].filter(Boolean))) {
      aliases.set(alias, task.id);
    }
  }

  return { tasks, aliases };
}

function resolveTaskId({ meta, resultTaskId, runTaskName, aliases }) {
  const candidates = [
    meta?.task_path,
    meta?.task_id,
    resultTaskId,
    runTaskName,
    `examples/${runTaskName}`,
    `generated_tasks/${runTaskName}`
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (aliases.has(candidate)) return aliases.get(candidate);
    const basename = path.posix.basename(candidate);
    if (aliases.has(basename)) return aliases.get(basename);
  }
  return "";
}

async function summarizeTrajectory(trajectoryPath) {
  if (!(await exists(trajectoryPath))) return null;
  try {
    const trajectory = await readJson(trajectoryPath);
    const steps = Array.isArray(trajectory.steps) ? trajectory.steps : [];
    const sourceCounts = {};
    for (const step of steps) {
      sourceCounts[step.source || "unknown"] = (sourceCounts[step.source || "unknown"] || 0) + 1;
    }
    return {
      steps: steps.length,
      sourceCounts,
      finalMetrics: trajectory.final_metrics || null,
      agent: trajectory.agent || null
    };
  } catch {
    return null;
  }
}

async function buildTrial(resultPath, aliases) {
  const trialDir = path.dirname(path.dirname(resultPath));
  const relTrialDir = toPosix(path.relative(ROOT_DIR, trialDir));
  const result = await readJson(resultPath);
  const meta = result.metadata || {};
  const runTaskName = taskNameFromTrialPath(relTrialDir, meta);
  const runResultPath = path.join(trialDir, "result.json");
  const runResult = (await exists(runResultPath)) ? await readJson(runResultPath) : {};
  const patchPath = path.join(trialDir, "verifier", "submission.patch");
  const artifactPatchPath = path.join(trialDir, "artifacts", "submission.patch");
  const stdoutPath = path.join(trialDir, "verifier", "test-stdout.txt");
  const trajectoryPath = path.join(trialDir, "agent", "trajectory.json");
  const patchText = (await exists(patchPath)) ? await fs.readFile(patchPath, "utf8") : await readTextIfExists(artifactPatchPath);
  const criteria = Array.isArray(result.criteria_results) ? result.criteria_results : [];
  const passedCriteria = criteria.filter((criterion) => criterion.passed).length;
  const failedCriteria = criteria.length - passedCriteria;
  const blockerFailures = Array.isArray(result.blocker_failures) ? result.blocker_failures : [];
  const taskId = resolveTaskId({ meta, resultTaskId: result.task_id, runTaskName, aliases });
  const trajectory = await summarizeTrajectory(trajectoryPath);
  const agentResult = runResult.agent_result || {};
  const configAgent = runResult.config?.agent || {};

  return {
    id: encodeId(`trial:${relTrialDir}`),
    taskId,
    taskKey: meta.task_path || result.task_id || runTaskName,
    trialName: path.basename(trialDir),
    trialPath: relTrialDir,
    model: meta.model || configAgent.model_name || modelFromRunPath(relTrialDir),
    agent: meta.agent || configAgent.name || "",
    reasoningEffort: meta.reasoning_effort || configAgent.kwargs?.reasoning_effort || effortFromRunPath(relTrialDir),
    pass: Boolean(result.pass),
    score: weightedCriterionScore(result),
    reward: typeof result.reward === "number" ? result.reward : null,
    criteriaTotal: criteria.length,
    criteriaPassed: passedCriteria,
    criteriaFailed: failedCriteria,
    blockerFailures: blockerFailures.length,
    criteria,
    startedAt: runResult.started_at || meta.job_created_at || "",
    finishedAt: runResult.finished_at || "",
    durationSeconds: durationSeconds(runResult.started_at, runResult.finished_at),
    tokens: {
      input: agentResult.n_input_tokens ?? trajectory?.finalMetrics?.total_prompt_tokens ?? null,
      output: agentResult.n_output_tokens ?? trajectory?.finalMetrics?.total_completion_tokens ?? null,
      cached: agentResult.n_cache_tokens ?? trajectory?.finalMetrics?.total_cached_tokens ?? null,
      total: trajectory?.finalMetrics?.extra?.total_tokens ?? null
    },
    costUsd: agentResult.cost_usd ?? trajectory?.finalMetrics?.total_cost_usd ?? null,
    patchStats: patchStats(patchText),
    artifacts: {
      instruction: Boolean(taskId),
      patch: patchText.length > 0,
      stdout: await exists(stdoutPath),
      trajectory: await exists(trajectoryPath),
      result: await exists(runResultPath)
    },
    trajectory
  };
}

async function scanTrials(aliases) {
  const resultPaths = [...new Set((await Promise.all(RUN_ROOTS.map((runRoot) => (
    walkFiles(runRoot, (fullPath) => fullPath.endsWith(`${path.sep}verifier${path.sep}frontiercode_result.json`))
  )))).flat())];
  const trials = [];
  for (const resultPath of resultPaths.sort()) {
    try {
      trials.push(await buildTrial(resultPath, aliases));
    } catch (error) {
      trials.push({
        id: encodeId(`broken:${toPosix(path.relative(ROOT_DIR, resultPath))}`),
        taskId: "",
        trialName: path.basename(path.dirname(path.dirname(resultPath))),
        trialPath: toPosix(path.relative(ROOT_DIR, path.dirname(path.dirname(resultPath)))),
        model: "",
        agent: "",
        reasoningEffort: "",
        pass: false,
        score: null,
        reward: null,
        criteriaTotal: 0,
        criteriaPassed: 0,
        criteriaFailed: 0,
        blockerFailures: 0,
        criteria: [],
        error: error.message,
        artifacts: {}
      });
    }
  }
  return trials.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

// Frontier-solver preference for the per-task in-dist categorization (ground truth reports per model).
const FRONTIER_MODEL_PREF = [
  "openai/gpt-5.5", "gpt-5.5", "openai-gpt-5-5",
  "anthropic/gpt-5.5", "anthropic-gpt-5-5", "openai/gpt-5", "openai-gpt-5",
];

function trialCellKeys(trial) {
  const parts = String(trial.trialPath || "").split("/");
  const effIdx = parts.findIndex((s) => s.startsWith("reasoning-"));
  const modelIdx = parts.findIndex((s) => s.startsWith("model-"));
  const model = trial.model || (modelIdx >= 0 ? parts[modelIdx].slice("model-".length) : "unknown");
  const effort = trial.reasoningEffort || (effIdx >= 0 ? parts[effIdx].slice("reasoning-".length) : "default");
  // The harbor run dir (timestamp__hash) sits right after the reasoning- segment; used to de-pool reruns.
  const run = (effIdx >= 0 && parts[effIdx + 1]) ? parts[effIdx + 1] : (parts[parts.length - 2] || "run");
  return { model, effort, run };
}

// Runs older than this before a task's newest run are treated as stale (e.g. from a previous
// version of the task, before it was regenerated) and excluded from categorization.
const STALE_RUN_WINDOW_MS = 12 * 60 * 60 * 1000;

// Harbor run dirs look like "2026-06-23__17-14-36__hash"; parse to epoch ms for staleness checks.
function parseRunTime(run) {
  const m = /^(\d{4})-(\d{2})-(\d{2})__(\d{2})-(\d{2})-(\d{2})/.exec(run || "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

// FrontierCode ground truth: per (model, effort) take the STRONGEST run (most trials, latest as
// tiebreak so a 1-trial probe can't override a 5-trial calibration), report each model at its
// best effort, categorize on the frontier model. Runs older than STALE_RUN_WINDOW_MS before the
// task's newest run are dropped so pre-regeneration results can't mis-categorize a task.
function groundTruthStats(trials) {
  const valid = trials.filter((t) => t && !t.error && typeof t.pass === "boolean");
  if (!valid.length) {
    return { category: "unrun", passRate: null, score: null, nTrials: 0, model: null, effort: null, perModel: [], staleDropped: 0 };
  }
  const enriched = valid.map((t) => { const k = trialCellKeys(t); return { t, model: k.model, effort: k.effort, run: k.run, rt: parseRunTime(k.run) }; });
  const times = enriched.map((e) => e.rt).filter((x) => x != null);
  const newest = times.length ? Math.max(...times) : null;
  const fresh = newest == null ? enriched : enriched.filter((e) => e.rt == null || newest - e.rt <= STALE_RUN_WINDOW_MS);

  const byModel = new Map();
  for (const e of fresh) {
    if (!byModel.has(e.model)) byModel.set(e.model, new Map());
    const byEffort = byModel.get(e.model);
    if (!byEffort.has(e.effort)) byEffort.set(e.effort, new Map());
    const byRun = byEffort.get(e.effort);
    if (!byRun.has(e.run)) byRun.set(e.run, []);
    byRun.get(e.run).push(e.t);
  }
  const perModel = [];
  for (const [model, byEffort] of byModel) {
    let best = null;
    for (const [effort, byRun] of byEffort) {
      // strongest run for this cell: most trials, latest run as tiebreak
      const runKey = [...byRun.keys()].sort((a, b) => (byRun.get(b).length - byRun.get(a).length) || (a < b ? 1 : -1))[0];
      const cell = byRun.get(runKey);
      const n = cell.length;
      const passRate = cell.filter((t) => t.pass).length / n;
      const scored = cell.filter((t) => typeof t.score === "number");
      const score = scored.length ? scored.reduce((a, t) => a + t.score, 0) / scored.length : null;
      const cand = { effort, passRate, score, nTrials: n, run: runKey };
      const cs = cand.score ?? -1;
      const bs = best?.score ?? -1;
      if (!best || cs > bs || (cs === bs && cand.passRate > best.passRate)) best = cand;
    }
    perModel.push({ model, effort: best.effort, passRate: best.passRate, score: best.score, nTrials: best.nTrials });
  }
  let primary = null;
  for (const pref of FRONTIER_MODEL_PREF) {
    primary = perModel.find((m) => m.model === pref || m.model === pref.replace(/\//g, "-"));
    if (primary) break;
  }
  if (!primary) primary = perModel.slice().sort((a, b) => b.nTrials - a.nTrials)[0];
  const passRate = primary.passRate;
  const category = passRate > 0 && passRate < 1 ? "indist" : "outdist";
  return {
    category, passRate, score: primary.score, nTrials: primary.nTrials,
    model: primary.model, effort: primary.effort, perModel, staleDropped: enriched.length - fresh.length,
  };
}

async function scanOverview() {
  const { tasks, aliases } = await scanTasks();
  const trials = await scanTrials(aliases);
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  for (const trial of trials) {
    const task = taskMap.get(trial.taskId);
    if (task) task.trialIds.push(trial.id);
  }

  for (const task of tasks) {
    const taskTrials = task.trialIds.map((id) => trials.find((trial) => trial.id === id)).filter(Boolean);
    const scoredTrials = taskTrials.filter((trial) => typeof trial.score === "number");
    task.runCount = taskTrials.length;
    task.passCount = taskTrials.filter((trial) => trial.pass).length;
    task.failCount = taskTrials.filter((trial) => !trial.pass).length;
    task.bestScore = scoredTrials.length ? Math.max(...scoredTrials.map((trial) => trial.score)) : null;
    task.latestStartedAt = taskTrials.map((trial) => trial.startedAt).filter(Boolean).sort().at(-1) || "";
    // Ground-truth aggregation (best effort of latest 5-trial run, frontier model) for in-dist categorization.
    task.gt = groundTruthStats(taskTrials);
  }

  const criteriaTotal = trials.reduce((sum, trial) => sum + trial.criteriaTotal, 0);
  const criteriaPassed = trials.reduce((sum, trial) => sum + trial.criteriaPassed, 0);
  const passedTrials = trials.filter((trial) => trial.pass).length;
  const gtCounts = { indist: 0, outdist: 0, unrun: 0 };
  for (const task of tasks) gtCounts[task.gt?.category || "unrun"] += 1;

  return {
    root: ROOT_DIR,
    generatedAt: new Date().toISOString(),
    summary: {
      tasks: tasks.length,
      tasksWithRuns: tasks.filter((task) => task.runCount > 0).length,
      trials: trials.length,
      passedTrials,
      failedTrials: trials.length - passedTrials,
      passRate: trials.length ? passedTrials / trials.length : 0,
      indistTasks: gtCounts.indist,
      outdistTasks: gtCounts.outdist,
      criteriaTotal,
      criteriaPassed,
      criteriaFailed: criteriaTotal - criteriaPassed
    },
    tasks: tasks.sort((a, b) => {
      if (b.runCount !== a.runCount) return b.runCount - a.runCount;
      return a.title.localeCompare(b.title);
    }),
    trials
  };
}

function findOverviewItem(overview, id) {
  const trial = overview.trials.find((item) => item.id === id);
  if (trial) return { kind: "trial", item: trial };
  const task = overview.tasks.find((item) => item.id === id);
  if (task) return { kind: "task", item: task };
  return null;
}

function taskForOverviewItem(overview, found) {
  if (!found) return null;
  if (found.kind === "task") return found.item;
  return overview.tasks.find((candidate) => candidate.id === found.item.taskId) || null;
}

async function readTaskTestsArtifact(overview, id) {
  const task = taskForOverviewItem(overview, findOverviewItem(overview, id));
  if (!task) return "";

  const taskRoot = path.join(ROOT_DIR, task.taskRootPath);
  const sections = [];
  for (const relPath of TASK_TEST_FILES) {
    const filePath = path.join(taskRoot, ...relPath.split("/"));
    const text = await readTextIfExists(filePath);
    if (text.trim()) {
      sections.push(`# ${relPath}\n\n${text.trimEnd()}`);
    }
  }
  return sections.join("\n\n");
}

async function artifactPath(overview, id, type) {
  const found = findOverviewItem(overview, id);
  if (!found) return null;

  const trial = found.kind === "trial" ? found.item : null;
  const task = taskForOverviewItem(overview, found);

  if (type === "instruction" && task) return path.join(ROOT_DIR, task.instructionPath);
  if (!trial) return null;

  const trialDir = path.join(ROOT_DIR, trial.trialPath);
  const paths = {
    patch: path.join(trialDir, "verifier", "submission.patch"),
    stdout: path.join(trialDir, "verifier", "test-stdout.txt"),
    trajectory: path.join(trialDir, "agent", "trajectory.json"),
    result: path.join(trialDir, "result.json"),
    verifier: path.join(trialDir, "verifier", "frontiercode_result.json"),
    log: path.join(trialDir, "trial.log")
  };
  if (type === "patch" && !(await exists(paths.patch))) {
    return path.join(trialDir, "artifacts", "submission.patch");
  }
  return paths[type] || null;
}

async function readPatchForTrial(overview, trial) {
  const filePath = await artifactPath(overview, trial.id, "patch");
  if (!filePath || !(await exists(filePath))) return "";
  return fs.readFile(filePath, "utf8");
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendText(res, text, status = 200, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store"
  });
  res.end(text);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const fullPath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    sendText(res, "Forbidden", 403);
    return;
  }
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) throw new Error("not a file");
    const type = TEXT_TYPES.get(path.extname(fullPath)) || "application/octet-stream";
    sendText(res, await fs.readFile(fullPath), 200, type);
  } catch {
    sendText(res, "Not found", 404);
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/overview") {
      sendJson(res, await scanOverview());
      return;
    }

    if (url.pathname === "/api/artifact") {
      const id = url.searchParams.get("id") || "";
      const type = url.searchParams.get("type") || "";
      const overview = await scanOverview();
      if (type === "tests") {
        const text = await readTaskTestsArtifact(overview, id);
        if (!text.trim()) {
          sendText(res, "", 404);
          return;
        }
        sendText(res, text);
        return;
      }
      const filePath = await artifactPath(overview, id, type);
      if (!filePath || !(await exists(filePath))) {
        sendText(res, "", 404);
        return;
      }
      const ext = path.extname(filePath);
      const contentType = type === "trajectory" || ext === ".json"
        ? "application/json; charset=utf-8"
        : "text/plain; charset=utf-8";
      sendText(res, await fs.readFile(filePath), 200, contentType);
      return;
    }

    if (url.pathname === "/api/compare") {
      const baseId = url.searchParams.get("base") || "";
      const headId = url.searchParams.get("head") || "";
      const overview = await scanOverview();
      const base = overview.trials.find((trial) => trial.id === baseId);
      const head = overview.trials.find((trial) => trial.id === headId);

      if (!base || !head) {
        sendJson(res, { error: "Run not found." }, 404);
        return;
      }
      if (base.id === head.id) {
        sendJson(res, { error: "Select two different runs." }, 400);
        return;
      }
      if (base.taskId && head.taskId && base.taskId !== head.taskId) {
        sendJson(res, { error: "Runs must belong to the same task." }, 400);
        return;
      }

      const basePatch = await readPatchForTrial(overview, base);
      const headPatch = await readPatchForTrial(overview, head);
      const diff = await generatePatchDiff(basePatch, headPatch);
      sendJson(res, {
        diff,
        identical: basePatch === headPatch,
        missingPatch: {
          base: basePatch.length === 0,
          head: headPatch.length === 0
        },
        basePatchStats: patchStats(basePatch),
        headPatchStats: patchStats(headPatch),
        diffStats: patchDiffStats(diff)
      });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`FrontierCode local platform running at http://${HOST}:${PORT}`);
});

const state = {
  overview: null,
  selectedTrialId: "",
  selectedTaskId: "",
  activeTab: "runs",
  filter: "all",
  query: "",
  trajectoryStepId: null,
  compareBaseId: "",
  compareHeadId: "",
  expandedRunIds: new Set(),
  pendingFocus: null
};

const artifactCache = new Map();

const $ = (selector) => document.querySelector(selector);

function focusListItem(itemSelector, dataKey, dataValue) {
  const item = Array.from(document.querySelectorAll(itemSelector))
    .find((candidate) => candidate.dataset[dataKey] === String(dataValue));
  if (!item) return false;
  item.focus({ preventScroll: true });
  item.scrollIntoView({ block: "nearest" });
  return true;
}

function queueListFocus(itemSelector, dataKey, dataValue) {
  state.pendingFocus = { itemSelector, dataKey, dataValue: String(dataValue) };
}

function applyPendingFocus() {
  if (!state.pendingFocus) return;
  setTimeout(() => {
    if (!state.pendingFocus) return;
    const focused = focusListItem(
      state.pendingFocus.itemSelector,
      state.pendingFocus.dataKey,
      state.pendingFocus.dataValue
    );
    if (focused) state.pendingFocus = null;
  }, 0);
}

function bindArrowNavigation(containerSelector, itemSelector, onSelect) {
  const container = $(containerSelector);
  if (!container) return;
  const items = Array.from(container.querySelectorAll(itemSelector));
  if (items.length < 2) return;

  items.forEach((item) => {
    item.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const currentIndex = items.indexOf(event.currentTarget);
      const nextIndex = Math.max(
        0,
        Math.min(items.length - 1, currentIndex + (event.key === "ArrowDown" ? 1 : -1))
      );
      const nextItem = items[nextIndex];
      if (!nextItem || nextItem === event.currentTarget) return;
      onSelect(nextItem);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat().format(value);
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `$${Number(value).toFixed(3)}`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "n/a";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "n/a";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getSelectedTrial() {
  return state.overview?.trials.find((trial) => trial.id === state.selectedTrialId) || null;
}

function getSelectedTask() {
  if (state.selectedTaskId) {
    return state.overview?.tasks.find((task) => task.id === state.selectedTaskId) || null;
  }
  const trial = getSelectedTrial();
  return state.overview?.tasks.find((task) => task.id === trial?.taskId) || null;
}

function getTaskTrials(task) {
  return (task?.trialIds || [])
    .map((id) => state.overview.trials.find((trial) => trial.id === id))
    .filter(Boolean);
}

function getTrajectoryTrials(task) {
  return getTaskTrials(task).filter((trial) => trial.artifacts?.trajectory);
}

function ensureTrajectorySelection(task) {
  const trajectoryTrials = getTrajectoryTrials(task);
  const selected = trajectoryTrials.find((trial) => trial.id === state.selectedTrialId);
  if (selected) return { trial: selected, trials: trajectoryTrials };

  const fallback = trajectoryTrials[0] || null;
  if (fallback) state.selectedTrialId = fallback.id;
  return { trial: fallback, trials: trajectoryTrials };
}

function runOptionLabel(trial) {
  return [
    trial.pass ? "PASS" : "FAIL",
    formatPercent(trial.score),
    trial.model || trial.agent || "run",
    formatDate(trial.startedAt),
    trial.trialName
  ].filter(Boolean).join(" / ");
}

function defaultCompareSelection(trials) {
  const selected = trials.find((trial) => trial.id === state.selectedTrialId);
  const failed = selected && !selected.pass ? selected : trials.find((trial) => !trial.pass);
  const passing = trials.find((trial) => trial.pass && trial.id !== failed?.id);
  if (failed && passing) return { baseId: passing.id, headId: failed.id };

  if (selected) {
    const other = trials.find((trial) => trial.id !== selected.id);
    if (other) return { baseId: other.id, headId: selected.id };
  }

  return {
    baseId: trials[1]?.id || trials[0]?.id || "",
    headId: trials[0]?.id || trials[1]?.id || ""
  };
}

function ensureCompareSelection(task) {
  const trials = getTaskTrials(task);
  if (trials.length < 2) {
    state.compareBaseId = "";
    state.compareHeadId = "";
    return;
  }

  const ids = new Set(trials.map((trial) => trial.id));
  if (!ids.has(state.compareBaseId) || !ids.has(state.compareHeadId) || state.compareBaseId === state.compareHeadId) {
    const defaults = defaultCompareSelection(trials);
    state.compareBaseId = defaults.baseId;
    state.compareHeadId = defaults.headId;
  }
}

function getCompareTrials(task) {
  ensureCompareSelection(task);
  const trials = getTaskTrials(task);
  return {
    trials,
    base: trials.find((trial) => trial.id === state.compareBaseId) || null,
    head: trials.find((trial) => trial.id === state.compareHeadId) || null
  };
}

function trialSearchText(trial) {
  return [
    trial.trialName,
    trial.model,
    trial.agent,
    trial.reasoningEffort,
    ...(trial.criteria || []).map((criterion) => `${criterion.criterion_id} ${criterion.details}`)
  ].join(" ").toLowerCase();
}

function taskMatchesFilter(task, trials) {
  if (state.filter === "pass") return trials.some((trial) => trial.pass);
  if (state.filter === "fail") return trials.some((trial) => !trial.pass);
  if (state.filter === "unrun") return trials.length === 0;
  return true;
}

function filteredTasks() {
  const query = state.query.trim().toLowerCase();
  return state.overview.tasks.filter((task) => {
    const trials = task.trialIds
      .map((id) => state.overview.trials.find((trial) => trial.id === id))
      .filter(Boolean);
    if (!taskMatchesFilter(task, trials)) return false;
    if (!query) return true;
    const taskText = [task.title, task.name, task.description, task.key, task.dockerImage].join(" ").toLowerCase();
    return taskText.includes(query) || trials.some((trial) => trialSearchText(trial).includes(query));
  });
}

function selectTask(taskId, { focus = false } = {}) {
  const task = state.overview.tasks.find((item) => item.id === taskId);
  state.selectedTaskId = taskId;
  state.selectedTrialId = task?.trialIds[0] || "";
  if (!state.selectedTrialId && state.activeTab !== "instruction") state.activeTab = "instruction";
  state.expandedRunIds = new Set();
  state.trajectoryStepId = null;
  state.compareBaseId = "";
  state.compareHeadId = "";
  if (focus) queueListFocus(".task-item", "taskId", taskId);
  render();
}

function renderSummary() {
  const { summary } = state.overview;
  const cells = [
    ["Tasks", summary.tasks],
    ["With Runs", summary.tasksWithRuns],
    ["Trials", summary.trials],
    ["Pass Rate", formatPercent(summary.passRate)],
    ["Criteria", `${summary.criteriaPassed}/${summary.criteriaTotal}`],
    ["Failed", summary.failedTrials]
  ];
  $("#summaryStrip").innerHTML = cells.map(([label, value]) => `
    <div class="summary-cell">
      <p class="micro">${escapeHtml(label)}</p>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function renderTaskList() {
  const tasks = filteredTasks();
  $("#taskList").innerHTML = tasks.map((task) => {
    const trials = getTaskTrials(task);
    const isActive = task.id === state.selectedTaskId || trials.some((trial) => trial.id === state.selectedTrialId);
    const statusClass = task.runCount === 0 ? "neutral" : task.failCount > 0 ? "fail" : "pass";
    const statusText = task.runCount === 0 ? "No Runs" : `${task.passCount}/${task.runCount} Pass`;
    return `
      <button class="task-item ${isActive ? "active" : ""}" type="button" data-task-id="${task.id}">
        <div class="task-title-row">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <span class="badge ${statusClass}">${escapeHtml(statusText)}</span>
        </div>
        <p class="task-description">${escapeHtml(task.description || task.key)}</p>
      </button>
    `;
  }).join("") || `<div class="empty-state">No matching tasks.</div>`;

  document.querySelectorAll(".task-item").forEach((button) => {
    button.addEventListener("click", () => selectTask(button.dataset.taskId, { focus: true }));
  });
  bindArrowNavigation("#taskList", ".task-item", (button) => {
    selectTask(button.dataset.taskId, { focus: true });
  });
  applyPendingFocus();
}

function renderDetailHeader() {
  const task = getSelectedTask();
  const trial = getSelectedTrial();
  if (!task) {
    $("#detailHeader").innerHTML = `<div><p class="eyebrow">FrontierCode Local</p><h2>No local tasks found</h2></div>`;
    $("#metricGrid").innerHTML = "";
    return;
  }
  const status = trial
    ? `<span class="status-chip ${trial.pass ? "pass" : "fail"}">${trial.pass ? "PASS" : "FAIL"}</span>`
    : `<span class="status-chip neutral">TASK</span>`;

  $("#detailHeader").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(task.name)}</p>
      <h2>${escapeHtml(task.title)}</h2>
      <div class="detail-meta">
        ${status}
        <span class="status-chip neutral">${escapeHtml(trial?.model || task.dockerImage || "instruction.md")}</span>
        ${trial?.reasoningEffort ? `<span class="status-chip neutral">reasoning ${escapeHtml(trial.reasoningEffort)}</span>` : ""}
        ${task.dockerImage ? `<span class="status-chip neutral">${escapeHtml(task.dockerImage)}</span>` : ""}
      </div>
      <p class="path-line">${escapeHtml(trial?.trialPath || task.taskRootPath)}</p>
    </div>
  `;
}

function renderMetrics() {
  const task = getSelectedTask();
  const trial = getSelectedTrial();
  const metrics = trial ? [
    ["Criteria", `${trial.criteriaPassed}/${trial.criteriaTotal}`],
    ["Blockers", trial.blockerFailures],
    ["Patch Files", trial.patchStats?.files ?? "n/a"],
    ["Diff", `+${trial.patchStats?.additions ?? 0} / -${trial.patchStats?.deletions ?? 0}`],
    ["Steps", trial.trajectory?.steps ?? "n/a"],
    ["Cost", formatMoney(trial.costUsd)],
    ["Duration", formatDuration(trial.durationSeconds)],
    ["Started", formatDate(trial.startedAt)],
    ["Input Tokens", formatNumber(trial.tokens?.input)],
    ["Output Tokens", formatNumber(trial.tokens?.output)],
    ["Cached", formatNumber(trial.tokens?.cached)],
    ["Reward", formatPercent(trial.reward)]
  ] : [
    ["Runs", task?.runCount ?? 0],
    ["Best Score", formatPercent(task?.bestScore)],
    ["Passes", task?.passCount ?? 0],
    ["Failures", task?.failCount ?? 0],
    ["Docker", task?.dockerImage || "n/a"],
    ["Network", task?.networkMode || "n/a"]
  ];

  $("#metricGrid").innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <p class="meta-label">${escapeHtml(label)}</p>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function availableTabs() {
  const task = getSelectedTask();
  const trials = getTaskTrials(task);
  const tabs = [{ id: "instruction", label: "Instruction" }];
  if (trials.length) tabs.push({ id: "runs", label: "Runs" });
  if (getTrajectoryTrials(task).length) tabs.push({ id: "trajectory", label: "Trajectory" });
  if (trials.length > 1) tabs.push({ id: "compare", label: "Compare" });
  if (!tabs.some((tab) => tab.id === state.activeTab)) state.activeTab = tabs[0].id;
  return tabs;
}

function renderTabs() {
  const tabs = availableTabs();
  $("#tabs").innerHTML = tabs.map((tab) => `
    <button type="button" class="${tab.id === state.activeTab ? "active" : ""}" data-tab="${tab.id}">
      ${escapeHtml(tab.label)}
    </button>
  `).join("");
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      state.trajectoryStepId = null;
      renderTabPanel();
      renderTabs();
    });
  });
}

async function fetchArtifact(id, type) {
  const key = `${id}:${type}`;
  if (artifactCache.has(key)) return artifactCache.get(key);
  const response = await fetch(`/api/artifact?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`);
  if (!response.ok) {
    artifactCache.set(key, "");
    return "";
  }
  const text = await response.text();
  artifactCache.set(key, text);
  return text;
}

async function fetchComparison(baseId, headId) {
  const response = await fetch(`/api/compare?base=${encodeURIComponent(baseId)}&head=${encodeURIComponent(headId)}`);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let data = {};
  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(text || "{}");
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    if (response.status === 404 && !contentType.includes("application/json")) {
      return { error: "Compare endpoint is not available in the running server. Restart the FrontierCode local platform so server.mjs reloads." };
    }
    return { error: data.error || text.trim() || "Unable to compare runs." };
  }
  return data;
}

function markdownLite(text) {
  const lines = String(text || "").split(/\r?\n/);
  let html = "";
  let inCode = false;
  let code = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre>${escapeHtml(code.join("\n"))}</pre>`;
        code = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html += `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(bullet[1])}</li>`;
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    closeList();
    html += `<p>${escapeHtml(line)}</p>`;
  }
  closeList();
  if (inCode) html += `<pre>${escapeHtml(code.join("\n"))}</pre>`;
  return html;
}

function renderDiff(text) {
  if (!text.trim()) return `<div class="empty-state">No submitted patch found.</div>`;
  return `<pre class="code-lines">${text.split(/\r?\n/).map((line) => {
    let cls = "";
    if (line.startsWith("diff --git") || line.startsWith("--- ") || line.startsWith("+++ ")) cls = "file";
    else if (line.startsWith("@@")) cls = "hunk";
    else if (line.startsWith("+")) cls = "add";
    else if (line.startsWith("-")) cls = "del";
    return `<span class="diff-line ${cls}">${escapeHtml(line || " ")}</span>`;
  }).join("")}</pre>`;
}

function renderJson(text) {
  if (!text.trim()) return `<div class="empty-state">No JSON artifact found.</div>`;
  try {
    return `<pre class="stdout">${escapeHtml(JSON.stringify(JSON.parse(text), null, 2))}</pre>`;
  } catch {
    return `<pre class="stdout">${escapeHtml(text)}</pre>`;
  }
}

function renderTests() {
  const trial = getSelectedTrial();
  if (!trial) return `<div class="empty-state">No verifier run selected.</div>`;
  const rows = (trial.criteria || []).map((criterion) => `
    <div class="criterion-row">
      <span class="badge ${criterion.passed ? "pass" : "fail"}">${criterion.passed ? "PASS" : "FAIL"}</span>
      <div>
        <div class="criterion-id">${escapeHtml(criterion.criterion_id)}</div>
        <p class="micro">${escapeHtml(criterion.category || "")}${criterion.blocker ? " / BLOCKER" : " / NONBLOCKER"}</p>
      </div>
      <div class="criterion-id">${escapeHtml(criterion.method || "n/a")}</div>
      <div class="criterion-id">${escapeHtml(formatPercent(criterion.weight ?? null))}</div>
      <p class="criterion-details">${escapeHtml(criterion.details || "")}</p>
    </div>
  `).join("");
  return `
    <div class="tests-pane">
      <div class="criterion-row header">
        <span>Status</span><span>Criterion</span><span>Method</span><span>Weight</span><span>Details</span>
      </div>
      ${rows || `<div class="empty-state">No criteria recorded.</div>`}
    </div>
  `;
}

function renderCriteriaCards(criteria, emptyMessage) {
  const rows = (criteria || []).map((criterion) => {
    const hasResult = criterion.passed === true || criterion.passed === false;
    const statusClass = hasResult ? (criterion.passed ? "pass" : "fail") : "neutral";
    const rowClass = hasResult ? (criterion.passed ? "passed" : "failed") : "pending";
    const statusText = hasResult ? (criterion.passed ? "PASS" : "FAIL") : "TEST";
    return `
      <div class="run-criterion ${rowClass}">
        <span class="badge ${statusClass}">${statusText}</span>
        <div>
          <div class="criterion-id">${escapeHtml(criterion.criterion_id || criterion.id || "")}</div>
          <p class="criterion-details">${escapeHtml(criterion.details || criterion.description || "")}</p>
          ${criterion.command ? `<p class="criterion-command">${escapeHtml(criterion.command)}</p>` : ""}
          <p class="micro">${escapeHtml(criterion.category || "criterion")}${criterion.blocker ? " / BLOCKER" : ""} / ${escapeHtml(criterion.method || "n/a")} / ${escapeHtml(formatPercent(criterion.weight ?? null))}</p>
        </div>
      </div>
    `;
  }).join("");
  return rows || `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
}

function renderRunCriteria(trial) {
  return renderCriteriaCards(trial.criteria || [], "No criteria recorded for this run.");
}

function instructionCriteria(task, selectedTrial) {
  const trial = selectedTrial?.taskId === task.id ? selectedTrial : null;
  const trialCriteria = trial?.criteria || [];
  if (!task.criteria?.length) return trialCriteria;

  const trialById = new Map(trialCriteria.map((criterion) => [criterion.criterion_id, criterion]));
  return task.criteria.map((criterion) => {
    const result = trialById.get(criterion.criterion_id);
    if (!result) return criterion;
    return {
      ...criterion,
      passed: result.passed,
      category: result.category || criterion.category,
      method: result.method || criterion.method,
      blocker: result.blocker ?? criterion.blocker,
      weight: result.weight ?? criterion.weight,
      details: result.details || criterion.details
    };
  });
}

function renderInstructionCriteria(task, selectedTrial) {
  return renderCriteriaCards(instructionCriteria(task, selectedTrial), "No verifier criteria found for this task.");
}

function instructionCriteriaLabel(task, selectedTrial) {
  const trial = selectedTrial?.taskId === task.id ? selectedTrial : null;
  if (trial?.criteriaTotal) return `${trial.criteriaPassed}/${trial.criteriaTotal} passed`;
  const count = task.criteria?.length || 0;
  return count ? `${count} criteria` : "No criteria";
}

function renderRunSummary(trial) {
  const status = trial.pass ? "PASS" : "FAIL";
  return `
    <div class="run-summary">
      <span class="badge ${trial.pass ? "pass" : "fail"}">${status} ${escapeHtml(formatPercent(trial.score))}</span>
      <span>${escapeHtml(trial.model || trial.agent || "run")}</span>
      <span>${escapeHtml(formatDate(trial.startedAt))}</span>
      <span>${escapeHtml(`${trial.criteriaPassed}/${trial.criteriaTotal} criteria`)}</span>
      <span>${escapeHtml(trial.trialName)}</span>
    </div>
  `;
}

function selectRun(runId, { toggleExpanded = false, focus = false } = {}) {
  if (toggleExpanded) {
    if (state.expandedRunIds.has(runId)) {
      state.expandedRunIds.delete(runId);
    } else {
      state.expandedRunIds.add(runId);
    }
  }
  state.selectedTrialId = runId;
  if (focus) queueListFocus("[data-run-id]", "runId", runId);
  render();
}

async function renderRunsPanel() {
  const task = getSelectedTask();
  const trials = getTaskTrials(task);
  if (!trials.length) return `<div class="empty-state">No runs recorded for this task yet.</div>`;

  const expandedTrials = trials.filter((trial) => state.expandedRunIds.has(trial.id));
  const patchEntries = await Promise.all(expandedTrials.map(async (trial) => [
    trial.id,
    await fetchArtifact(trial.id, "patch")
  ]));
  const patches = new Map(patchEntries);

  return `
    <div class="runs-panel">
      ${trials.map((trial) => {
        const expanded = state.expandedRunIds.has(trial.id);
        const selected = trial.id === state.selectedTrialId;
        const patch = patches.get(trial.id) || "";
        return `
          <section class="run-card ${expanded ? "expanded" : ""} ${selected ? "active" : ""}">
            <button type="button" class="run-card-toggle ${selected ? "active" : ""}" data-run-id="${trial.id}" aria-expanded="${expanded}">
              <span class="run-caret" aria-hidden="true">${expanded ? "−" : "+"}</span>
              ${renderRunSummary(trial)}
            </button>
            ${expanded ? `
              <div class="run-card-body">
                <div class="run-artifact patch-side">
                  <div class="run-artifact-header">
                    <p class="meta-label">Submitted Patch</p>
                    <span class="micro">${escapeHtml(trial.patchStats?.files ?? 0)} files / +${escapeHtml(trial.patchStats?.additions ?? 0)} / -${escapeHtml(trial.patchStats?.deletions ?? 0)}</span>
                  </div>
                  <div class="run-patch-scroll">${renderDiff(patch)}</div>
                </div>
                <div class="run-artifact tests-side">
                  <div class="run-artifact-header">
                    <p class="meta-label">Verifier Criteria</p>
                    <span class="micro">${escapeHtml(trial.criteriaPassed)}/${escapeHtml(trial.criteriaTotal)} passed</span>
                  </div>
                  <div class="run-tests-scroll">${renderRunCriteria(trial)}</div>
                </div>
              </div>
            ` : ""}
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderCompareOptions(trials, selectedId) {
  return trials.map((trial) => `
    <option value="${escapeHtml(trial.id)}" ${trial.id === selectedId ? "selected" : ""}>
      ${escapeHtml(runOptionLabel(trial))}
    </option>
  `).join("");
}

function renderCompareFailures(trial) {
  const failures = (trial.criteria || []).filter((criterion) => !criterion.passed);
  if (!failures.length) return `<div class="compare-empty">No failed criteria.</div>`;
  return failures.map((criterion) => `
    <div class="compare-failure">
      <div class="criterion-id">${escapeHtml(criterion.criterion_id)}</div>
      <p class="criterion-details">${escapeHtml(criterion.details || "")}</p>
    </div>
  `).join("");
}

function renderCompareRunSummary(trial, label) {
  const patchStats = trial.patchStats || {};
  return `
    <section class="compare-run-summary ${trial.pass ? "passed" : "failed"}">
      <div class="compare-run-heading">
        <p class="meta-label">${escapeHtml(label)}</p>
        <span class="badge ${trial.pass ? "pass" : "fail"}">${trial.pass ? "PASS" : "FAIL"} ${escapeHtml(formatPercent(trial.score))}</span>
      </div>
      <h3>${escapeHtml(trial.trialName)}</h3>
      <div class="compare-run-meta">
        <span>${escapeHtml(trial.model || trial.agent || "run")}</span>
        <span>${escapeHtml(formatDate(trial.startedAt))}</span>
        <span>${escapeHtml(`${trial.criteriaPassed}/${trial.criteriaTotal} criteria`)}</span>
        <span>${escapeHtml(`${patchStats.files ?? 0} files / +${patchStats.additions ?? 0} / -${patchStats.deletions ?? 0}`)}</span>
      </div>
      <div class="compare-failure-list">
        ${renderCompareFailures(trial)}
      </div>
    </section>
  `;
}

function renderCompareDiff(comparison) {
  if (comparison.error) return `<div class="empty-state">${escapeHtml(comparison.error)}</div>`;
  if (comparison.missingPatch?.base && comparison.missingPatch?.head) {
    return `<div class="empty-state">No submitted patches found for these runs.</div>`;
  }
  if (comparison.identical) return `<div class="empty-state">No patch differences between these runs.</div>`;
  return renderDiff(comparison.diff || "");
}

async function renderComparePanel() {
  const task = getSelectedTask();
  const { trials, base, head } = getCompareTrials(task);
  if (trials.length < 2) return `<div class="empty-state">Compare needs at least two runs for this task.</div>`;
  if (!base || !head) return `<div class="empty-state">Select two runs to compare.</div>`;

  const comparison = await fetchComparison(base.id, head.id);
  const stats = comparison.diffStats || {};
  const statLine = comparison.error
    ? "compare unavailable"
    : `${stats.hunks ?? 0} hunks / +${stats.additions ?? 0} / -${stats.deletions ?? 0}`;

  return `
    <div class="compare-panel">
      <div class="compare-controls">
        <label class="compare-select-field">
          <span class="meta-label">Baseline</span>
          <select data-compare-select="base">${renderCompareOptions(trials, base.id)}</select>
        </label>
        <button class="compare-swap" type="button" data-compare-swap>Swap</button>
        <label class="compare-select-field">
          <span class="meta-label">Candidate</span>
          <select data-compare-select="head">${renderCompareOptions(trials, head.id)}</select>
        </label>
      </div>
      <div class="compare-summary-grid">
        ${renderCompareRunSummary(base, "Baseline")}
        ${renderCompareRunSummary(head, "Candidate")}
      </div>
      <section class="compare-diff">
        <div class="run-artifact-header">
          <p class="meta-label">Patch Diff</p>
          <span class="micro">${escapeHtml(statLine)}</span>
        </div>
        <div class="compare-diff-scroll">
          ${renderCompareDiff(comparison)}
        </div>
      </section>
    </div>
  `;
}

function bindCompareControls() {
  document.querySelectorAll("[data-compare-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const role = select.dataset.compareSelect;
      if (role === "base") state.compareBaseId = select.value;
      if (role === "head") state.compareHeadId = select.value;

      if (state.compareBaseId === state.compareHeadId) {
        const task = getSelectedTask();
        const replacement = getTaskTrials(task).find((trial) => trial.id !== select.value);
        if (replacement && role === "base") state.compareHeadId = replacement.id;
        if (replacement && role === "head") state.compareBaseId = replacement.id;
      }

      state.selectedTrialId = state.compareHeadId;
      render();
    });
  });

  const swap = document.querySelector("[data-compare-swap]");
  if (swap) {
    swap.addEventListener("click", () => {
      const previousBase = state.compareBaseId;
      state.compareBaseId = state.compareHeadId;
      state.compareHeadId = previousBase;
      state.selectedTrialId = state.compareHeadId;
      render();
    });
  }
}

function sourceClass(source) {
  if (source === "agent") return "source-agent";
  if (source === "user") return "source-user";
  if (source === "system") return "source-system";
  return "";
}

function stepSnippet(message) {
  return String(message || "").replace(/\s+/g, " ").slice(0, 150);
}

function renderTrajectory(text) {
  if (!text.trim()) return `<div class="empty-state">No trajectory artifact found.</div>`;
  let trajectory;
  try {
    trajectory = JSON.parse(text);
  } catch {
    return `<pre class="stdout">${escapeHtml(text)}</pre>`;
  }
  const steps = Array.isArray(trajectory.steps) ? trajectory.steps : [];
  if (!steps.length) return `<div class="empty-state">No trajectory steps recorded.</div>`;
  const selected = steps.find((step) => step.step_id === state.trajectoryStepId) || steps.find((step) => step.source !== "system") || steps[0];
  state.trajectoryStepId = selected.step_id;
  const list = steps.map((step) => `
    <button type="button" class="step-button ${step.step_id === selected.step_id ? "active" : ""}" data-step-id="${step.step_id}">
      <div class="step-topline">
        <span class="${sourceClass(step.source)}">#${escapeHtml(step.step_id)} ${escapeHtml(step.source || "unknown")}</span>
        <span>${escapeHtml(formatDate(step.timestamp))}</span>
      </div>
      <p class="step-snippet">${escapeHtml(stepSnippet(step.message))}</p>
    </button>
  `).join("");
  const detail = `
    <div class="trajectory-detail-header">
      <p class="eyebrow">${escapeHtml(selected.source || "unknown")} / step ${escapeHtml(selected.step_id)}</p>
      <h3>${escapeHtml(formatDate(selected.timestamp))}</h3>
      <div class="detail-meta">
        ${selected.kind ? `<span class="status-chip neutral">${escapeHtml(selected.kind)}</span>` : ""}
        ${selected.role ? `<span class="status-chip neutral">${escapeHtml(selected.role)}</span>` : ""}
      </div>
    </div>
    <pre>${escapeHtml(selected.message || "")}</pre>
  `;
  return `
    <div class="trajectory-layout">
      <div class="trajectory-list">${list}</div>
      <div class="trajectory-detail">${detail}</div>
    </div>
  `;
}

function selectTrajectoryStep(stepId, { focus = false } = {}) {
  state.trajectoryStepId = Number(stepId);
  if (focus) queueListFocus("[data-step-id]", "stepId", stepId);
  renderTabPanel();
}

function bindTrajectoryStepControls() {
  document.querySelectorAll("[data-step-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectTrajectoryStep(button.dataset.stepId, { focus: true });
    });
  });
  bindArrowNavigation(".trajectory-list", "[data-step-id]", (button) => {
    selectTrajectoryStep(button.dataset.stepId, { focus: true });
  });
}

function renderTrajectoryOptions(trials, selectedId) {
  return trials.map((trial) => `
    <option value="${escapeHtml(trial.id)}" ${trial.id === selectedId ? "selected" : ""}>
      ${escapeHtml(runOptionLabel(trial))}
    </option>
  `).join("");
}

function bindTrajectoryControls() {
  const select = document.querySelector("[data-trajectory-select]");
  if (!select) return;
  select.addEventListener("change", () => {
    state.selectedTrialId = select.value;
    state.trajectoryStepId = null;
    render();
  });
}

async function renderTabPanel() {
  const panel = $("#tabPanel");
  const task = getSelectedTask();
  if (!task) {
    panel.innerHTML = `<div class="empty-state">No task data available.</div>`;
    return;
  }

  if (state.activeTab === "runs") {
    panel.innerHTML = `<div class="loading">Loading runs...</div>`;
    panel.innerHTML = await renderRunsPanel();
    document.querySelectorAll("[data-run-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectRun(button.dataset.runId, { toggleExpanded: true, focus: true });
      });
    });
    bindArrowNavigation(".runs-panel", "[data-run-id]", (button) => {
      selectRun(button.dataset.runId, { focus: true });
    });
    applyPendingFocus();
    return;
  }

  if (state.activeTab === "compare") {
    panel.innerHTML = `<div class="loading">Generating run diff...</div>`;
    panel.innerHTML = await renderComparePanel();
    bindCompareControls();
    return;
  }

  if (state.activeTab === "trajectory") {
    const previousTrialId = state.selectedTrialId;
    const { trial, trials } = ensureTrajectorySelection(task);
    if (!trial) {
      panel.innerHTML = `<div class="empty-state">No trajectory artifact found for this task.</div>`;
      return;
    }
    if (state.selectedTrialId !== previousTrialId) {
      renderTaskList();
      renderDetailHeader();
      renderMetrics();
    }

    panel.innerHTML = `<div class="loading">Loading trajectory...</div>`;
    const text = await fetchArtifact(trial.id, "trajectory");
    const toolbar = `
      <div class="artifact-toolbar">
        <p class="artifact-title">${escapeHtml(`${trial.trialPath}/agent/trajectory.json`)}</p>
        ${trials.length > 1 ? `
          <select data-trajectory-select aria-label="Trajectory run">
            ${renderTrajectoryOptions(trials, trial.id)}
          </select>
        ` : ""}
      </div>
    `;
    panel.innerHTML = `${toolbar}${renderTrajectory(text)}`;
    bindTrajectoryControls();
    bindTrajectoryStepControls();
    applyPendingFocus();
    return;
  }

  if (state.activeTab === "instruction") {
    const id = task.id;
    const trial = getSelectedTrial();
    panel.innerHTML = `<div class="loading">Loading instruction...</div>`;
    const instructionText = await fetchArtifact(id, "instruction");
    const criteriaLabel = instructionCriteriaLabel(task, trial);
    panel.innerHTML = `
      <div class="artifact-toolbar">
        <p class="artifact-title">${escapeHtml(task.instructionPath)}</p>
        <p class="artifact-title">${escapeHtml(`${task.taskRootPath}/tests/grader/frontiercode.yaml`)}</p>
      </div>
      <div class="instruction-tests-layout">
        <section class="instruction-column">
          <div class="split-pane-header">
            <p class="meta-label">Instruction</p>
          </div>
          <div class="markdown-pane">${markdownLite(instructionText)}</div>
        </section>
        <section class="task-tests-column">
          <div class="split-pane-header">
            <p class="meta-label">Verifier Criteria</p>
            <span class="micro">${escapeHtml(criteriaLabel)}</span>
          </div>
          <div class="task-tests-pane">${renderInstructionCriteria(task, trial)}</div>
        </section>
      </div>
    `;
    return;
  }

  panel.innerHTML = `<div class="empty-state">Unknown tab.</div>`;
}

function render() {
  renderSummary();
  renderTaskList();
  renderDetailHeader();
  renderMetrics();
  renderTabs();
  renderTabPanel();
}

async function init() {
  $("#taskList").innerHTML = `<div class="loading">Loading local runs...</div>`;
  const response = await fetch("/api/overview");
  state.overview = await response.json();
  const firstTrial = state.overview.trials[0];
  const firstTask = firstTrial
    ? state.overview.tasks.find((task) => task.id === firstTrial.taskId)
    : state.overview.tasks[0];
  state.selectedTrialId = firstTrial?.id || "";
  state.selectedTaskId = firstTask?.id || "";
  state.activeTab = firstTrial ? "runs" : "instruction";
  state.expandedRunIds = new Set();

  $("#searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTaskList();
  });
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      renderTaskList();
    });
  });

  render();
}

init().catch((error) => {
  document.body.innerHTML = `<pre class="stdout">${escapeHtml(error.stack || error.message)}</pre>`;
});

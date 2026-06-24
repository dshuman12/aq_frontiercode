const $ = (s) => document.querySelector(s);

const setStatus = (msg, cls) => {
  const el = $('#status');
  el.textContent = msg;
  el.className = cls || '';
};

async function ping() {
  try {
    const r = await fetch('/healthz');
    if (r.ok) setStatus('connected', 'ok');
    else setStatus('error ' + r.status, 'err');
  } catch (e) {
    setStatus('offline', 'err');
  }
}

async function loadRuns() {
  const status = $('#filter-status').value;
  const qs = status ? '?status=' + encodeURIComponent(status) : '';
  let data;
  try {
    const r = await fetch('/v1/workflows' + qs);
    if (!r.ok) throw new Error('http ' + r.status);
    data = await r.json();
  } catch (e) {
    setStatus('list failed: ' + e.message, 'err');
    return;
  }
  const tbody = $('#runs-table tbody');
  tbody.innerHTML = '';
  for (const w of (data.workflows || [])) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escape(w.Execution.workflow_id)}</td>
      <td class="run">${escape(w.Execution.run_id)}</td>
      <td>${escape(w.WorkflowType || '')}</td>
      <td>${escape(w.TaskQueue || '')}</td>
      <td class="status-${w.Status}">${w.Status}</td>
      <td>${w.StartTime ? new Date(w.StartTime).toLocaleString() : ''}</td>
    `;
    tbody.appendChild(tr);
  }
  setStatus('connected', 'ok');
}

function escape(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

$('#start-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = {
    workflow_id: fd.get('id'),
    workflow_type: fd.get('type'),
    task_queue: fd.get('queue') || 'default',
  };
  const raw = (fd.get('input') || '').trim();
  if (raw) {
    body.input = { encoding: 'json/plain', data: btoa(raw) };
  }
  try {
    const r = await fetch('/v1/workflows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const out = await r.json();
    $('#start-result').textContent = JSON.stringify(out, null, 2);
    if (r.ok) loadRuns();
  } catch (e) {
    $('#start-result').textContent = 'error: ' + e.message;
  }
});

$('#refresh').addEventListener('click', loadRuns);
$('#filter-status').addEventListener('change', loadRuns);

ping();
loadRuns();
setInterval(loadRuns, 5000);

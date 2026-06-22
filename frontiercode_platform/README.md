# FrontierCode Local Platform

Local website for inspecting FrontierCode-style tasks, submissions, verifier criteria, stdout, and Codex trajectories from this workspace.

## Run

```bash
cd frontiercode_github_upload/frontiercode_platform
npm start
```

The server scans `../` for tasks, `../../runs` for top-level runs, and `../generated_tasks/_eval` for generated-task evals every time the UI requests data.

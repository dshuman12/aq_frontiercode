from pathlib import Path
from tempfile import TemporaryDirectory
import contextlib
import io
import os
import re
import threading
import unittest
import urllib.error
from unittest.mock import patch

from frontiercode_harness.inference import (
    DEFAULT_USER_AGENT,
    DEFAULT_MODEL,
    build_inference_payload,
    extract_inference_content,
    format_http_error,
    inference_headers,
    inference_metadata,
)
from frontiercode_harness.task_qa import (
    InferenceJSONClient,
    QACHECKS,
    TaskQAError,
    main as qa_main,
    render_qa_markdown,
    run_qa,
)


class FakeModelClient:
    def __init__(
        self,
        failing_check_id: str | None = None,
        adversarial_patch: str | None = None,
    ) -> None:
        self.calls: list[tuple[str, str]] = []
        self.failing_check_id = failing_check_id
        self.adversarial_patch = adversarial_patch

    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        self.calls.append((system_prompt, user_prompt))
        if "Adversarial probe id:" in user_prompt:
            if self.adversarial_patch is None:
                return {
                    "status": "no_candidate",
                    "confidence": 0.4,
                    "strategy": "No exploit found.",
                    "why_bad": "",
                    "patch": "",
                }
            return {
                "status": "patch",
                "confidence": 0.77,
                "strategy": "Touch an irrelevant file while the command-only blocker still passes.",
                "why_bad": "The patch does not implement the requested behavior.",
                "patch": self.adversarial_patch,
            }
        match = re.search(r"Check id: ([^\n]+)", user_prompt)
        check_id = match.group(1).strip() if match else "unknown"
        if check_id == self.failing_check_id:
            return {
                "status": "fail",
                "passed": False,
                "confidence": 0.88,
                "summary": f"{check_id} failed",
                "findings": [
                    {
                        "severity": "fail",
                        "path": "instruction.md",
                        "evidence": "missing evidence",
                        "reason": "test fixture requested a failure",
                    }
                ],
                "evidence_paths": ["instruction.md"],
                "recommended_fixes": ["Fix the failing fixture."],
            }
        return {
            "status": "pass",
            "passed": True,
            "confidence": 0.9,
            "summary": f"{check_id} passed",
            "findings": [],
            "evidence_paths": ["instruction.md"],
            "recommended_fixes": [],
        }


class FakeAdversarialClient(FakeModelClient):
    def __init__(self, adversarial_patch: str | None = None) -> None:
        super().__init__(adversarial_patch=adversarial_patch)

    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        if "Adversarial probe id:" not in user_prompt:
            raise AssertionError("FakeAdversarialClient should only receive adversarial prompts")
        return super().complete_json(system_prompt=system_prompt, user_prompt=user_prompt)


class BlockingAdversarialClient(FakeAdversarialClient):
    def __init__(self, attempts: int) -> None:
        super().__init__()
        self._barrier = threading.Barrier(attempts, timeout=1.0)
        self._lock = threading.Lock()
        self._active = 0
        self.max_active = 0

    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        with self._lock:
            self._active += 1
            self.max_active = max(self.max_active, self._active)
        try:
            self._barrier.wait()
            return super().complete_json(system_prompt=system_prompt, user_prompt=user_prompt)
        finally:
            with self._lock:
                self._active -= 1


class RaisingModelClient:
    def __init__(self) -> None:
        self.calls = 0

    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict:
        self.calls += 1
        raise TaskQAError(
            'Inference result did not contain content; finishReason="error"; '
            'provider="openrouter"; content=absent'
        )


class FakeHTTPResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeHTTPResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        import json

        return json.dumps(self.payload).encode("utf-8")


def write_minimal_task(root: Path) -> None:
    (root / "environment" / "repo").mkdir(parents=True)
    (root / "tests" / "grader").mkdir(parents=True)
    (root / "tests" / "hidden").mkdir(parents=True)
    (root / "task.toml").write_text(
        'name = "demo"\ndocker_image = "python:3.12"\n',
        encoding="utf-8",
    )
    (root / "instruction.md").write_text(
        "Update the helper and run `make test`.\n",
        encoding="utf-8",
    )
    (root / "environment" / "repo" / "README.md").write_text(
        "Use `make test` for validation.\n",
        encoding="utf-8",
    )
    (root / "environment" / "repo" / "Makefile").write_text(
        "test:\n\ttrue\n",
        encoding="utf-8",
    )
    (root / "tests" / "test.sh").write_text(
        "#!/usr/bin/env sh\nexit 0\n",
        encoding="utf-8",
    )
    (root / "tests" / "hidden" / "secret_test.py").write_text(
        "assert True  # hidden verifier fixture\n",
        encoding="utf-8",
    )
    (root / "tests" / "grader" / "frontiercode.yaml").write_text(
        """
task_id: demo
repo_workdir: environment/repo
low_quality_threshold: 0.5
criteria:
  - id: behavior
    method: command
    blocker: true
    weight: 1
    command: "true"
calibrations:
  - id: hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
""",
        encoding="utf-8",
    )


class TaskQAReviewTests(unittest.TestCase):
    def test_inference_client_defaults_to_aq_inference(self) -> None:
        client = InferenceJSONClient(api_key="test-key")

        self.assertEqual(client.base_url, "https://api.aqinference.com/v1")
        self.assertEqual(client.model, DEFAULT_MODEL)

    def test_inference_client_reads_api_key_env_var(self) -> None:
        previous = os.environ.get("QA_API_KEY")
        try:
            os.environ["QA_API_KEY"] = "env-test-key"
            client = InferenceJSONClient()
        finally:
            if previous is None:
                os.environ.pop("QA_API_KEY", None)
            else:
                os.environ["QA_API_KEY"] = previous

        self.assertEqual(client.api_key, "env-test-key")

    def test_inference_client_reads_model_and_base_url_env_vars(self) -> None:
        previous_model = os.environ.get("MODEL")
        previous_base_url = os.environ.get("QA_BASE_URL")
        try:
            os.environ["MODEL"] = "provider/custom-model"
            os.environ["QA_BASE_URL"] = "https://example.test/v1"
            client = InferenceJSONClient(api_key="test-key")
        finally:
            if previous_model is None:
                os.environ.pop("MODEL", None)
            else:
                os.environ["MODEL"] = previous_model
            if previous_base_url is None:
                os.environ.pop("QA_BASE_URL", None)
            else:
                os.environ["QA_BASE_URL"] = previous_base_url

        self.assertEqual(client.model, "provider/custom-model")
        self.assertEqual(client.base_url, "https://example.test/v1")

    def test_inference_headers_include_user_agent(self) -> None:
        headers = inference_headers("test-key")

        self.assertEqual(headers["Authorization"], "Bearer test-key")
        self.assertEqual(headers["User-Agent"], DEFAULT_USER_AGENT)

    def test_http_error_formatter_includes_response_body(self) -> None:
        error = urllib.error.HTTPError(
            "https://example.test/v1/responses",
            403,
            "Forbidden",
            {},
            io.BytesIO(b'{"error":"edge blocked python client"}'),
        )

        message = format_http_error(error)

        self.assertIn("HTTP Error 403: Forbidden", message)
        self.assertIn("edge blocked python client", message)

    def test_inference_payload_includes_required_metadata(self) -> None:
        previous = {
            key: os.environ.get(key)
            for key in (
                "FRONTIERCODE_PROJECT",
                "FRONTIERCODE_FEATURE",
                "FRONTIERCODE_USER_ID",
                "FRONTIERCODE_USER_EMAIL",
            )
        }
        try:
            os.environ["FRONTIERCODE_PROJECT"] = "frontier-code"
            os.environ["FRONTIERCODE_FEATURE"] = "task-qa"
            os.environ["FRONTIERCODE_USER_ID"] = "user-123"
            os.environ["FRONTIERCODE_USER_EMAIL"] = "user@example.test"

            payload = build_inference_payload(
                model="gpt-4.1-mini",
                system_prompt="Return JSON.",
                user_prompt="Review this draft",
                feature="unused-default",
            )
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

        self.assertEqual(payload["model"], "gpt-4.1-mini")
        self.assertEqual(payload["instructions"], "Return JSON.")
        self.assertEqual(payload["input"], "Review this draft")
        self.assertEqual(
            payload["metadata"],
            {
                "project": "frontier-code",
                "feature": "task-qa",
                "userId": "user-123",
                "userEmail": "user@example.test",
            },
        )

    def test_inference_payload_can_include_reasoning_effort(self) -> None:
        payload = build_inference_payload(
            model="anthropic/claude-opus-4.8",
            system_prompt="Return JSON.",
            user_prompt="Review this draft",
            feature="task-qa",
            reasoning_effort="high",
        )

        self.assertEqual(payload["reasoning"], {"effort": "high"})

    def test_metadata_omits_blank_optional_identity_fields(self) -> None:
        previous_email = os.environ.get("FRONTIERCODE_USER_EMAIL")
        previous_user_id = os.environ.get("FRONTIERCODE_USER_ID")
        try:
            os.environ["FRONTIERCODE_USER_EMAIL"] = ""
            os.environ["FRONTIERCODE_USER_ID"] = ""

            metadata = inference_metadata("task-qa")
        finally:
            if previous_email is None:
                os.environ.pop("FRONTIERCODE_USER_EMAIL", None)
            else:
                os.environ["FRONTIERCODE_USER_EMAIL"] = previous_email
            if previous_user_id is None:
                os.environ.pop("FRONTIERCODE_USER_ID", None)
            else:
                os.environ["FRONTIERCODE_USER_ID"] = previous_user_id

        self.assertEqual(metadata["project"], "frontier-code")
        self.assertEqual(metadata["feature"], "task-qa")
        self.assertNotIn("userId", metadata)
        self.assertNotIn("userEmail", metadata)

    def test_inference_client_calls_responses_endpoint(self) -> None:
        captured: dict = {}

        def fake_urlopen(request, timeout: int):  # noqa: ANN001 - urllib test double.
            import json

            captured["url"] = request.full_url
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return FakeHTTPResponse(
                {
                    "content": '{"status":"pass","passed":true,"confidence":0.9,"summary":"ok"}',
                    "finishReason": "stop",
                    "model": "gpt-4.1-mini",
                    "provider": "openrouter",
                }
            )

        client = InferenceJSONClient(
            api_key="test-key",
            base_url="https://example.test/v1",
            model="gpt-4.1-mini",
            reasoning_effort="high",
        )

        with patch("urllib.request.urlopen", fake_urlopen):
            result = client.complete_json(system_prompt="Return JSON.", user_prompt="Review this draft")

        self.assertEqual(captured["url"], "https://example.test/v1/responses")
        self.assertEqual(captured["payload"]["model"], "gpt-4.1-mini")
        self.assertEqual(captured["payload"]["reasoning"], {"effort": "high"})
        self.assertEqual(captured["payload"]["input"], "Review this draft")
        self.assertEqual(captured["payload"]["metadata"]["project"], "frontier-code")
        self.assertEqual(captured["payload"]["metadata"]["feature"], "task-qa")
        self.assertTrue(result["passed"])

    def test_extract_inference_content_supports_top_level_content(self) -> None:
        text = extract_inference_content(
            {
                "content": '{"passed":true}',
                "finishReason": "stop",
                "provider": "openrouter",
            }
        )

        self.assertEqual(text, '{"passed":true}')

    def test_extract_inference_content_error_includes_response_diagnostics(self) -> None:
        with self.assertRaises(ValueError) as context:
            extract_inference_content(
                {
                    "id": "run_123",
                    "finishReason": "error",
                    "nativeFinishReason": "model_not_found",
                    "provider": "openrouter",
                    "model": "gpt-4.1-mini",
                }
            )

        message = str(context.exception)
        self.assertIn("finishReason=\"error\"", message)
        self.assertIn("model_not_found", message)
        self.assertIn("content=absent", message)

    def test_runs_readme_qa_checks_and_embedded_false_positive_probe(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient()
            adversarial_client = FakeAdversarialClient()

            report = run_qa(root, client=client, adversarial_client=adversarial_client)

        self.assertTrue(report.passed)
        self.assertEqual(len(report.check_results), 11)
        self.assertEqual(len(client.calls), len(QACHECKS))
        self.assertEqual(len(adversarial_client.calls), 5)
        called_check_ids = [
            re.search(r"Check id: ([^\n]+)", user_prompt).group(1).strip()
            for _, user_prompt in client.calls
            if "Check id:" in user_prompt
        ]
        self.assertEqual(called_check_ids, [check.id for check in QACHECKS])
        adversarial_prompts = [user_prompt for _, user_prompt in adversarial_client.calls]
        self.assertEqual(
            sorted(
                int(re.search(r"Adversarial probe id: adversarial-(\d+)", prompt).group(1))
                for prompt in adversarial_prompts
            ),
            [1, 2, 3, 4, 5],
        )
        self.assertTrue(any("Attempt: 5 of 5" in prompt for prompt in adversarial_prompts))
        self.assertIn("environment/repo", client.calls[0][1])
        self.assertIn("tests/grader/frontiercode.yaml", client.calls[0][1])
        self.assertIn("Existing Deterministic QA Result", client.calls[0][1])

    def test_embedded_false_positive_probe_runs_adversarial_attempts_concurrently(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient()
            adversarial_client = BlockingAdversarialClient(attempts=5)

            report = run_qa(root, client=client, adversarial_client=adversarial_client)

        self.assertTrue(report.passed)
        self.assertEqual(len(adversarial_client.calls), 5)
        self.assertEqual(adversarial_client.max_active, 5)

    def test_progress_stream_logs_each_completed_check(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient()
            progress = io.StringIO()

            run_qa(root, client=client, progress_stream=progress)

        logs = progress.getvalue()
        self.assertIn("[qa] demo: starting 11 checks", logs)
        self.assertIn("[qa] [##----------------------] 1/11 01_prompt_clarity Prompt Clarity: PASS", logs)
        self.assertIn("[qa] [########################] 11/11 11_packaging_e2e End To End Packaging: PASS", logs)
        self.assertIn("[qa] demo: PASS", logs)

    def test_model_client_error_does_not_skip_later_checks(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = RaisingModelClient()
            progress = io.StringIO()

            report = run_qa(root, client=client, progress_stream=progress)

        self.assertFalse(report.passed)
        self.assertEqual(client.calls, len(QACHECKS))
        self.assertEqual(len(report.check_results), len(QACHECKS))
        self.assertTrue(all(item.status == "fail" for item in report.check_results))
        logs = progress.getvalue()
        self.assertIn("01_prompt_clarity Prompt Clarity: FAIL", logs)
        self.assertNotIn("openrouter", logs)
        self.assertIn("02_visible_workflow Visible Workflow Guidance: FAIL", logs)
        self.assertIn("11_packaging_e2e End To End Packaging: FAIL", logs)
        self.assertNotIn("SKIP", logs)

    def test_progress_detail_logs_failure_reason_when_enabled(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = RaisingModelClient()
            progress = io.StringIO()

            run_qa(root, client=client, progress_stream=progress, progress_detail=True)

        self.assertIn("openrouter", progress.getvalue())

    def test_failing_model_check_fails_report_and_renders_findings(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient(failing_check_id="10_hidden_asset_isolation")

            report = run_qa(root, client=client)
            markdown = render_qa_markdown([report])

        self.assertFalse(report.passed)
        self.assertIn("10_hidden_asset_isolation", markdown)
        self.assertIn("Fix the failing fixture.", markdown)

    def test_false_positive_check_runs_adversarial_probe_and_fails_on_passing_bad_patch(self) -> None:
        patch_text = """diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-Use `make test` for validation.
+Use `make test` for validation. This unrelated text change games weak tests.
"""
        with TemporaryDirectory() as tmp:
            root = Path(tmp) / "task"
            output = Path(tmp) / "qa-output"
            root.mkdir()
            write_minimal_task(root)
            client = FakeModelClient(adversarial_patch=patch_text)
            adversarial_client = FakeAdversarialClient(adversarial_patch=patch_text)

            report = run_qa(
                root,
                client=client,
                adversarial_client=adversarial_client,
                false_positive_output_dir=output / "false_positive_adversarial",
            )
            patch_path = output / "false_positive_adversarial" / "demo" / "adversarial-1.patch"
            saved_patch = patch_path.read_text(encoding="utf-8")

        self.assertFalse(report.passed)
        self.assertEqual(len(report.check_results), len(QACHECKS))
        self.assertEqual(len(adversarial_client.calls), 5)
        adversarial_prompt = "\n".join(user_prompt for _, user_prompt in adversarial_client.calls)
        self.assertIn("tests/hidden/secret_test.py", adversarial_prompt)
        self.assertIn("tests/grader/frontiercode.yaml", adversarial_prompt)
        self.assertIn("diff --git paths must be repo-relative", adversarial_prompt)
        false_positive_result = report.check_results[5]
        self.assertEqual(false_positive_result.check_id, "06_false_positive_resistance")
        self.assertEqual(false_positive_result.status, "fail")
        self.assertIn("Adversarial probe:", false_positive_result.summary)
        self.assertIn("passed blockers", false_positive_result.summary)
        self.assertEqual(saved_patch, patch_text)

    def test_false_positive_check_passes_when_adversarial_probe_finds_no_patch(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient()
            adversarial_client = FakeAdversarialClient()

            report = run_qa(root, client=client, adversarial_client=adversarial_client)

        self.assertTrue(report.passed)
        self.assertEqual(len(adversarial_client.calls), 5)
        false_positive_result = report.check_results[5]
        self.assertEqual(false_positive_result.status, "pass")
        self.assertIn("did not find a candidate", false_positive_result.summary)

    def test_cli_default_prints_progress_and_compact_result_only(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient(failing_check_id="10_hidden_asset_isolation")
            stdout = io.StringIO()
            stderr = io.StringIO()
            created_clients = []

            def fake_client_factory(**kwargs):  # noqa: ANN003 - test factory captures kwargs.
                client = FakeAdversarialClient() if kwargs.get("model") == "anthropic/claude-opus-4.8" else FakeModelClient(
                    failing_check_id="10_hidden_asset_isolation"
                )
                client.kwargs = kwargs
                created_clients.append(client)
                return client

            with patch("frontiercode_harness.task_qa.InferenceJSONClient", side_effect=fake_client_factory):
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    exit_code = qa_main(["--path", str(root)])

        self.assertEqual(exit_code, 1)
        progress = stderr.getvalue()
        self.assertIn("[qa] demo: starting 11 checks", progress)
        self.assertIn("[qa] demo: FAIL", progress)
        output = stdout.getvalue()
        self.assertIn("Result: FAIL", output)
        self.assertIn("Tasks: 1", output)
        self.assertNotIn("| Check |", output)
        self.assertNotIn("Findings:", output)
        self.assertNotIn("10_hidden_asset_isolation failed", output)
        self.assertNotIn("10_hidden_asset_isolation", output)
        self.assertNotIn("Fix the failing fixture.", output)
        adversarial_client = next(item for item in created_clients if item.kwargs.get("model") == "anthropic/claude-opus-4.8")
        self.assertEqual(adversarial_client.kwargs["reasoning_effort"], "high")

    def test_cli_verbose_prints_full_markdown_report(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_minimal_task(root)
            client = FakeModelClient(failing_check_id="10_hidden_asset_isolation")
            stdout = io.StringIO()
            stderr = io.StringIO()

            with patch("frontiercode_harness.task_qa.InferenceJSONClient", return_value=client):
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    exit_code = qa_main(["--path", str(root), "--verbose"])

        self.assertEqual(exit_code, 1)
        output = stdout.getvalue()
        self.assertIn("| Check | Status | Confidence | Summary |", output)
        self.assertIn("Findings:", output)
        self.assertIn("Fix the failing fixture.", output)


if __name__ == "__main__":
    unittest.main()

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = join(root, relativePath);
  assert.ok(existsSync(absolutePath), `Expected ${relativePath} to exist`);
  return readFileSync(absolutePath, "utf8");
}

function has(source, pattern, message) {
  const ok =
    pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  assert.ok(ok, message);
}

const chatRoute = read("src/app/api/chat/route.ts");
has(
  chatRoute,
  /export\s+async\s+function\s+POST\s*\(/,
  "chat route must export a POST handler"
);
has(
  chatRoute,
  /process\.env\.OPENROUTER_KEY|process\.env\[['"]OPENROUTER_KEY['"]\]/,
  "OpenRouter key must be read server-side from OPENROUTER_KEY"
);
has(
  chatRoute,
  /createOpenRouter|generateText|openrouter/i,
  "chat route must call the configured AI provider"
);
has(
  chatRoute,
  "validate-user-sentence",
  "chat route must support sentence validation"
);
has(
  chatRoute,
  "validate-user-definition",
  "chat route must preserve definition validation"
);
has(
  chatRoute,
  /status\s*:\s*400/,
  "invalid or missing tasks must return a 400 response"
);
has(
  chatRoute,
  /success\s*:\s*true/,
  "successful AI responses must be wrapped in a success payload"
);

const sentencePractice = read(
  "src/components/dashboard/vocabs/practice/form-a-sentence.tsx"
);
has(
  sentencePractice,
  /export\s+default\s+function\s+VocabsFormaSentencePractice/,
  "form-a-sentence component must export the practice component used by practice.tsx"
);
has(
  sentencePractice,
  /fetch\(\s*["']\/api\/chat["']/,
  "sentence submissions must call the chat API route"
);
has(
  sentencePractice,
  "validate-user-sentence",
  "sentence submissions must identify the sentence-validation task"
);
has(
  sentencePractice,
  /word\s*:\s*currentQuestion\.word\.word/,
  "submission payload must include the current vocabulary word"
);
has(
  sentencePractice,
  /correctDefinition\s*:\s*currentQuestion\.word\.definition/,
  "submission payload must include the target definition"
);
has(
  sentencePractice,
  /exampleSentence\s*:\s*currentQuestion\.word\.example/,
  "submission payload must include the example sentence"
);
has(
  sentencePractice,
  /START_SUBMISSION|isSubmitting/,
  "component must expose a loading/submitting state"
);
has(
  sentencePractice,
  /SUBMIT_SENTENCE|aiResponse/,
  "component must store and render AI feedback for the answered question"
);
has(
  sentencePractice,
  /catch\s*\([^)]*\)\s*{/,
  "component must handle API failures instead of leaving the user stuck"
);
has(
  sentencePractice,
  /evaluateSentence/,
  "component must keep a local fallback evaluator for failed AI requests"
);
has(
  sentencePractice,
  /setPracticePerformance/,
  "sentence answers must update practice performance statistics"
);
has(
  sentencePractice,
  /questionType\s*:\s*["']sentence["']/,
  "practice attempts must be recorded with questionType 'sentence'"
);
has(
  sentencePractice,
  /userSentences|saveUserSentence/,
  "correct user-authored sentences should be persisted for the word"
);

console.log("AI feedback contract checks passed");

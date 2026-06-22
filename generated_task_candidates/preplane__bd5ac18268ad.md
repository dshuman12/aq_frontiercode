# PrepLane Candidate Task

## TSV row

```tsv
PrepLane	preplane__bd5ac18268ad	Restore AI-powered feedback for form-a-sentence vocabulary practice	bd5ac18268ad32cb24b4ddcb1396fd544a5a55f3	1146	fa81b68f7876ee70a4b209fa9a39f99e7b413c8b	project_silver_repos/oesYoDA55oqhzoGdQcnG__PrepLane.zip	PrepLane	add AI-powered vocabulary feedback via OpenRouter	medium	12	2	0	Yes		npm run build
```

## Task description

Restore the AI-assisted form-a-sentence practice mode for PrepLane vocabulary study. The practice selector already imports this component, but the base snapshot is missing the component and the chat API route it needs, so the app cannot build. The fixed task should let a learner write a sentence using the current vocabulary word, submit it for evaluation, and receive tutor-style feedback explaining whether the usage is correct. The feedback flow should use the existing OpenRouter/AI SDK dependencies through a Next.js API route, keep the API key server-side via `OPENROUTER_KEY`, and return structured JSON that the client can render without exposing provider internals.

The client-side practice component should follow the surrounding vocabulary practice patterns: use learned words from local storage, keep per-question answer state, record correct/incorrect outcomes in practice performance data, allow moving between questions, handle restart/completion states, and show loading/error states while feedback is being requested. Do not change unrelated vocabulary modes, the vocabulary dataset, or dashboard routing.

## Suggested verification

Run:

```bash
npm run build
```

If tests are added while turning this into a full generated task, add targeted coverage for the chat API request contract and for the sentence practice reducer/state transitions. The original source commit predates the repository's later Jest test script, so `npm run build` is a safer visible command for this row than `npm test`.

## Source metadata

- Generated task bundle: `frontiercode_github_upload/generated_tasks/preplane__bd5ac18268ad`
- Deterministic structure QA: PASS
- Base commit: `fa81b68f7876ee70a4b209fa9a39f99e7b413c8b`
- Fix commit: `bd5ac18268ad32cb24b4ddcb1396fd544a5a55f3`
- Changed files:
  - `src/app/api/chat/route.ts`
  - `src/components/dashboard/vocabs/practice/form-a-sentence.tsx`
- Patch size: 2 files changed, 1146 insertions

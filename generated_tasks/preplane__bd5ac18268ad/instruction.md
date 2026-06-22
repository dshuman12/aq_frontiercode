# Task description

The vocabulary practice page is wired to offer a "Form a Sentence" mode, but the imported component is missing and the AI feedback endpoint it needs does not exist. Restore that practice mode so the app builds and learners can submit their own sentence for a learned vocabulary word, receive tutor-style feedback, and continue through the practice session without losing progress.

Implement the missing `src/components/dashboard/vocabs/practice/form-a-sentence.tsx` component using the same local-storage and practice-statistics patterns as the nearby vocabulary practice components. It should use learned vocabulary words, track per-question answers, show a submitting/loading state, render the feedback returned for the current answer, support next/previous/restart/completion flows, record sentence attempts in `practicePerformanceData`, and save correct user-authored sentences back to `vocabsData.userSentences`.

Add a server-side chat route at `src/app/api/chat/route.ts` for vocabulary feedback. The route should accept sentence-validation requests, preserve definition-validation support for the existing vocabulary flows, validate unsupported or missing task names with a clear `400` response, call OpenRouter through the existing AI SDK dependencies with `OPENROUTER_KEY` kept server-side, and return structured JSON that the client can consume. If the API call or response parsing fails, the client should fall back to a basic local sentence check instead of leaving the user stuck in a submitting state.

Keep the change focused on the sentence-practice feature and chat API. Do not change the vocabulary dataset, unrelated practice modes, dashboard routing, package manager, or public local-storage schema except for using the fields that already exist.

# Test guidelines

Run the visible validation command:

```bash
npm run build
```

The base snapshot currently fails to build because `practice.tsx` imports the missing form-a-sentence component. Your fix should make the normal Next.js build pass. If you add tests, keep them in the repository's normal JavaScript/TypeScript workflow and avoid requiring real OpenRouter network access.

# Style guidelines

Match the surrounding React and Next.js style. Keep API keys and provider details out of client components, avoid broad rewrites, and handle loading/error states explicitly so the practice session remains usable when AI feedback is unavailable.

# Task description

Fix authenticated playback by ensuring media consumed by the frontend player is requested through the same-origin `/stream` proxy instead of being handed to the browser as direct backend media URLs. The player’s playlist, segment, and related stream resource requests are initiated by media elements or Vidstack rather than the normal authenticated API client, so they must use a URL shape that allows the browser to include the Lecturn auth cookie reliably.

Focus on the frontend URL-building layer, especially `frontend/src/lib/api-client.ts`, and any closely related tests. Preserve existing JSON API behavior: ordinary API fetches should continue using the configured API base URL and credentials settings. The change should only affect URLs intended for media playback or stream assets. Handle practical URL cases such as leading/trailing slashes, existing query strings, already-relative paths, and avoiding accidental double-wrapping of a URL that is already routed through `/stream`.

Do not change backend authorization semantics, weaken access checks, or introduce a separate token-based media path. Avoid broad refactors of the player UI unless they are necessary to consume the corrected helper output.

# Test guidelines

Run the visible test command from the repository root:

```bash
npm test
```

Add or update focused unit tests for the media URL behavior, preferably under `frontend/src/lib`, where the public API-client tests already live. Cover the regression directly: media URLs should resolve to `/stream` proxy URLs that preserve the original target path and query information, while non-media API calls remain unchanged.

If you use narrower commands while iterating, make sure the final validation still uses the root command above. Backend integration tests require additional services and should not be necessary unless you intentionally touch backend routing.

# Lint guidelines

Run the project lint command before finishing:

```bash
npm run lint
```

If lint failures point at `eslint.config.mjs`, keep any configuration edits minimal and directly related to making the existing frontend TypeScript tests lint cleanly. Do not silence rules globally to hide issues introduced by this task.

# Style guidelines

Use TypeScript-friendly URL handling rather than fragile string concatenation where it improves correctness, but keep the helper readable and easy to test. Maintain the repository’s existing formatting conventions: 2-space indentation, LF line endings, final newlines, and Prettier-compatible code.

Keep the patch narrow. Do not update lockfiles, generated assets, example media, database migrations, or unrelated frontend features. Preserve public function names and exported API shapes unless a small additive helper is needed for the proxy URL behavior.

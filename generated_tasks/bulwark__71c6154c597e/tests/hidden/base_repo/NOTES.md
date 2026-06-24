# bulwark notes

Running scratchpad. Things we know are wrong, things we'd like to do,
things that bit us once and we want to remember.

## known-bad

- The lexer doesn't track column numbers correctly across multi-byte
  utf-8 inputs. Spans are byte offsets right now; we should keep them
  byte-based but compute (line, col) lazily.
- We accept `obs-fold` (a header value continued on the next line with
  leading whitespace) by joining with a space. RFC 7230 deprecated this
  in 2014 but some legacy clients still send it. The smuggling-paranoid
  thing is to reject; we tolerate. Revisit.
- The token bucket uses `time.time()` in one spot in tests; everything
  else goes through `clock.now_ns()`. That's a fixture leak waiting to
  happen.

## want-to-do

- Constant folding of CIDR atoms into the trie. The optimizer pass is
  there but only collapses string literals at the moment.
- Per-rule complexity budget for regex is enforced at match time, but
  the budget number isn't preserved across cache eviction. Need to
  attach it to the compiled regex object instead of looking it up by
  pattern string.
- `Forwarded:` header parsing -- we only do `X-Forwarded-For`. The RFC
  7239 grammar is a little annoying but not hard.
- A "challenge" action that returns a 401 with a cookie nonce and lets
  the next request through. Right now we only have allow/block/tag/limit.

## things that bit us

- Header name comparison: `casefold()` is wrong, ASCII `lower()` is
  right. Casefold maps the German ß to "ss" which makes `Cookieß` match
  `cookiess`. Real bug found in production after a fuzz test.
- Path collapse before percent-decode lets `%2e%2e/` escape the
  collapse. Decode first, then collapse, then re-encode.
- The audit chain broke under `SIGHUP`-triggered reload because two
  goroutines (well, tasks) tried to append simultaneously while the
  writer was being swapped. Single-writer queue fixed it.

## graveyard

- We had a leading-`^` requirement on regex literals for "readability".
  In practice it was just confusing; people kept writing `/admin/` and
  getting `unexpected character /`. Dropped the requirement.
- The lexer used to track (line, col) per token. We switched to byte
  offsets and lazy line/col computation in the diagnostic renderer.
  Tokens are 24 bytes smaller and we lex 12% faster.

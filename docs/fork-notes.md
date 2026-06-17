# apple-docs-mcp — fork notes

Reference for the DePasqualeOrg fork of `kimsungwhee/apple-docs-mcp`: the non-obvious decisions, how to verify, and known limitations. The round-by-round history of reviews, fixes, and testing lives in git history — this keeps only what's worth carrying forward. See `docs/server-comparison.md` for the evaluation that selected this server.

## Status

Reviewed, hardened, and tested end-to-end. All 18 tools have been driven against the live Apple API through a real MCP client; the protocol, caching, error handling, and bundled WWDC data are confirmed working. Baseline: `tsc` clean, lint 0 errors (24 accepted warnings — complexity/max-len/no-non-null-assertion/max-depth), full suite green, `pnpm run check:live` clean.

## Key decisions & research (the "why")

- **Search uses Apple's JSON endpoint, not HTML scraping.** `developer.apple.com/search/` is a client-rendered shell; the real call is `POST https://devintserv.msc.sbz.apple.com/api/v1/search` with `{ text, targetResultLocale: 'en' }` (optional `filterCategory`), returning `{ results: [{ documentation | developer: { metadata: {…} } }], featuredResults? }`. The old `.search-result` scrape returned zero results because Apple no longer server-renders those nodes. **Caveat:** `devintserv.msc.sbz.apple.com` is an internal/undocumented host that can change or disappear — the tool degrades gracefully (clear message pointing at the JSON-API tools) on error or shape change.
- **No anti-detection layer — deliberate, do not re-add.** Apple's endpoints sit behind Akamai, which keys on TLS/JA3 fingerprint, IP reputation, and HTTP/2 header ordering, not the User-Agent. Rotating UAs from one process/IP cannot defeat that, and 429s are IP-based. What works, and what the client does: one realistic Safari User-Agent, request pacing via a concurrency semaphore + rate limiter, and honoring 429/`Retry-After`.
- **MCP stdio invariant:** stdout carries the JSON-RPC protocol, so all logging goes to stderr (and is gated behind `MCP_DEBUG`). Never `console.log`.
- **WWDC data is a bundled snapshot,** frozen at publish time; a freshness footer states the date. Refreshing it is a manual maintenance step.
- **Startup network fan-out is opt-in:** `preloadPopularFrameworks`/`warmUpCaches` run only when `APPLE_DOCS_PRELOAD=true`, so a per-session stdio launch issues no speculative requests by default.
- **SSRF guard:** fetches enforce `new URL(url).hostname === 'developer.apple.com'` (in `httpClient` and `doc-fetcher`), not a substring check.

## Verify

All commands run in the dev container (see `CLAUDE.md`):

```sh
scripts/dx pnpm exec tsc --noEmit   # types
scripts/dx pnpm test                # unit/integration (network mocked)
scripts/dx pnpm run lint            # eslint — expect 0 errors
scripts/dx pnpm run build           # tsc + copy data/ to dist/
scripts/dx pnpm run check:live      # end-to-end against the LIVE Apple API (scripts/realworld-check.mjs)
```

## Known limitations & deferred items

Structural (inherent to what the tool does, not defects):

- Relies on Apple's undocumented render-JSON and search endpoints; they can change shape or rate-limit. Failures degrade gracefully rather than crashing.
- WWDC data is a static snapshot; sessions released after the snapshot date won't appear until it's refreshed.

Deferred by choice (no clear net win — revisit only if the tradeoff changes):

- `noUncheckedIndexedAccess` not enabled — would add `!` assertions that conflict with `no-non-null-assertion`, for code that is already regex/length-guarded.
- Zod argument-validation errors surface as raw JSON via the dispatcher (pre-existing; friendly formatting would be a dispatcher-wide change).
- `get_documentation_updates` returns link-only results; resolving the linked pages is a feature, not a fix.
- `find_similar_apis` can't surface modern replacements for deprecated APIs — Apple doesn't link deprecated→replacement in its "See Also" data (deprecated-grouping see-also is scored low so it doesn't masquerade as a strong match).
- `get_technology_overviews` `searchQuery` is literal substring matching over the broad overview titles; acceptable, and the description sets that expectation.

## Connecting as an MCP server

For the **production** delivery (a pinned `npx github:` install wired across projects) and the runbook for cutting a release, see `docs/releasing.md`.

For **interactive testing during development**: Claude Code loads MCP servers at session start, and **local scope is keyed to the session's project root** (e.g. `…/projects/forked`, not the `apple-docs-mcp/` subdirectory) — register at the session root or use user scope, then restart the session. The dev build runs on the host via `node dist/index.js`, which needs a host `node_modules` (`pnpm install --frozen-lockfile --ignore-scripts`, honoring the 7-day quarantine); the dev container's named `node_modules` volume shadows the host one, so the two coexist. Alternatively, run it inside the container as the MCP command for full isolation.

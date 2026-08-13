# Apple Developer Documentation MCP: apple-doc-mcp vs. apple-docs-mcp

A comparison and recommendation for the MCP server we use to look up Apple Developer Documentation across our Apple projects. The two candidates are:

- **apple-doc-mcp** – upstream `MightyDillah/apple-doc-mcp`, npm `apple-doc-mcp-server` (we run `@1.9.6`). Clone: `/Users/anthony/files/projects/forked/apple-doc-mcp`. This is the one currently configured in Claude Code.
- **apple-docs-mcp** – upstream `kimsungwhee/apple-docs-mcp`, npm `@kimsungwhee/apple-docs-mcp` (`@1.0.26`). Clone: `/Users/anthony/files/projects/forked/apple-docs-mcp`.

## TL;DR recommendation

**Standardize on apple-docs-mcp** (using our DePasqualeOrg fork), with one source-level fix applied. It eliminates the entire class of failures we hit with apple-doc-mcp because it is **stateless** and **URL-addressable**: there is no "choose a technology" step that can silently resolve to the wrong framework, and any documentation page is reachable by its URL regardless of whether it appears in Apple's technologies catalog. It derives every label from the fetched page (no stale-state leakage), uses TTL caching, and has a much broader feature set (WWDC, sample code, platform compatibility, related/similar APIs, batch reference resolution).

apple-docs-mcp is not perfect. It has its own real bug: `get_apple_doc_content` classifies a symbol page (an enum, a struct) as a "specific API" and renders only its declaration, dropping the `topicSections` that hold the enum cases. So out of the box it returns *zero* of an enum's cases — worse than apple-doc-mcp for that one headline use case. The difference is that apple-docs-mcp has a tunable path to completeness (`resolve_references_batch`, `search_framework_symbols`) and the bug is a small, well-isolated formatter fix, whereas apple-doc-mcp's failures are structural (stateful resolver, brittle fuzzy matcher, hard-coded truncation with no override).

**One conclusion holds for both servers:** for exhaustive enumeration ("list every case of enum X") or proving a negative ("does symbol Y exist?"), the installed SDK headers remain the ground-truth baseline. Both servers read Apple's published render JSON, which can lag the newest beta SDK and which neither server renders exhaustively by default.

## How this was tested

The MCP tools for apple-doc-mcp were not connected to this Claude Code session, and neither clone has `node_modules` installed (our supply-chain and dev-container rules mean installs happen in the dev container, not on the host). So the analysis combined three things that do not require running the servers:

1. **Reading both servers' source** to find the exact mechanism behind each behavior, cited below as `file:line`.
2. **Probing Apple's live render-JSON API directly** with `curl` – the same endpoints both servers consume – to confirm what data is actually available and to reproduce each server's logic against it.
3. **Comparing answers against the installed SDK headers** as the correctness baseline.

The test subject throughout is the **Photos / PhotoKit** framework, and specifically the `PHAssetCollectionSubtype` enum.

### Ground truth: the SDK header

From `PhotosTypes.h` in `MacOSX26.5.sdk`, `PHAssetCollectionSubtype` has **29 cases**: 5 album-regular (raw values 2–6), 2 album-shared (100–101), 21 smart-album (200–220), plus `PHAssetCollectionSubtypeAny = NSIntegerMax`. There is **no `smartAlbumReceipts`** case (a second model had hallucinated one; the header disproves it).

```
HDR=$(xcrun --sdk macosx --show-sdk-path)/System/Library/Frameworks/Photos.framework/Headers
# PhotosTypes.h holds the full, version-exact PHAssetCollectionSubtype enum.
```

### Ground truth: Apple's data source

Both servers fetch Apple's render JSON at `https://developer.apple.com/tutorials/data/documentation/<path>.json`:

- apple-doc-mcp: base URL at `src/apple-client/http-client.ts:4`, `.json` suffix at `:49-51`.
- apple-docs-mcp: `convertToJsonApiUrl` at `src/utils/url-converter.ts:28-33`, called from `src/tools/doc-fetcher.ts:273`.

Probing `documentation/photos/phassetcollectionsubtype.json` confirmed the published docs match the SDK header: the same cases including `smartAlbumSpatial` (219) and `smartAlbumScreenRecordings` (220), and **no** `smartAlbumReceipts`. The cases live in `topicSections` (User Album Types: 5, Cloud Album Types: 2, Smart Album Types: 19, plus a couple in other sections), and the page carries 50 `references` total. Because both servers read this same source, **their correctness and version alignment are identical at the data layer**; every difference below is in how they resolve a request and format the response.

## The rough edges, reproduced against both servers

### #1 – `choose_technology` silently resolves to the wrong framework

**apple-doc-mcp: reproduced, structural.** The resolver tries an exact identifier match, then an exact title match, then a fuzzy match (`src/server/handlers/choose-technology.ts:60-82`). The fuzzy scorer (`:5-25`) is the problem: it returns score 2 when *either* string is a substring of the other (`lowerA.includes(lowerB) || lowerB.includes(lowerA)`, `:20-22`), and the handler accepts any score below 3 and silently picks the first such candidate, with no ambiguity check and no minimum-length guard.

Apple's `technologies.json` does **not** contain `Photos` or `PhotosUI` as entries at all (confirmed by probing: 428 references, 366 of them `(kind: symbol, role: collection)`; the only photo-related entries are `LivePhotosKit JS` and `PhotoKit`). So the exact-title step always misses, and the fuzzy step takes over. Replaying the handler's exact logic against the live catalog:

- `"Photos"` → resolves to **`os`** (score 2, because `"photos"` contains the substring `"os"`).
- `"PhotosUI"` → resolves to **`os`** (same reason).

The session that prompted this evaluation saw `"Photos"` resolve to `"LivePhotosKit JS"` instead. Both outcomes are the same bug: several unrelated frameworks tie at score 2 (`os` is a substring of `photos`; `photos` is a substring of `livephotoskit js`), and whichever appears first in Apple's catalog ordering wins. Apple reordered/grew the catalog between then and now (348 → 428 entries), so **the wrong target is not even stable across days** – which makes the failure both silent and non-deterministic.

**apple-docs-mcp: not applicable / not reproduced.** There is no "choose a technology" step and no fuzzy framework matcher to mis-fire. Tools take a URL or a framework name directly. Name resolution uses a deterministic, explicit mapping table (`src/utils/framework-mapper.ts`), and URL-based access bypasses name resolution entirely.

### #2 – Umbrella frameworks can't be selected or drilled into

**apple-doc-mcp: reproduced, structural.** After resolving a candidate, `ensureFramework` (`choose-technology.ts:27-38`, called at `:110`) throws unless the entry is exactly `kind: 'symbol'` and `role: 'collection'`. In Apple's catalog, `PhotoKit` is `kind: 'article', role: 'collection'` (it is an umbrella technology, not a leaf framework), so `choose_technology { name: "PhotoKit" }` throws "PhotoKit is not a framework collection." The lowercase identifier form resolves to the same entry (identifier match is case-insensitive, `:62`) and fails identically. The identifier `documentation/photos` returns "Could not resolve" because no catalog entry has that identifier – even though the page exists. There is no code path that, on hitting an umbrella, enumerates its contained frameworks.

This is purely a missing capability, not a data gap. Probing `documentation/PhotoKit.json` shows its first topic section, "Frameworks", lists exactly `Photos` (`/documentation/photos`) and `PhotosUI` (`/documentation/photosui`) – both `kind: symbol, role: collection`. A resolver that read the umbrella's "Frameworks" section could offer them. apple-doc-mcp does not.

**apple-docs-mcp: not applicable.** There is no selection gate to reject an umbrella. `get_apple_doc_content` on the umbrella URL returns its overview and the list of contained frameworks (the collection path renders all `topicSections` identifiers; see #5). One caveat specific to this server: its mapping table maps the name `'photos'` to `'PhotoKit'` (`framework-mapper.ts:143`), so the name-based convenience tools treat "photos" as the umbrella. URL-based access (`https://developer.apple.com/documentation/photos/...`) reaches the real Photos framework regardless, so this only affects name-typed shortcuts.

### #3 – The discover catalog is incomplete

**apple-doc-mcp: reproduced, root cause is the data source plus a strict filter.** `discover_technologies` builds its catalog from `technologies.json`'s `references`, filtered to `kind === 'symbol' && role === 'collection'` (`src/server/handlers/discover.ts:38-41`), then does a substring match on title or abstract. Because Photos/PhotosUI are absent from that map and PhotoKit is an `article`, the filter removes PhotoKit and the only survivor for "photo" is `LivePhotosKit JS`. Queries for "PhotoKit", "photo", or "album" return zero matches. The catalog is also cached to disk with **no expiry** (`src/apple-client/cache/file-cache.ts`, `loadTechnologies`), and `getTechnologies` only refetches when the cache is empty (`src/apple-client.ts:70-76`); there is no exposed refresh tool, so a stale catalog can persist indefinitely.

**apple-docs-mcp: partially shares the data limitation, but it matters less.** `list_technologies` reads the same `technologies.json` (`src/tools/list-technologies.ts:55`), so it inherits the same gap – Photos/PhotosUI are not enumerable there either. The difference is that discovery is not a prerequisite for fetching: because every other tool is URL- or name-addressable, you never have to find a framework in the catalog before reading its docs. The catalog cache also has a 2-hour TTL rather than living forever (`src/utils/cache.ts`, `technologiesCache`).

### #4 – `get_documentation` full-path "bypass" is stateful and leaks a stale label

**apple-doc-mcp: reproduced, root cause found.** Three separate facts explain the observed behavior:

- *Why the full path returned correct content regardless of the selected technology:* `resolveSymbol` builds candidate paths and, when the path already starts with `documentation/`, fetches it verbatim (`src/server/services/symbol-resolution.ts:31-39`, `:49-52`). So `get_documentation { path: "documentation/photokit/phcollection" }` fetches that exact page directly, independent of the active technology.
- *Why it nonetheless mislabeled the output `Technology: os`:* the handler prints `activeTechnology.title` (`src/server/handlers/get-documentation.ts:77`), taken from session state, not from the fetched page. With `os` left selected from a broken `choose_technology`, the correct PhotoKit content is stamped with the wrong technology label.
- *Why it later hard-refused with "No Technology Selected":* `get_documentation` returns the no-technology message whenever session state has no active technology (`get-documentation.ts:58-61`). The state is in-memory (`src/server/state.ts`), so a restart of the `npx` stdio process – routine for stdio MCP servers – wipes it, and the next call demands `choose_technology` first. Recovery then depends on the broken chooser from #1/#2. The "bypass" is therefore not dependable; it works only while a technology happens to be selected in the current process.

**apple-docs-mcp: not reproduced.** The server holds no session state (`src/index.ts`, `src/tools/handlers.ts` – handlers receive all arguments per call; there is no "active technology" field). `get_apple_doc_content` takes a URL and works on the first call with no prior setup, so it cannot regress to "No Technology Selected." The document header is derived from the fetched page's own metadata (`src/tools/doc-formatter.ts:10-41`), so there is no stale-label leak.

### #5 – Long member/enum lists are truncated

**apple-doc-mcp: reproduced, hard cap with no override.** `get_documentation` formats each topic section by taking the first five identifiers and appending "... and N more items" (`get-documentation.ts:15`, `:23-25`). For `PHAssetCollectionSubtype`, the "Smart Album Types" section has 19 identifiers, so it renders 5 and prints "... and 14 more items" – exactly what we saw. There is no parameter to raise the cap, so the enum cannot be enumerated in full and a negative cannot be proven.

**apple-docs-mcp: a different, arguably worse default, but with an escape hatch.** Its `get_apple_doc_content` decides a page is a "specific API" if any `primaryContentSections` entry has `kind === 'declarations'` (`doc-formatter.ts:146-149`). An enum page has a declaration, so it is classified specific and rendered by `formatSpecificAPIContent`, which only emits declaration/parameters/content and **never renders `topicSections`** (`doc-fetcher.ts:92-158`). Simulated against the live enum JSON, this yields the declaration and overview and **none of the 29 cases**. Collection pages (frameworks, topic groups) take the other path, which lists *all* `topicSection` identifiers with no cap (`doc-fetcher.ts:216-234`) – so framework landing pages are complete, but leaf symbol pages lose their member lists.

The escape hatch: `resolve_references_batch` resolves a page's references with a user-set `maxReferences` (default 20, **max 50**) and an optional `filterByType` (`src/tools/resolve-references-batch.ts:54`, `:75`; schema at `definitions.ts:141-146`). The enum page carries exactly 50 references, so `resolve_references_batch { sourceUrl, maxReferences: 50, filterByType: "symbol" }` recovers all 29 cases. `search_framework_symbols` (user-set `limit`) is a second complete-enumeration path. So completeness is achievable on apple-docs-mcp with the right tool and a raised cap; on apple-doc-mcp it is not achievable at all.

## Head-to-head

| Criterion | apple-doc-mcp | apple-docs-mcp |
|---|---|---|
| **Reliability (no silent wrong matches)** | Poor. Bidirectional-substring fuzzy matcher silently picks an unrelated framework (#1); umbrella selection throws (#2). | Good. No selection step; URL-addressable; deterministic name mapping. Keyword `search_apple_docs` scrapes HTML (fragile) but never returns a *wrong* framework. |
| **Statelessness / determinism** | Stateful in-memory session; behavior depends on prior calls and resets on process restart (#4). | Fully stateless; every call self-contained. |
| **Completeness – catalog** | Misses Photos/PhotosUI; PhotoKit unselectable (#2, #3); catalog cached forever. | Same `technologies.json` gap in `list_technologies`, but discovery is not required to fetch; 2-hour catalog TTL. |
| **Completeness – enum/member lists** | Hard cap of 5 per section, no override; cannot enumerate (#5). | Default `get_apple_doc_content` drops symbol-page `topicSections` entirely (bug), but `resolve_references_batch` (max 50) / `search_framework_symbols` recover full lists. |
| **Correct labels** | Leaks stale `Technology:` from session state (#4). | Header derived from the fetched page. |
| **Correctness & version alignment vs SDK** | Reads Apple render JSON; can lag newest beta SDK. | Identical data source; same caveat. |
| **Data source robustness** | JSON API for all tools; in-process memory cache + file cache (no TTL on catalog). | JSON API for all doc tools; **HTML scraping (cheerio) only for `search_apple_docs`** (`search-parser.ts:1`, `:200`); TTL memory caches + startup warming. |
| **Feature breadth** | 6 tools: discover, choose, current, get_documentation, search_symbols, get_version. | 17 tools: doc search/content, framework symbols, related/similar APIs, platform compatibility, batch reference resolution, documentation updates, technology overviews, sample code, and a full WWDC suite (bundled offline data). |
| **Tests** | None in the repo. | Jest suite, but it covers HTTP/User-Agent infrastructure, not the doc parsing/formatting where the bugs are. |
| **Code quality / maintainability** | Smaller, clean, recently modularized into handlers/services. | Larger and more complex; mixed-language (English/Chinese) comments; stateless architecture is conceptually simpler to reason about. |
| **License** | MIT (© MightyDillah). | MIT (© kimsungwhee). |
| **Upstream activity** | Maintained; recent commits are version bumps and README fixes (latest 2026-05). | Maintained; recent commits add features (WWDC tools, AlarmKit, tool annotations) through 2026-03. |

## Recommendation and rationale

**Adopt apple-docs-mcp**, standardized on our DePasqualeOrg fork, and apply the one formatter fix below.

The decision turns on the top-ranked criteria – reliability and determinism – where the two servers are not close. apple-doc-mcp's failures (#1, #2, #4) all stem from one structural choice: a stateful "select a framework, then query within it" model whose selector is a fuzzy substring matcher over an incomplete catalog. That design silently resolves "Photos" to an unrelated framework, can't reach umbrella-grouped frameworks at all, and loses its state on the routine restarts of an `npx` stdio server. These are not surface bugs; fixing them means rebuilding the resolver and the state model.

apple-docs-mcp avoids the whole category by being stateless and URL-addressable. You ask for a page by URL or name and get that page, deterministically, on the first call, labeled from its own metadata. Its weaknesses are narrower and more fixable: one formatter bug drops enum/member lists on symbol pages, and its keyword search scrapes HTML. The first is a small isolated change (below); the second is mitigated because the high-value tools (`get_apple_doc_content`, `search_framework_symbols`, `resolve_references_batch`, platform compatibility) all use the JSON API, and keyword search is the least-trusted entry point anyway.

Feature breadth is a tiebreaker, not the deciding factor, but it is lopsided: WWDC sessions, sample code, platform-compatibility analysis, and batch reference resolution are genuinely useful for our work and have no counterpart in apple-doc-mcp.

The honest caveat, which applies to **either** choice: neither server renders an enum's full case set by default, and both depend on Apple's published docs rather than the installed SDK. So our existing practice stands – **treat the SDK headers as the baseline for exhaustive enumeration and for proving a symbol does not exist.** The recommendation makes the everyday lookups reliable; it does not replace the headers for that one rigorous case.

## Prioritized fix list for the chosen fork (apple-docs-mcp)

All of these are now **implemented in this fork and verified in the dev container** (`scripts/dx pnpm exec tsc --noEmit` clean, `scripts/dx pnpm test` → 467/467 passing, `scripts/dx pnpm run lint` → 0 errors, no new warnings). No branches were pushed and no PRs opened.

1. **Render `topicSections` on symbol pages (highest priority, low risk).** *Done.* `formatJsonDocumentation` (`src/tools/doc-fetcher.ts`) now calls a shared `formatTopicSections` helper for both the specific-API path and the collection path, so `get_apple_doc_content` on `PHAssetCollectionSubtype` lists all 29 cases. The classifier (`doc-formatter.ts`) is unchanged; the fix is to stop treating "has a declaration" as "has no member list." The helper also resolves each item's URL from the page's references map (or strips the `doc://<bundle>/documentation/` prefix generically) instead of the previous hard-coded `doc://com.apple.SwiftUI/` replace, which produced broken links for every non-SwiftUI framework.
2. **Lift the `resolve_references_batch` ceiling and make truncation explicit.** *Done.* `maxReferences` now allows up to 200 (`definitions.ts`), and the formatter emits a "Showing N of M matching references. Raise `maxReferences`..." note whenever the result is truncated, so a partial listing is never mistaken for a complete one.
3. **Fix the `'photos' → 'PhotoKit'` name mapping.** *Done.* `src/utils/framework-mapper.ts` now maps `'photos' → 'Photos'`; `'photokit'` continues to map to the umbrella.
4. **Make `search_apple_docs` guidance clearer.** *Done (conservatively).* The "no results" message now notes that this is the only tool that scrapes HTML — so an empty result can mean Apple changed the markup or rate-limited the request — and points to the JSON-API-backed tools (`get_apple_doc_content`, `list_technologies`, `search_framework_symbols`). A full JSON-index search backend was deliberately *not* built: the project's own tests treat "zero result items" as a legitimate "no matches" outcome, so a heuristic that reclassified it as "markup broken" would be wrong. Enriching the message keeps that contract intact while delivering the routing guidance.
5. **Add a behavioral regression test for the formatter/classifier.** *Done.* `tests/regression/symbol-page-topic-sections.test.ts` feeds the real PHAssetCollectionSubtype render JSON (`tests/fixtures/phassetcollectionsubtype.json`) through `fetchAppleDocJson` and asserts all 29 cases render, no `smartAlbumReceipts` is invented, and case links are correct (non-SwiftUI). It also caught the See Also link bug fixed under #1.

If apple-doc-mcp were kept instead, the equivalent fix list would be much heavier: replace the fuzzy matcher with exact-match-plus-candidate-list resolution, add umbrella drill-in, make `get_documentation` infer the technology from a full path and stop requiring session state, derive the `Technology:` label from the fetched page, add a TTL to the technologies cache, and add a way to retrieve full member lists. That is a rewrite of the resolver and state model, which is itself an argument for the recommendation.

## Running and verifying this fork

This fork runs in a dev container so third-party dependency code never executes on the host (supply chain mitigation). Edit source on the host; run everything that executes code through `scripts/dx`, which starts the container on first use:

```sh
scripts/dx pnpm run compile    # tsc + copy data/
scripts/dx pnpm test           # Jest (467 tests)
scripts/dx pnpm run lint       # eslint
```

The image builds from the shared `devcontainer-base` image (sibling `devcontainer-base` project, `./build.sh`). See `AGENTS.md` for details. There are no forwarded ports — this is an MCP stdio server.

## Practical guidance

The reliable invocations are:

- **apple-docs-mcp** (recommended, this fork): `get_apple_doc_content { url: "https://developer.apple.com/documentation/photos/phassetcollectionsubtype" }` now lists all cases directly. `resolve_references_batch { sourceUrl: "<same URL>", maxReferences: 200, filterByType: "symbol" }` remains a useful cross-check for very large symbols.
- **apple-doc-mcp** (current): the full-path form `get_documentation { path: "documentation/photos/phassetcollectionsubtype" }` works only while some technology is selected in the current process, truncates member lists to 5 per section, and may mislabel the `Technology:` line. Do not rely on `choose_technology`/`discover_technologies` for Photos/PhotoKit.
- **Both:** for the complete, version-exact enum (or to prove a case does not exist), read the SDK header:
  ```
  HDR=$(xcrun --sdk macosx --show-sdk-path)/System/Library/Frameworks/Photos.framework/Headers
  # e.g. PhotosTypes.h for PHAssetCollectionSubtype
  ```

Once a server is confirmed, the "Apple developer documentation (apple-docs MCP)" section in apple-mcp's `~/.claude/CLAUDE.md` should be updated to match the chosen tool's actual interface.

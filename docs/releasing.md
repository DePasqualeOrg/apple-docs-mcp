# Releasing & wiring the fork

How the DePasqualeOrg fork is delivered to Claude Code projects, and the runbook for cutting a new release. This is the **production** delivery (a pinned `npx github:` install); for connecting the live dev build during development, see the "Connecting as an MCP server" note in `fork-notes.md`.

## Delivery model

Projects run the fork via an immutable, pinned GitHub install — no npm registry:

```
npx -y github:DePasqualeOrg/apple-docs-mcp#<full-commit-sha>
```

The SHA points at a commit on the **`release`** branch that carries a prebuilt `dist/`. This gives the robustness of the `npx apple-doc-mcp-server@1.9.6` setup it replaces — pinned, self-contained, fetch-on-demand — while keeping our constraints:

- **No npm publish** (no package rename, no registry account needed).
- **Supply-chain posture preserved:** the install runs only the two *runtime* deps (`@modelcontextprotocol/sdk`, `zod`) on the host, honoring the global 7-day quarantine. No dev toolchain and no `tsc` build run on the host, because `dist/` is prebuilt and committed on the release branch (no `prepare` script).
- **Immutable pin:** a full commit SHA can't move. Tags (`vX.Y.Z-fork.N`) are human-readable labels for the same commit.

## How it works (why the release branch is shaped this way)

- `patches`/`main` keep `dist/` **gitignored** (it's build output). The **`release`** branch force-commits the compiled JS so a `npx`-from-GitHub checkout has a runnable `bin` (`dist/index.js`) with no build step.
- The release artifact is **JS-only** (`dist/**/*.js`, no `dist/data`). The WWDC snapshot lives at the repo root in `data/` (tracked) and is shipped via package.json `files`. At runtime, `getWWDCDataDirectory()` (`src/utils/wwdc-data-source-path.ts`) uses `dist/data` when present (npm/build layout) and otherwise falls back to the package-root `data/` (this git-checkout layout). So the small JS-only artifact still finds the data, with no duplication.

## Cutting a release

All build/test commands run in the dev container via `scripts/dx`.

```sh
# 1. Land your changes on patches (or main) and verify
scripts/dx pnpm exec tsc --noEmit
scripts/dx pnpm test
scripts/dx pnpm run lint            # expect 0 errors
scripts/dx pnpm run check:live      # live end-to-end against Apple

# 2. Point the release branch at the source commit you're releasing
git checkout release 2>/dev/null || git checkout -b release
git reset --hard patches            # (or main / the ref you're releasing)

# 3. Clean, JS-ONLY build — NOT `pnpm run build`, which copies data into dist/
scripts/dx pnpm run clean
scripts/dx pnpm exec tsc
#    sanity check: dist/index.js exists, dist/data does NOT
[ -f dist/index.js ] && [ ! -d dist/data ] && echo "ok: js-only artifact" || echo "WRONG: rebuild"

# 4. Commit the built dist (force — dist is gitignored) and tag
git add -f dist
git commit -m "release: build artifact (vX.Y.Z-fork.N)"
git tag vX.Y.Z-fork.N

# 5. Push (force the branch — it's rebuilt each release; use a NEW tag each time)
git push -f origin release
git push origin vX.Y.Z-fork.N

# 6. The pin is this commit's SHA:
git rev-parse HEAD

# 7. Return to dev and restore a normal full dist for local work
git checkout patches
scripts/dx pnpm run build
```

Then repin the MCP config (next section) to the new SHA and restart Claude Code.

## Wiring into projects

One **user-scope** entry covers every current and future project:

```sh
claude mcp add --scope user --transport stdio apple-docs -- \
  npx -y github:DePasqualeOrg/apple-docs-mcp#<full-commit-sha>
```

Then restart Claude Code (or `claude --continue` to resume the current conversation) — MCP servers load at session start.

To update to a newer release, repin to the new SHA:

```sh
claude mcp remove apple-docs -s user
claude mcp add --scope user --transport stdio apple-docs -- \
  npx -y github:DePasqualeOrg/apple-docs-mcp#<new-full-sha>
# restart Claude Code
```

Notes:

- **Pin to the full SHA**, not a branch (branches move) — that's the immutable pin.
- **First launch per SHA** installs the runtime deps via `npx` (honoring the quarantine) and caches them; subsequent launches are fast. The install stays within the MCP client's startup timeout.
- **Don't point projects at the dev working tree** (`node …/apple-docs-mcp/dist/index.js`) for everyday use — a mid-edit broken build would break every wired project. They run the tagged release artifact instead.
- After swapping servers, update the "Apple developer documentation" section in `~/.claude/CLAUDE.md` to the fork's tool interface (it otherwise still documents the old `apple-doc-mcp` `choose_technology` workflow).

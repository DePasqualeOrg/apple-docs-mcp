# Releasing & wiring the fork

How the DePasqualeOrg fork is delivered to Codex and Claude Code projects, and the runbook for cutting a new release. This is the production delivery through a pinned package tarball. For connecting the live dev build during development, see the "Connecting as an MCP server" note in `fork-notes.md`.

## Delivery model

Projects run the fork from an immutable package tarball stored in the GitHub repository, without using the npm registry:

```
npx --yes --ignore-scripts --allow-remote=root --no-audit --no-fund --no-update-notifier https://raw.githubusercontent.com/DePasqualeOrg/apple-docs-mcp/<release-commit-sha>/artifacts/kimsungwhee-apple-docs-mcp-1.0.26.tgz
```

The SHA identifies a commit on the **`release`** branch that carries the verified tarball. The commit and package contents are immutable:

- **No npm publish:** No package rename or registry account is needed.
- **Reproducible dependency tree:** `package-lock.json` pins the complete npm dependency tree, including transitive versions and registry integrity hashes. The tarball physically contains that reviewed runtime tree, so `npx` does not resolve dependencies from the registry.
- **No lifecycle scripts:** `npx` receives `--ignore-scripts`, and the tarball already contains compiled JavaScript and runtime dependencies. No compiler or dependency lifecycle script runs on the host.
- **Immutable pin:** The raw GitHub URL contains the full commit SHA. Moving a branch or tag cannot change the bytes at that URL.

## How it works (why the release branch is shaped this way)

- `patches`/`main` contain source and lockfiles. Generated `.tgz` files remain ignored there.
- `scripts/build-npx-package` creates the package in a disposable container, verifies both lockfiles, compiles the server, installs the npm production tree with lifecycle scripts disabled, packs the project, and installs the tarball offline with an empty npm cache.
- The **`release`** branch is rebuilt from the source commit and force-adds the verified tarball under `artifacts/`. Codex and Claude Code download that tarball by the release commit SHA.

## Cutting a release

All dependency, build, and package commands run in containers.

```sh
# 1. Land and verify source changes on patches.
scripts/update-dependencies

# 2. Build the self-contained tarball.
artifact_dir="$(mktemp -d /tmp/apple-docs-release.XXXXXX)"
scripts/build-npx-package "$artifact_dir"

# 3. Rebuild the release branch in a temporary worktree.
release_parent="$(mktemp -d /tmp/apple-docs-release-tree.XXXXXX)"
release_tree="$release_parent/worktree"
git worktree add "$release_tree" release
git -C "$release_tree" reset --hard patches
mkdir -p "$release_tree/artifacts"
cp "$artifact_dir"/*.tgz "$release_tree/artifacts/"
git -C "$release_tree" add -f artifacts
git -C "$release_tree" commit -m "Build npx release artifact"

# 4. Push with lease protection and record the immutable pin.
git -C "$release_tree" push --force-with-lease origin release
release_sha="$(git -C "$release_tree" rev-parse HEAD)"
echo "$release_sha"

# 5. Remove the temporary worktree and directories.
git worktree remove "$release_tree"
rm -rf "$artifact_dir" "$release_parent"
```

Then replace `<release-commit-sha>` in the MCP command and restart the client.

## Wiring into projects

Codex stores the user-scoped server in `~/.codex/config.toml`:

```sh
codex mcp add apple-docs -- \
  npx --yes --ignore-scripts --allow-remote=root --no-audit --no-fund --no-update-notifier \
  https://raw.githubusercontent.com/DePasqualeOrg/apple-docs-mcp/<release-commit-sha>/artifacts/kimsungwhee-apple-docs-mcp-1.0.26.tgz
```

Restart Codex after changing the entry because MCP servers load at task start.

To update to a newer release, replace the server entry with the new release commit SHA:

```sh
codex mcp remove apple-docs
codex mcp add apple-docs -- \
  npx --yes --ignore-scripts --allow-remote=root --no-audit --no-fund --no-update-notifier \
  https://raw.githubusercontent.com/DePasqualeOrg/apple-docs-mcp/<new-release-commit-sha>/artifacts/kimsungwhee-apple-docs-mcp-1.0.26.tgz
```

Notes:

- **Pin to the full release commit SHA**, not a branch or tag. Branches and ordinary tags can move.
- **First launch per SHA:** `npx` downloads and caches only the tarball. It does not download runtime dependencies because they are already bundled, and the command disables npm's audit and update-check requests. Subsequent launches use npm's cache.
- **Treat package-lock updates as supply-chain changes.** Generate them inside the dev container with lifecycle scripts disabled, review the resolved versions and integrity hashes, and commit them with the corresponding dependency change.
- **Update dependencies through the project wrapper.** Run `scripts/update-dependencies` to update every direct dependency to the newest eligible stable release, or pass one or more `<package>@<exact-version>` arguments for a targeted update. TypeScript and Node type definitions stay within the current major version because they track the supported lint toolchain and Node runtime. The wrapper runs pinned copies of npm, pnpm, and npm-check-updates in a disposable staging copy; enforces a three-day minimum release age; disables lifecycle scripts; generates the npm package lock and pnpm lock; validates registry sources and integrity hashes; builds the bundled production tree; and runs the compile, lint, test, and package checks. A final frozen offline install checks the pnpm lockfile. The repository remains unchanged unless every step succeeds, and only the manifest and two lockfiles are copied back.
- **Build release artifacts through the project wrapper.** `scripts/build-npx-package` refuses to overwrite an existing tarball and copies an artifact out only after package-content and offline-install verification pass.
- **Do not point projects at the dev working tree** (`node …/apple-docs-mcp/dist/index.js`) for everyday use. A mid-edit broken build would break every wired project.
- After swapping servers, update the "Apple developer documentation" section in `~/.claude/CLAUDE.md` to the fork's tool interface (it otherwise still documents the old `apple-doc-mcp` `choose_technology` workflow).

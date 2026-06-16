# CLAUDE.md

## Running commands (dev container)

All project commands run inside the dev container, never on the host, so third-party dependency code stays isolated from the machine. This is a supply chain attack mitigation. Edit source files directly on the host — they are bind-mounted into the container, so the container sees changes immediately. Run anything that executes code (pnpm, node, builds, tests, lint, `tsc`) through the wrapper:

```sh
scripts/dx pnpm run build       # tsc + copy data/ to dist/
scripts/dx pnpm test            # Jest (unit/integration; network mocked)
scripts/dx pnpm run lint        # eslint
scripts/dx pnpm exec tsc --noEmit
scripts/dx pnpm run check:live  # real-world end-to-end check against the LIVE Apple API
```

`scripts/dx` starts the container (building the image and installing dependencies inside it) on first use. The image depends on the shared `devcontainer-base` image, built from the sibling `devcontainer-base` project (`./build.sh`). This is an MCP stdio server, so there is no dev server and no ports are forwarded. After changing dependencies, rebuild the image:

```sh
docker compose -f docker-compose.dev.yml up -d --build app
```

Do not run pnpm, npm, node, or `node_modules` code on the host; there is no host `node_modules`.

## Real-world check (live Apple API)

`pnpm run check:live` (script: `scripts/realworld-check.mjs`) builds the server, then spawns it over stdio with a real MCP client and exercises all 18 tools — valid inputs, every filter/enum, and error/edge cases — against the live `developer.apple.com` API. Each response is scanned for rough-edge signatures (double-prefixed URLs, `[object Object]`, broken `doc://` links, empty link targets, cryptic errors) and any flags are summarized at the end.

This is intentionally separate from `pnpm test`: the unit suite mocks the network for determinism, whereas this check confirms the live server actually works (protocol handshake, stdout staying pure JSON-RPC, real Apple JSON shapes, the bundled WWDC data). It needs network egress, so it must run inside the dev container:

```sh
scripts/dx pnpm run check:live
```

Run it after changes that touch fetching, parsing, formatting, the MCP wiring, or the bundled WWDC data. A clean run prints `none detected` under the rough-edges summary.

## Project notes

- This is a fork of `kimsungwhee/apple-docs-mcp`. The package manager is **pnpm** (`pnpm-lock.yaml`, lockfileVersion 9.0); the bundled `package-lock.json` is from upstream and is not used here.
- See `docs/server-comparison.md` for the evaluation that led to standardizing on this server, and the prioritized fix list it tracks.

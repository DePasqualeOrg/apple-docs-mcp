FROM devcontainer-base

# apple-docs-mcp uses pnpm (pnpm-lock.yaml is lockfileVersion 9.0). Pin npm,
# pnpm, and npm-check-updates so dependency maintenance does not change with the
# floating base image. The base configures an npm global prefix owned by node.
RUN npm install -g npm@11.13.0 pnpm@9.15.9 npm-check-updates@22.2.9 --ignore-scripts && npm cache clean --force

# Pin the pnpm store to a project-local path so the build-time and run-time
# locations agree. A dedicated named volume is mounted here (see
# docker-compose.dev.yml) so the store persists across rebuilds and never lands
# on the host bind mount.
ENV npm_config_store_dir=/workspace/.pnpm-store

# Install dependencies inside the image (never on the host). Copying only the
# manifest and lockfiles first keeps this layer cached unless they change.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the source with proper ownership.
COPY --chown=node:node . .

# Keep dependency-maintenance logic outside the writable staging mount. The
# updater runs with a read-only container filesystem and invokes these copies.
COPY --chown=root:root scripts/dependency-maintenance.mjs scripts/update-dependencies-in-container /opt/apple-docs-maintenance/

# Keep the container running; commands are run on demand via scripts/dx. This is
# an MCP stdio server, so there is no dev server to start and no port to expose.
CMD ["tail", "-f", "/dev/null"]

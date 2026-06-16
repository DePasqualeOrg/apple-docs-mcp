FROM devcontainer-base

# apple-docs-mcp uses pnpm (pnpm-lock.yaml is lockfileVersion 9.0). Install pnpm
# 9 globally; the base image already configures an npm global prefix owned by the
# node user. Done as a separate layer so it caches independently of the source.
RUN npm install -g pnpm@9 && npm cache clean --force

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

# Keep the container running; commands are run on demand via scripts/dx. This is
# an MCP stdio server, so there is no dev server to start and no port to expose.
CMD ["tail", "-f", "/dev/null"]

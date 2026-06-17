/**
 * Separate module for handling data directory path resolution
 * This is isolated to avoid import.meta.url issues in tests
 */
/**
 * Get the WWDC data directory path.
 *
 * Supports two on-disk layouts:
 * - npm/build layout: `pnpm run build` copies `data/` into `dist/`, so from the
 *   compiled file at `dist/utils/` the data sits at `../data`.
 * - git-checkout layout (e.g. installed via `npx github:…`, where only the
 *   compiled JS is committed under `dist/`): the tracked `data/` stays at the
 *   package root, i.e. `../../data` from `dist/utils/`. `data` is listed in
 *   package.json `files` so it ships with that install too.
 */
export declare function getWWDCDataDirectory(): string;
//# sourceMappingURL=wwdc-data-source-path.d.ts.map
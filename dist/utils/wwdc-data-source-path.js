/**
 * Separate module for handling data directory path resolution
 * This is isolated to avoid import.meta.url issues in tests
 */
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
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
export function getWWDCDataDirectory() {
    // In test environment, use current working directory
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        return path.resolve(process.cwd(), 'data/wwdc');
    }
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirPath = path.dirname(currentFilePath);
    // Prefer data bundled into dist/ by the build; fall back to package-root data/.
    const bundled = path.resolve(currentDirPath, '../data/wwdc');
    if (existsSync(bundled)) {
        return bundled;
    }
    return path.resolve(currentDirPath, '../../data/wwdc');
}
//# sourceMappingURL=wwdc-data-source-path.js.map
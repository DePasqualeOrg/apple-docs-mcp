/**
 * Framework preloader for performance optimization
 */
import { searchFrameworkSymbols } from '../tools/search-framework-symbols.js';
import { indexCache } from './cache.js';
import { logger } from './logger.js';
import { getFrameworksByCategory } from './framework-mapper.js';
/**
 * Popular frameworks to preload (using normalized names)
 */
const POPULAR_FRAMEWORKS = [
    ...getFrameworksByCategory('UI'), // SwiftUI, UIKit, etc.
    ...getFrameworksByCategory('Foundation'), // Foundation, Combine, Swift
    ...getFrameworksByCategory('Data').slice(0, 2), // Core Data, CloudKit
    ...getFrameworksByCategory('Graphics').slice(0, 2), // Core Graphics, Metal
    ...getFrameworksByCategory('Games').slice(0, 3), // ARKit, SceneKit, SpriteKit
].map(f => f.toLowerCase());
/**
 * Preload popular framework indexes
 */
export async function preloadPopularFrameworks() {
    logger.info('Starting framework preload...');
    const preloadPromises = POPULAR_FRAMEWORKS.map(async (framework) => {
        try {
            // Check if already cached
            const cacheKey = `framework-index-${framework}`;
            if (indexCache.has(cacheKey)) {
                logger.debug(`Framework ${framework} already cached, skipping...`);
                return;
            }
            // Load framework index with minimal results
            logger.info(`Preloading framework: ${framework}`);
            await searchFrameworkSymbols(framework, 'all', undefined, 'swift', 1);
            logger.info(`Successfully preloaded: ${framework}`);
        }
        catch (error) {
            logger.error(`Failed to preload ${framework}:`, error);
        }
    });
    await Promise.all(preloadPromises);
    logger.info('Framework preload completed');
}
//# sourceMappingURL=preloader.js.map
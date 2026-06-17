/**
 * Unified framework name mapping system for Apple Docs MCP
 *
 * This module provides consistent framework name normalization across all tools.
 * It handles common variations, typos, and alternative names for Apple frameworks.
 */
/**
 * Comprehensive framework name mappings
 * Maps lowercase/alternative names to canonical Apple framework names
 */
export declare const FRAMEWORK_MAPPINGS: Record<string, string>;
/**
 * Framework categories for organization
 */
export declare const FRAMEWORK_CATEGORIES: {
    readonly UI: readonly ["SwiftUI", "UIKit", "AppKit", "WidgetKit", "WatchKit"];
    readonly Graphics: readonly ["Core Graphics", "Core Image", "Core Animation", "Metal"];
    readonly Games: readonly ["ARKit", "RealityKit", "SceneKit", "SpriteKit", "GameKit"];
    readonly Media: readonly ["AVFoundation", "Core Audio", "PhotoKit", "MusicKit"];
    readonly Data: readonly ["Core Data", "CloudKit", "UserDefaults", "Keychain Services"];
    readonly ML: readonly ["Core ML", "Create ML", "Natural Language", "Vision", "Speech"];
    readonly Services: readonly ["HealthKit", "HomeKit", "MapKit", "StoreKit", "AlarmKit"];
    readonly System: readonly ["Core Bluetooth", "Core Motion", "Core Location"];
    readonly Foundation: readonly ["Foundation", "Combine", "Swift"];
};
/**
 * Normalize a framework name to its canonical Apple form
 *
 * @param framework - The framework name to normalize (case-insensitive)
 * @returns The canonical framework name, or the original if no mapping exists
 */
export declare function normalizeFrameworkName(framework: string): string;
/**
 * Get frameworks by category
 *
 * @param category - The category name
 * @returns Array of framework names in the category
 */
export declare function getFrameworksByCategory(category: keyof typeof FRAMEWORK_CATEGORIES): string[];
//# sourceMappingURL=framework-mapper.d.ts.map
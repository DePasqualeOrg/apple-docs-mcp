/**
 * Tests for framework name mapping utilities
 */

import {
  normalizeFrameworkName,
  getFrameworksByCategory,
  FRAMEWORK_MAPPINGS,
  FRAMEWORK_CATEGORIES,
} from '../../src/utils/framework-mapper.js';

describe('Framework Mapper', () => {
  describe('normalizeFrameworkName', () => {
    it('should normalize common framework names correctly', () => {
      expect(normalizeFrameworkName('swiftui')).toBe('SwiftUI');
      expect(normalizeFrameworkName('uikit')).toBe('UIKit');
      expect(normalizeFrameworkName('core-data')).toBe('Core Data');
      expect(normalizeFrameworkName('arkit')).toBe('ARKit');
      expect(normalizeFrameworkName('webkit')).toBe('WebKit');
    });

    it('should handle case variations', () => {
      expect(normalizeFrameworkName('SWIFTUI')).toBe('SwiftUI');
      expect(normalizeFrameworkName('SwiftUI')).toBe('SwiftUI');
      expect(normalizeFrameworkName('swift-ui')).toBe('SwiftUI');
      expect(normalizeFrameworkName('swift_ui')).toBe('SwiftUI');
    });

    it('should handle empty or invalid input', () => {
      expect(normalizeFrameworkName('')).toBe('');
      expect(normalizeFrameworkName('   ')).toBe('');
      // @ts-expect-error Testing invalid input
      expect(normalizeFrameworkName(null)).toBe('');
      // @ts-expect-error Testing invalid input
      expect(normalizeFrameworkName(undefined)).toBe('');
    });

    it('should return original name with proper casing for unknown frameworks', () => {
      expect(normalizeFrameworkName('unknownframework')).toBe('Unknownframework');
      expect(normalizeFrameworkName('custom-lib')).toBe('Custom-lib');
    });

    it('should handle already canonical names', () => {
      expect(normalizeFrameworkName('Foundation')).toBe('Foundation');
      expect(normalizeFrameworkName('Core Data')).toBe('Core Data');
      expect(normalizeFrameworkName('Metal Performance Shaders')).toBe('Metal Performance Shaders');
    });
  });

  describe('getFrameworksByCategory', () => {
    it('should return frameworks for valid categories', () => {
      const uiFrameworks = getFrameworksByCategory('UI');
      expect(uiFrameworks).toContain('SwiftUI');
      expect(uiFrameworks).toContain('UIKit');
      expect(uiFrameworks).toContain('AppKit');

      const gameFrameworks = getFrameworksByCategory('Games');
      expect(gameFrameworks).toContain('ARKit');
      expect(gameFrameworks).toContain('SceneKit');
      expect(gameFrameworks).toContain('SpriteKit');
    });

    it('should return empty array for invalid categories', () => {
      // @ts-expect-error Testing invalid category
      expect(getFrameworksByCategory('InvalidCategory')).toEqual([]);
    });
  });

  describe('FRAMEWORK_MAPPINGS consistency', () => {
    it('should have lowercase keys', () => {
      Object.keys(FRAMEWORK_MAPPINGS).forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
    });

    it('should have proper capitalization in values', () => {
      Object.values(FRAMEWORK_MAPPINGS).forEach(value => {
        expect(value).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });

    it('should allow intentional duplicate values for aliases', () => {
      const values = Object.values(FRAMEWORK_MAPPINGS);
      const uniqueValues = new Set(values);
      // Some frameworks intentionally have multiple aliases mapping to the same canonical name
      expect(uniqueValues.size).toBeGreaterThan(0);
      expect(values.length).toBeGreaterThan(uniqueValues.size);
    });
  });

  describe('FRAMEWORK_CATEGORIES consistency', () => {
    it('should contain valid framework names', () => {
      Object.values(FRAMEWORK_CATEGORIES).flat().forEach(framework => {
        expect(typeof framework).toBe('string');
        expect(framework.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicates across categories', () => {
      const allFrameworks = Object.values(FRAMEWORK_CATEGORIES).flat();
      const uniqueFrameworks = new Set(allFrameworks);
      expect(allFrameworks.length).toBe(uniqueFrameworks.size);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex framework name variations', () => {
      const testCases = [
        { input: 'metal-performance-shaders', expected: 'Metal Performance Shaders' },
        { input: 'app-tracking-transparency', expected: 'App Tracking Transparency' },
        { input: 'natural_language', expected: 'Natural Language' },
        { input: 'WEBKIT', expected: 'WebKit' },
        { input: 'swift playgrounds', expected: 'Swift Playgrounds' }, // Maps to canonical name
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeFrameworkName(input)).toBe(expected);
      });
    });
  });
});

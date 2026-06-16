import { describe, it, expect } from '@jest/globals';
import { isSpecificAPIDocument } from '../../src/tools/doc-formatter.js';

describe('isSpecificAPIDocument', () => {
  it('is true when a declarations section is present (a symbol page)', () => {
    expect(isSpecificAPIDocument({ primaryContentSections: [{ kind: 'declarations' }] } as never)).toBe(
      true,
    );
  });

  it('is true when a declarations section appears among others', () => {
    expect(
      isSpecificAPIDocument({
        primaryContentSections: [{ kind: 'content' }, { kind: 'declarations' }],
      } as never),
    ).toBe(true);
  });

  it('is false for a collection page with no declaration', () => {
    expect(isSpecificAPIDocument({ primaryContentSections: [{ kind: 'content' }] } as never)).toBe(
      false,
    );
  });

  it('is false when there are no primaryContentSections', () => {
    expect(isSpecificAPIDocument({} as never)).toBe(false);
  });
});

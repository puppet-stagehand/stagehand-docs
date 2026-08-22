import { describe, expect, it } from 'vitest';
import { statusPresentation } from '../../src/lib/data/status';

describe('statusPresentation', () => {
  it.each([
    ['supported', { label: 'Supported', symbol: 'check-circle' }],
    ['compatible', { label: 'Compatible', symbol: 'link' }],
    ['limited', { label: 'Limited', symbol: 'alert-triangle' }],
    ['deprecated', { label: 'Deprecated', symbol: 'clock' }],
    ['unsupported', { label: 'Unsupported', symbol: 'x-circle' }],
  ] as const)('maps %s to a text label and non-color symbol', (status, expected) => {
    // Catches adding or changing a support state without an accessible, non-color presentation.
    expect(statusPresentation(status)).toEqual(expected);
  });
});

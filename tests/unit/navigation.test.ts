import { describe, expect, it } from 'vitest';
import { primaryNavigation } from '../../src/lib/navigation';

describe('primaryNavigation', () => {
  it('contains every customer entry point exactly once', () => {
    expect(primaryNavigation).toEqual([
      { href: '/tiers/', label: 'Tiers' },
      { href: '/compatibility/', label: 'Compatibility' },
      { href: '/docs/', label: 'Docs' },
      { href: '/support/', label: 'Support' },
    ]);
  });
});

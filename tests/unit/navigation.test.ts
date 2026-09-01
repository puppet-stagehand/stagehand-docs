import { describe, expect, it } from 'vitest';
import { primaryNavigation } from '../../src/lib/navigation';

describe('primaryNavigation', () => {
  it('contains every customer entry point exactly once', () => {
    expect(primaryNavigation).toEqual([
      { href: '/docs/why-stagehand/', label: 'Why Stagehand?' },
      { href: '/features/', label: 'Features' },
      { href: '/compatibility/', label: 'Compatibility' },
      { href: '/docs/', label: 'Docs' },
      { href: '/downloads/', label: 'Downloads' },
    ]);
  });
});

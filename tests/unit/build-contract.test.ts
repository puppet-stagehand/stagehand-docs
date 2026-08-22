import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';

describe('Astro build contract', () => {
  it('renders a static site at the canonical stable URL', () => {
    expect(config.output).toBe('static');
    expect(config.site?.toString()).toBe('https://www.puppetstagehand.com/');
  });
});

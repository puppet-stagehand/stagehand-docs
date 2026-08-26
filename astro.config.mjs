import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir: process.env.STAGEHAND_E2E_FIXTURES === '1' ? './.e2e-dist' : './dist',
  site: 'https://www.puppetstagehand.com/',
  trailingSlash: 'always',
  build: { assets: 'assets', format: 'directory' },
  markdown: {
    // Shiki's default theme writes an inline `style` attribute onto <pre> that
    // hardcodes its own background/foreground colors, which wins over any
    // stylesheet rule (inline style always outranks external CSS specificity).
    // That would silently defeat the `.docs-content pre` rule below, which
    // exists specifically to reuse the site's navy/off-white surface pair
    // instead of introducing a second, unreviewed color language for code
    // blocks. Docs content uses plain, generic command examples, not code
    // requiring language-aware highlighting, so disable it entirely.
    syntaxHighlight: false,
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['color-functions', 'global-builtin', 'if-function', 'import'],
        },
      },
    },
  },
});

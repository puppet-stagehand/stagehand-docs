import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir:
    process.env.STAGEHAND_SCALE_FIXTURES === '1'
      ? './.scale-dist'
      : process.env.STAGEHAND_E2E_FIXTURES === '1'
        ? './.e2e-dist'
        : './dist',
  site: 'https://www.puppet-stagehand.com/',
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
    build: {
      // This site's CSP is `script-src 'self'` with no `'unsafe-inline'`/nonce/hash
      // (infra/modules/static-site/cloudfront.tf). Vite's default asset-inlining
      // threshold (4096 bytes) applies to small built <script> chunks referenced from
      // page HTML, not just images/fonts — below that size it inlines the compiled JS
      // directly into the page as literal <script> content, which a strict CSP without
      // 'unsafe-inline' silently blocks at runtime with no build error (same failure
      // mode as `is:inline`, just triggered by chunk size instead of an explicit
      // directive). Disabling inlining entirely keeps every processed script an
      // external, same-origin `/assets/*.js` file, matching what this CSP requires.
      assetsInlineLimit: 0,
    },
  },
});

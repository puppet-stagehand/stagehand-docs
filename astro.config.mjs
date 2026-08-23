import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  outDir: process.env.STAGEHAND_E2E_FIXTURES === '1' ? './.e2e-dist' : './dist',
  site: 'https://www.puppetstagehand.com/',
  trailingSlash: 'always',
  build: { format: 'directory' },
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

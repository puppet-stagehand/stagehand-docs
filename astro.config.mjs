import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
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

import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://www.puppetstagehand.com/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const requiredOutputs = [
  'index.html',
  'tiers/index.html',
  'compatibility/index.html',
  'docs/index.html',
  'docs/getting-started/index.html',
  'docs/security/index.html',
  'support/index.html',
  'data/tiers.json',
  'data/compatibility.json',
  '404.html',
] as const;

const missing: string[] = [];
for (const output of requiredOutputs) {
  try {
    await access(resolve('dist', output));
  } catch {
    missing.push(output);
  }
}

if (missing.length > 0) {
  throw new Error(
    `Missing required built routes:\n${missing.map((path) => `- ${path}`).join('\n')}`,
  );
}

console.log(`Verified ${requiredOutputs.length} required built routes`);

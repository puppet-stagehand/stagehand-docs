import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const requiredOutputs = [
  'index.html',
  'features/index.html',
  'tiers/index.html',
  'compatibility/index.html',
  'docs/index.html',
  'docs/getting-started/index.html',
  'docs/security/index.html',
  'docs/first-run/index.html',
  'docs/installer-registry-distribution/index.html',
  'docs/installer-support/index.html',
  'docs/testers-guide/index.html',
  'docs/user-guide/index.html',
  'docs/why-stagehand/index.html',
  'docs/support/index.html',
  'downloads/index.html',
  'support/index.html',
  'data/compatibility.json',
  '404.html',
] as const;

const missing: string[] = [];
const buildRoot = resolve(process.argv[2] ?? 'dist');
for (const output of requiredOutputs) {
  try {
    const details = await stat(resolve(buildRoot, output));
    if (!details.isFile()) missing.push(output);
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

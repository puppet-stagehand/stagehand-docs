import { resolve } from 'node:path';
import { check, LinkState } from 'linkinator';
import { validateBuiltLinks } from './check-built-links';

const buildRoot = resolve(process.argv[2] ?? 'dist');

await validateBuiltLinks(buildRoot);

console.log(`→ crawling ${buildRoot}`);
const result = await check({
  path: buildRoot,
  recurse: true,
  linksToSkip: [
    '^https?://github\\.com/puppet-stagehand/stagehand-docs(?:$|[/?#])',
    '^https?://www\\.puppetstagehand\\.com(?:$|[/?#])',
  ],
});
const broken = result.links.filter(({ state }) => state === LinkState.BROKEN);
if (!result.passed || broken.length > 0) {
  throw new Error(
    `Broken internal generated links:\n${broken.map(({ url }) => `- ${url}`).join('\n')}`,
  );
}

const checked = result.links.filter(({ state }) => state !== LinkState.SKIPPED);
console.log(`Successfully scanned ${checked.length} internal generated links`);

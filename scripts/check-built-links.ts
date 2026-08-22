import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const allowedExternalLinks = new Set([
  'https://www.puppetstagehand.com/',
  'https://www.puppetstagehand.com/404.html',
  'https://www.puppetstagehand.com/compatibility/',
  'https://www.puppetstagehand.com/docs/',
  'https://www.puppetstagehand.com/docs/getting-started/',
  'https://www.puppetstagehand.com/docs/security/',
  'https://www.puppetstagehand.com/support/',
  'https://www.puppetstagehand.com/tiers/',
  'https://github.com/puppet-stagehand/stagehand-docs',
  'https://github.com/puppet-stagehand/stagehand-docs/issues',
  'https://github.com/puppet-stagehand/stagehand-docs/issues/new',
  'https://github.com/puppet-stagehand/stagehand-docs/security/advisories/new',
]);
const canonicalBase = new URL('https://www.puppetstagehand.com/');
const nonNetworkSchemes = new Set(['data:', 'mailto:', 'tel:']);

const htmlFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return htmlFiles(path);
      return extname(entry.name) === '.html' ? [path] : [];
    }),
  );
  return nested.flat();
};

const buildRoot = resolve(process.argv[2] ?? 'dist');
const externalLinks = new Map<string, string[]>();
const unsupportedLinks = new Map<string, string[]>();

const recordSource = (links: Map<string, string[]>, url: string, file: string) => {
  const sources = links.get(url) ?? [];
  sources.push(relative(process.cwd(), file));
  links.set(url, sources);
};

for (const file of await htmlFiles(buildRoot)) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/giu)) {
    const rawLink = (match[1] ?? match[2]).trim();
    if (!rawLink || rawLink.startsWith('#')) continue;

    const scheme = /^([a-z][a-z\d+.-]*):/iu.exec(rawLink)?.[1]?.toLowerCase();
    const protocolRelative = rawLink.startsWith('//');
    if (!protocolRelative && !scheme) continue;
    if (scheme && nonNetworkSchemes.has(`${scheme}:`)) continue;

    if (protocolRelative || scheme === 'http' || scheme === 'https') {
      try {
        recordSource(externalLinks, new URL(rawLink, canonicalBase).href, file);
      } catch {
        recordSource(unsupportedLinks, rawLink, file);
      }
      continue;
    }

    recordSource(unsupportedLinks, rawLink, file);
  }
}

const unapproved = [
  ...[...externalLinks].filter(([url]) => !allowedExternalLinks.has(url)),
  ...unsupportedLinks,
];
if (unapproved.length > 0) {
  throw new Error(
    `Unapproved external built links:\n${unapproved
      .map(([url, sources]) => `- ${url} (${sources.join(', ')})`)
      .join('\n')}`,
  );
}

console.log(`Verified ${externalLinks.size} exact external link targets`);

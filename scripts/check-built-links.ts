import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { parse, type DefaultTreeAdapterTypes } from 'parse5';

const allowedExternalLinks = new Set([
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

const recordSource = (links: Map<string, string[]>, url: string, file: string) => {
  const sources = links.get(url) ?? [];
  sources.push(relative(process.cwd(), file));
  links.set(url, sources);
};

const linkAttributes = (html: string): string[] => {
  const values: string[] = [];
  const visit = (node: DefaultTreeAdapterTypes.Node): void => {
    if ('attrs' in node) {
      for (const attribute of node.attrs) {
        if (attribute.name === 'href' || attribute.name === 'src') values.push(attribute.value);
      }
    }
    if ('childNodes' in node) {
      for (const child of node.childNodes) visit(child);
    }
    if ('content' in node) visit(node.content);
  };
  visit(parse(html));
  return values;
};

const canonicalOutput = (buildRoot: string, url: URL): string => {
  const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const output = path === '' || path.endsWith('/') ? join(path, 'index.html') : path;
  const resolvedOutput = resolve(buildRoot, output);
  if (resolvedOutput !== buildRoot && !resolvedOutput.startsWith(`${buildRoot}${sep}`)) {
    throw new Error('Canonical path escapes build root');
  }
  return resolvedOutput;
};

export const validateBuiltLinks = async (root = 'dist'): Promise<void> => {
  const buildRoot = resolve(root);
  const externalLinks = new Map<string, string[]>();
  const unsupportedLinks = new Map<string, string[]>();
  const canonicalLinks = new Map<string, string[]>();

  for (const file of await htmlFiles(buildRoot)) {
    const html = await readFile(file, 'utf8');
    for (const decodedLink of linkAttributes(html)) {
      const rawLink = decodedLink.trim();
      if (!rawLink || rawLink.startsWith('#')) continue;

      const scheme = /^([a-z][a-z\d+.-]*):/iu.exec(rawLink)?.[1]?.toLowerCase();
      const protocolRelative = rawLink.startsWith('//');
      if (!protocolRelative && !scheme) continue;
      if (scheme && nonNetworkSchemes.has(`${scheme}:`)) continue;

      if (protocolRelative || scheme === 'http' || scheme === 'https') {
        try {
          const url = new URL(rawLink, canonicalBase);
          if (url.origin === canonicalBase.origin) {
            recordSource(canonicalLinks, url.href, file);
          } else {
            recordSource(externalLinks, url.href, file);
          }
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

  const brokenCanonical: Array<[string, string[]]> = [];
  for (const [url, sources] of canonicalLinks) {
    try {
      await access(canonicalOutput(buildRoot, new URL(url)));
    } catch {
      brokenCanonical.push([url, sources]);
    }
  }
  if (brokenCanonical.length > 0) {
    throw new Error(
      `Broken canonical first-party built links:\n${brokenCanonical
        .map(([url, sources]) => `- ${url} (${sources.join(', ')})`)
        .join('\n')}`,
    );
  }

  console.log(`Verified ${externalLinks.size} exact external link targets`);
  console.log(`Verified ${canonicalLinks.size} canonical first-party link targets locally`);
};

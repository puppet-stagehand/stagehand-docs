import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { loadCompatibility } from '../src/lib/data/compatibility';

const allowedNonClaimLinks = new Set([
  'https://github.com/puppet-stagehand/stagehand-docs',
  'https://github.com/puppet-stagehand/stagehand-docs/issues',
  'https://github.com/puppet-stagehand/stagehand-docs/issues/new',
  'https://github.com/puppet-stagehand/stagehand-docs/security/advisories/new',
  'https://github.com/puppet-stagehand/stagehand-release/issues',
  'https://github.com/puppet-stagehand/stagehand-release/releases',
  'https://help.puppet.com/bolt/current/topics/bolt_installing.htm',
]);
const canonicalBase = new URL('https://www.puppet-stagehand.com/');
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
  // scriptingEnabled: false so <noscript> fallback content (e.g. /downloads/'s manual GitHub
  // link) is parsed as real child nodes instead of opaque raw text (parse5's JS-enabled default,
  // which mirrors what a browser with JS enabled does) — otherwise links inside <noscript> are
  // invisible to this checker (WR-01, 04.2-REVIEW.md).
  visit(parse(html, { scriptingEnabled: false }));
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

const canonicalDocumentUrl = (buildRoot: string, file: string): URL => {
  const generatedPath = relative(buildRoot, file).split(sep).join('/');
  const pathname =
    generatedPath === 'index.html'
      ? '/'
      : generatedPath.endsWith('/index.html')
        ? `/${generatedPath.slice(0, -'index.html'.length)}`
        : `/${generatedPath}`;
  return new URL(pathname, canonicalBase);
};

export const validateBuiltLinks = async (root = 'dist'): Promise<string[]> => {
  const buildRoot = resolve(root);
  const allowedEvidenceLinks = new Set(
    loadCompatibility().map((record) => new URL(record.evidence_url).href),
  );
  const externalLinks = new Map<string, string[]>();
  const unsupportedLinks = new Map<string, string[]>();
  const canonicalLinks = new Map<string, string[]>();

  for (const file of await htmlFiles(buildRoot)) {
    const html = await readFile(file, 'utf8');
    const sourceDocument = canonicalDocumentUrl(buildRoot, file);
    for (const decodedLink of linkAttributes(html)) {
      if (decodedLink === '') continue;

      let url: URL;
      try {
        url = new URL(decodedLink, sourceDocument);
      } catch {
        recordSource(unsupportedLinks, decodedLink, file);
        continue;
      }

      if (nonNetworkSchemes.has(url.protocol)) continue;
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        recordSource(unsupportedLinks, url.href, file);
        continue;
      }

      if (url.origin === canonicalBase.origin) {
        recordSource(canonicalLinks, url.href, file);
      } else {
        recordSource(externalLinks, url.href, file);
      }
    }
  }

  const unapproved = [
    ...[...externalLinks].filter(
      ([url]) => !allowedNonClaimLinks.has(url) && !allowedEvidenceLinks.has(url),
    ),
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
  return [...externalLinks.keys()];
};

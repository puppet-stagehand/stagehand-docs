import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface DocsFrontmatter {
  description?: unknown;
  order?: unknown;
}

const docsDirectory = resolve(import.meta.dirname, '../../src/content/docs');

function loadDocsFrontmatter() {
  return readdirSync(docsDirectory)
    .filter((filename) => extname(filename) === '.md')
    .map((filename) => {
      const source = readFileSync(resolve(docsDirectory, filename), 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);

      if (!match) {
        throw new Error(`${filename} does not contain YAML frontmatter`);
      }

      return {
        slug: basename(filename, '.md'),
        data: parse(match[1]) as DocsFrontmatter,
      };
    });
}

describe('docs collection source', () => {
  it('defines the required entries with descriptions and unique positive order values', () => {
    const entries = loadDocsFrontmatter();
    const orders = entries.map(({ data }) => data.order);

    expect(entries.map(({ slug }) => slug).sort()).toEqual([
      'first-run',
      'getting-started',
      'security',
    ]);
    expect(entries.every(({ data }) => typeof data.description === 'string')).toBe(true);
    expect(entries.every(({ data }) => String(data.description).trim().length > 0)).toBe(true);
    expect(orders.every((order) => Number.isInteger(order) && Number(order) > 0)).toBe(true);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

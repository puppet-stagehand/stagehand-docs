import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Tier } from './types';
import { loadYaml } from './load-yaml';

interface TierDocument {
  schema_version: 1;
  tiers: Tier[];
}

const dataPath = fileURLToPath(new URL('../../data/tiers.yaml', import.meta.url));
const schemaPath = fileURLToPath(new URL('../../data/schema/tiers.schema.json', import.meta.url));

export const loadTiers = (): Tier[] =>
  loadYaml<TierDocument>(dataPath, JSON.parse(readFileSync(schemaPath, 'utf8')), 'tier').tiers;

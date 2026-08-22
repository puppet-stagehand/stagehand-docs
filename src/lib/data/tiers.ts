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
const requiredTierIds: Tier['id'][] = [
  'openvox',
  'puppet-core',
  'puppet-enterprise',
  'pe-advanced',
];

const assertExactTierSet = (tiers: Tier[], source: string): void => {
  for (const id of requiredTierIds) {
    const count = tiers.filter((tier) => tier.id === id).length;
    if (count === 0) {
      throw new Error(`Tier registry is missing required tier ID ${id} in ${source}`);
    }
    if (count > 1) {
      throw new Error(`Tier registry has duplicate tier ID ${id} in ${source}`);
    }
  }
};

export const loadTiers = (path = dataPath): Tier[] => {
  const tiers = loadYaml<TierDocument>(
    path,
    JSON.parse(readFileSync(schemaPath, 'utf8')),
    'tier',
  ).tiers;
  assertExactTierSet(tiers, path);
  return tiers;
};

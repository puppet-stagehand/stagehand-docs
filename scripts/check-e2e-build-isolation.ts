import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { identityOf } from '../src/lib/data/compatibility';
import type { CompatibilityRecord } from '../src/lib/data/types';

interface LeakCheckRecord {
  id: string;
  platform: string;
  puppet_versions: string;
  tier: CompatibilityRecord['tier'];
  provider: string;
  transport: string;
}

interface CompatibilityOutput {
  schema_version: number;
  records: LeakCheckRecord[];
}

const asLeakCheckRecord = (value: unknown, source: string): LeakCheckRecord => {
  if (typeof value !== 'object' || value === null || typeof (value as { id?: unknown }).id !== 'string') {
    throw new Error(`Invalid compatibility record in ${source}`);
  }
  const record = value as Record<string, unknown>;
  const stringOrEmpty = (field: unknown): string => (typeof field === 'string' ? field : '');
  return {
    id: record.id as string,
    platform: stringOrEmpty(record.platform),
    puppet_versions: stringOrEmpty(record.puppet_versions),
    tier: stringOrEmpty(record.tier) as CompatibilityRecord['tier'],
    provider: stringOrEmpty(record.provider),
    transport: stringOrEmpty(record.transport),
  };
};

const readCompatibilityOutput = async (root: string): Promise<CompatibilityOutput> => {
  const path = resolve(root, 'data/compatibility.json');
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schema_version' in value) ||
    value.schema_version !== 1 ||
    !('records' in value) ||
    !Array.isArray(value.records)
  ) {
    throw new Error(`Invalid compatibility output: ${path}`);
  }
  return {
    schema_version: value.schema_version,
    records: value.records.map((entry) => asLeakCheckRecord(entry, path)),
  };
};

const fixtureSources = [
  resolve(process.cwd(), 'tests/fixtures/data/compatibility-e2e.yaml'),
  resolve(process.cwd(), 'tests/fixtures/data/compatibility-scale.yaml'),
];

const loadForbiddenSets = async (): Promise<{
  forbiddenIds: Set<string>;
  forbiddenIdentities: Set<string>;
}> => {
  const forbiddenIds = new Set<string>();
  const forbiddenIdentities = new Set<string>();
  for (const path of fixtureSources) {
    const document = parse(await readFile(path, 'utf8')) as { records: LeakCheckRecord[] };
    for (const record of document.records) {
      forbiddenIds.add(record.id);
      forbiddenIdentities.add(identityOf(record));
    }
  }
  return { forbiddenIds, forbiddenIdentities };
};

const productionRoot = process.argv[2] ?? 'dist';
const e2eRoot = process.argv[3] ?? '.e2e-dist';
const scaleRoot = process.argv[4] ?? '.scale-dist';
const production = await readCompatibilityOutput(productionRoot);
const e2e = await readCompatibilityOutput(e2eRoot);
const scale = await readCompatibilityOutput(scaleRoot);

const { forbiddenIds, forbiddenIdentities } = await loadForbiddenSets();
const leaked = production.records.filter(
  (record) => forbiddenIds.has(record.id) || forbiddenIdentities.has(identityOf(record)),
);
if (leaked.length > 0) {
  throw new Error(
    `Production compatibility output contains ${leaked.length} fixture-derived record(s): ${leaked
      .map((record) => record.id)
      .join(', ')}`,
  );
}
if (e2e.records.length !== 5) {
  throw new Error(`E2E compatibility output must contain 5 fixtures, found ${e2e.records.length}`);
}
if (scale.records.length < 24) {
  throw new Error(
    `Scale compatibility output must contain at least 24 fixtures, found ${scale.records.length}`,
  );
}

console.log(
  `Verified isolated compatibility outputs: production=${production.records.length} (0 fixture-derived), e2e=${e2e.records.length}, scale=${scale.records.length}`,
);

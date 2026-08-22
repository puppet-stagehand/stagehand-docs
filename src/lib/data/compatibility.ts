import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CompatibilityRecord } from './types';
import { loadYaml } from './load-yaml';
import { loadTiers } from './tiers';

interface CompatibilityDocument {
  schema_version: 1;
  records: CompatibilityRecord[];
}

export interface LoadCompatibilityOptions {
  today?: Date;
  path?: string;
  tiersPath?: string;
}

const sourceDataPath = (moduleRelativePath: string, projectRelativePath: string): string => {
  const modulePath = fileURLToPath(new URL(moduleRelativePath, import.meta.url));
  return existsSync(modulePath) ? modulePath : resolve(process.cwd(), projectRelativePath);
};

const dataPath = sourceDataPath('../../data/compatibility.yaml', 'src/data/compatibility.yaml');
const schemaPath = sourceDataPath(
  '../../data/schema/compatibility.schema.json',
  'src/data/schema/compatibility.schema.json',
);

const identityOf = (record: CompatibilityRecord) =>
  [record.platform, record.puppet_versions, record.tier, record.provider, record.transport].join(
    '|',
  );

const utcDate = (value: string, source: string, recordId: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match)
    throw new Error(`Invalid last_verified for compatibility record ${recordId} in ${source}`);

  const [, year, month, day] = match;
  const date = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const timestamp = new Date(date);
  if (
    timestamp.getUTCFullYear() !== Number(year) ||
    timestamp.getUTCMonth() !== Number(month) - 1 ||
    timestamp.getUTCDate() !== Number(day)
  ) {
    throw new Error(`Invalid last_verified for compatibility record ${recordId} in ${source}`);
  }
  return date;
};

const utcToday = (today: Date): number =>
  Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

export const loadCompatibility = (
  options: LoadCompatibilityOptions = {},
): CompatibilityRecord[] => {
  const source = options.path ?? dataPath;
  const document = loadYaml<CompatibilityDocument>(
    source,
    JSON.parse(readFileSync(schemaPath, 'utf8')),
    'compatibility',
  );
  const validTiers = new Set(loadTiers(options.tiersPath).map((tier) => tier.id));
  const recordIds = new Set<string>();
  const identities = new Set<string>();
  const currentDay = utcToday(options.today ?? new Date());

  for (const record of document.records) {
    if (recordIds.has(record.id)) {
      throw new Error(
        `Duplicate compatibility record ID ${record.id}; record IDs must be unique in ${source}`,
      );
    }
    recordIds.add(record.id);

    if (!validTiers.has(record.tier)) {
      throw new Error(
        `Unknown tier ${record.tier} for compatibility record ${record.id} in ${source}`,
      );
    }
    if (new URL(record.evidence_url).protocol !== 'https:') {
      throw new Error(
        `Compatibility evidence_url must use HTTPS for record ${record.id} in ${source}`,
      );
    }

    const identity = identityOf(record);
    if (identities.has(identity)) {
      throw new Error(`Duplicate compatibility record ${identity} in ${source}`);
    }
    identities.add(identity);

    const verifiedDay = utcDate(record.last_verified, source, record.id);
    if (verifiedDay > currentDay) {
      throw new Error(
        `Compatibility evidence has a future last_verified date for record ${record.id} in ${source}`,
      );
    }
    if ((currentDay - verifiedDay) / 86_400_000 > 365) {
      throw new Error(
        `Compatibility evidence is older than 365 days for record ${record.id} in ${source}`,
      );
    }
  }

  return [...document.records].sort(
    (left, right) =>
      left.platform.localeCompare(right.platform, 'en') ||
      left.puppet_versions.localeCompare(right.puppet_versions, 'en') ||
      left.tier.localeCompare(right.tier, 'en'),
  );
};

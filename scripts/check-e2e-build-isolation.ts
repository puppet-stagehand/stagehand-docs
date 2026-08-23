import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface CompatibilityOutput {
  schema_version: number;
  records: unknown[];
}

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
  return value as CompatibilityOutput;
};

const productionRoot = process.argv[2] ?? 'dist';
const e2eRoot = process.argv[3] ?? '.e2e-dist';
const production = await readCompatibilityOutput(productionRoot);
const e2e = await readCompatibilityOutput(e2eRoot);

if (production.records.length !== 0) {
  throw new Error(
    `Production compatibility output must be empty, found ${production.records.length}`,
  );
}
if (e2e.records.length !== 5) {
  throw new Error(`E2E compatibility output must contain 5 fixtures, found ${e2e.records.length}`);
}

console.log(
  `Verified isolated compatibility outputs: production=${production.records.length}, e2e=${e2e.records.length}`,
);

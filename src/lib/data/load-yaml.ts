import { readFileSync } from 'node:fs';
import Ajv2020, { type AnySchema, type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const describeErrors = (errors: ErrorObject[] | null | undefined) =>
  (errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');

export const loadYaml = <T>(path: string, schema: AnySchema, label: string): T => {
  let parsed: unknown;

  try {
    parsed = parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${label} data from ${path}: ${(error as Error).message}`);
  }

  const validate = ajv.compile(schema);
  if (!validate(parsed)) {
    throw new Error(`Invalid ${label} data in ${path}: ${describeErrors(validate.errors)}`);
  }

  return parsed as T;
};

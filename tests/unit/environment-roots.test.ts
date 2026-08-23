import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const environments = {
  testpilots: 'testpilots.puppetstagehand.com',
  beta: 'beta.puppetstagehand.com',
  stable: 'www.puppetstagehand.com',
} as const;

const readRoot = (environment: keyof typeof environments) =>
  readFileSync(
    resolve(import.meta.dirname, `../../infra/environments/${environment}/main.tf`),
    'utf8',
  );

describe('OpenTofu environment roots', () => {
  it.each(Object.entries(environments))(
    'maps %s to its literal hostname and environment',
    (environment, domainName) => {
      const root = readRoot(environment as keyof typeof environments);

      expect(root).toMatch(new RegExp(`environment\\s+=\\s+"${environment}"`, 'u'));
      expect(root).toMatch(
        new RegExp(`domain_name\\s+=\\s+"${domainName.replaceAll('.', '\\.')}"`, 'u'),
      );
    },
  );

  it('enables the apex alternate name and redirect only in stable', () => {
    const stable = readRoot('stable');

    expect(stable).toMatch(/alternate_domain_names\s+=\s+\["puppetstagehand\.com"\]/u);
    expect(stable).toMatch(/enable_apex_redirect\s+=\s+true/u);

    for (const environment of ['testpilots', 'beta'] as const) {
      const root = readRoot(environment);
      expect(root).toMatch(/alternate_domain_names\s+=\s+\[\]/u);
      expect(root).toMatch(/enable_apex_redirect\s+=\s+false/u);
      expect(root).not.toContain('"puppetstagehand.com"');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { loadCompatibility } from '../../src/lib/data/compatibility';
import { loadTiers } from '../../src/lib/data/tiers';

const fixture = (name: string) => new URL(`../fixtures/data/${name}`, import.meta.url).pathname;

describe('compatibility data validation', () => {
  it('normalizes a valid compatibility claim from a real YAML file', () => {
    // Catches a production change that returns raw YAML documents rather than validated records.
    expect(
      loadCompatibility({
        path: fixture('compatibility-valid.yaml'),
        today: new Date('2026-08-22T00:00:00.000Z'),
      }),
    ).toEqual([
      {
        id: 'aws-ec2-openvox',
        platform: 'AWS EC2',
        puppet_versions: '>= 8.0 < 9.0',
        stagehand_versions: '>= 0.1 < 0.2',
        tier: 'openvox',
        provider: 'aws',
        transport: 'ssh',
        operating_systems: ['Ubuntu 24.04'],
        status: 'supported',
        limitations: [],
        docs_path: '/docs/platforms/aws-ec2/',
        evidence_url: 'https://example.com/evidence/aws-ec2-openvox',
        last_verified: '2026-08-22',
      },
    ]);
  });

  it('rejects duplicate platform-version-tier-provider-transport identities', () => {
    // Catches removing the unique customer-claim identity guard.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-duplicate.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Duplicate compatibility record');
  });

  it('rejects duplicate compatibility record IDs', () => {
    // Catches two distinct claims sharing the stable DOM/filter identity and undercounting results.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-duplicate-id.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Duplicate compatibility record ID shared-record-id; record IDs must be unique');
  });

  it('rejects evidence older than 365 UTC calendar days', () => {
    // Catches treating stale customer claims as current.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-stale.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Compatibility evidence is older than 365 days');
  });

  it('accepts evidence verified exactly 365 UTC calendar days ago', () => {
    // Catches changing the policy from older than 365 days to 365 days or older.
    expect(
      loadCompatibility({
        path: fixture('compatibility-age-boundary.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toHaveLength(1);
  });

  it('rejects evidence verified on a future UTC date', () => {
    // Catches treating future-dated evidence as fresh.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-future.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('future last_verified date');
  });

  it('rejects an injected tier registry before an invalid join can be evaluated', () => {
    // Catches allowing a compatibility join against a registry missing an exact required ID.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-valid.yaml'),
        tiersPath: fixture('tiers-without-openvox.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Tier registry is missing required tier ID openvox');
  });

  it('rejects malformed compatibility fields', () => {
    // Catches accepting an unknown support status.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-invalid.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Invalid compatibility data');
  });

  it('rejects unknown compatibility fields', () => {
    // Catches relaxing the closed compatibility-record schema.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-unknown-field.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('Invalid compatibility data');
  });

  it('rejects non-HTTPS evidence URLs', () => {
    // Catches accepting evidence that is not primary HTTPS evidence.
    expect(() =>
      loadCompatibility({
        path: fixture('compatibility-non-https.yaml'),
        today: new Date('2026-08-22Z'),
      }),
    ).toThrow('must use HTTPS');
  });

  it('sorts records by platform, Puppet version expression, then tier', () => {
    // Catches preserving YAML insertion order rather than stable customer-facing ordering.
    expect(
      loadCompatibility({
        path: fixture('compatibility-sorted.yaml'),
        today: new Date('2026-08-22Z'),
      }).map((record) => record.id),
    ).toEqual(['alpha-puppet-8-core', 'alpha-puppet-8-pe', 'alpha-puppet-9', 'zeta']);
  });
});

describe('tier data validation', () => {
  it('loads the four defined customer categories', () => {
    // Catches returning a YAML wrapper or omitting a customer category.
    expect(loadTiers().map((tier) => tier.id)).toEqual([
      'openvox',
      'puppet-core',
      'puppet-enterprise',
      'pe-advanced',
    ]);
  });

  it('rejects a real tier registry that omits a required customer category', () => {
    // Catches allowing a registry that silently drops a supported tier ID.
    expect(() => loadTiers(fixture('tiers-omitted.yaml'))).toThrow(
      'Tier registry is missing required tier ID pe-advanced',
    );
  });

  it('rejects a real tier registry that defines a customer category twice', () => {
    // Catches allowing ambiguous compatibility joins for a duplicated tier ID.
    expect(() => loadTiers(fixture('tiers-duplicate.yaml'))).toThrow(
      'Tier registry has duplicate tier ID openvox',
    );
  });
});

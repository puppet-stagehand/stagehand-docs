import { describe, expect, it } from 'vitest';
import { GET as getCompatibility } from '../../src/pages/data/compatibility.json';
import { GET as getTiers } from '../../src/pages/data/tiers.json';

const expectedTiers = [
  {
    id: 'openvox',
    name: 'OpenVox',
    audience: 'Community users',
    entitlement: 'community',
    summary: 'Community-oriented deployments using OpenVox.',
    features: ['Community deployment guidance'],
  },
  {
    id: 'puppet-core',
    name: 'Puppet Core',
    audience: 'Puppet Core users',
    entitlement: 'commercial',
    summary: 'Commercial Puppet Core deployments.',
    features: ['Core deployment guidance'],
  },
  {
    id: 'puppet-enterprise',
    name: 'Puppet Enterprise',
    audience: 'Puppet Enterprise users',
    entitlement: 'commercial',
    summary: 'Puppet Enterprise deployments.',
    features: ['Enterprise deployment guidance'],
  },
  {
    id: 'pe-advanced',
    name: 'Puppet Enterprise Advanced',
    audience: 'Advanced Puppet Enterprise users',
    entitlement: 'advanced',
    summary: 'Advanced Puppet Enterprise deployments.',
    features: ['Advanced deployment guidance'],
  },
];

describe('GET /data/tiers.json', () => {
  it('returns the real tier registry in the deterministic download contract', async () => {
    // Catches serving a wrapper, build timestamp, partial registry, wrong MIME type, or unstable bytes.
    const response = getTiers();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toBe(
      `${JSON.stringify({ schema_version: 1, generated_at: null, records: expectedTiers }, null, 2)}\n`,
    );
  });
});

describe('GET /data/compatibility.json', () => {
  it('returns an honest empty production registry in the deterministic download contract', async () => {
    // Catches invented compatibility claims, build timestamps, wrong MIME type, or unstable bytes.
    const response = getCompatibility();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toBe(
      `${JSON.stringify({ schema_version: 1, generated_at: null, records: [] }, null, 2)}\n`,
    );
  });
});

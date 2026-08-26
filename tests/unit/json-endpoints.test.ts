import { describe, expect, it } from 'vitest';
import { loadCompatibility } from '../../src/lib/data/compatibility';
import { GET as getCompatibility } from '../../src/pages/data/compatibility.json';
import { GET as getTiers } from '../../src/pages/data/tiers.json';

const expectedTiers = [
  {
    id: 'openvox',
    name: 'OpenVox',
    audience:
      'OpenVox operators running the community-governed, open-source continuation of Puppet',
    entitlement: 'community',
    summary:
      'OpenVox is the community-governed, open-source continuation of Puppet — the free path for operators managing their own environment without a commercial support contract.',
    features: [
      'Environment visibility and Bolt-native execution guidance for OpenVox deployments, the same as every other tier',
      'Support routed through the public Stagehand Docs issue tracker for documentation and reproducible defects',
    ],
  },
  {
    id: 'puppet-core',
    name: 'Puppet Core',
    audience: "Puppet Core customers running Puppet's foundational commercial-adjacent product",
    entitlement: 'commercial',
    summary:
      "Puppet Core is Puppet's foundational commercial-adjacent product — core Puppet without Puppet Enterprise's console, role-based access control, and orchestration reporting layer.",
    features: [
      'Environment visibility and Bolt-native execution guidance for Puppet Core deployments, the same as every other tier',
      'Support routed through your own commercial support channel, per your Puppet agreement',
    ],
  },
  {
    id: 'puppet-enterprise',
    name: 'Puppet Enterprise',
    audience: "Puppet Enterprise customers running Puppet's commercial platform",
    entitlement: 'commercial',
    summary:
      "Puppet Enterprise is Puppet's commercial platform — core Puppet plus a console, role-based access control, and orchestration reporting.",
    features: [
      'Environment visibility and Bolt-native execution guidance for Puppet Enterprise deployments, the same as every other tier',
      'Support routed through your own commercial support channel, per your Puppet agreement',
    ],
  },
  {
    id: 'pe-advanced',
    name: 'Puppet Enterprise Advanced',
    audience: "PE Advanced customers on Puppet Enterprise's higher package tier",
    entitlement: 'advanced',
    summary:
      'PE Advanced is the higher Puppet Enterprise package tier, built on the same Puppet Enterprise platform.',
    features: [
      'Environment visibility and Bolt-native execution guidance for PE Advanced deployments, the same as every other tier',
      'Support routed through your own commercial support channel, per your Puppet agreement',
    ],
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
  it('returns the real compatibility registry in the deterministic download contract', async () => {
    // Catches a wrapper response, a build timestamp, or a mismatch between the JSON endpoint and
    // loadCompatibility()'s own output — not just the register being empty.
    const expectedRecords = loadCompatibility();
    const response = getCompatibility();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toBe(
      `${JSON.stringify({ schema_version: 1, generated_at: null, records: expectedRecords }, null, 2)}\n`,
    );
  });
});

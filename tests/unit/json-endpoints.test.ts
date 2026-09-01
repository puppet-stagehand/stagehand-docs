import { describe, expect, it } from 'vitest';
import { loadCompatibility } from '../../src/lib/data/compatibility';
import { GET as getCompatibility } from '../../src/pages/data/compatibility.json';

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

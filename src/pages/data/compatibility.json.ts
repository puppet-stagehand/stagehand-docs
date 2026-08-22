import type { APIRoute } from 'astro';
import { loadCompatibility } from '../../lib/data/compatibility';

export const GET = (() =>
  new Response(
    `${JSON.stringify(
      { schema_version: 1, generated_at: null, records: loadCompatibility() },
      null,
      2,
    )}\n`,
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  )) satisfies APIRoute;

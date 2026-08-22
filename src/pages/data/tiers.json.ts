import type { APIRoute } from 'astro';
import { loadTiers } from '../../lib/data/tiers';

export const GET = (() =>
  new Response(
    `${JSON.stringify({ schema_version: 1, generated_at: null, records: loadTiers() }, null, 2)}\n`,
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  )) satisfies APIRoute;

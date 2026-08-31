import type { APIRoute } from 'astro';
import { loadDownloads } from '../../lib/data/downloads';

export const GET = (async () =>
  new Response(
    `${JSON.stringify({ schema_version: 1, channels: await loadDownloads() }, null, 2)}\n`,
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  )) satisfies APIRoute;

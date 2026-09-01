import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    order: z.number().int().positive(),
    updated: z.coerce.date().optional(),
    visibleOn: z.array(z.enum(['testpilots', 'beta', 'stable'])).optional(),
    // Groups a page under one of the docs index/sidebar's three sections. Omitted entirely for
    // why-stagehand.md, which is promoted to the top nav and deliberately excluded from this
    // grouping (and from the prev/next pagination chain — see docs/[...slug].astro).
    category: z.enum(['installing', 'guide', 'support']).optional(),
  }),
});

export const collections = { docs };

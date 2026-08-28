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
  }),
});

export const collections = { docs };

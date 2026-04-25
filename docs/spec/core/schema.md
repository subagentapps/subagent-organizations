# `src/core/schema.ts`

Zod schemas mirroring the runtime shape of `Resource` and its subclasses. Used by `manifest/load.ts` to validate `packages.json` at parse time.

## Shape

```ts
import { z } from 'zod';

export const RepoSchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

export const ResourceBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  repo: RepoSchema,
  ref: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const ZshPluginSchema = ResourceBaseSchema.extend({
  kind: z.literal('zsh-plugin'),
  manager: z.enum(['antidote', 'zinit']).optional(),
});

export const TerminalSchema = ResourceBaseSchema.extend({
  kind: z.literal('terminal'),
  brewCask: z.string().optional(),
});

export const ClaudeSkillSchema = ResourceBaseSchema.extend({
  kind: z.literal('claude-skill'),
  marketplace: z.string().optional(),
});

// …one schema per primitive…

export const ResourceSchema = z.discriminatedUnion('kind', [
  ZshPluginSchema,
  TerminalSchema,
  ClaudeSkillSchema,
  // …
]);

export const ManifestSchema = z.object({
  terminal:        z.array(ResourceSchema),
  zsh:             z.array(ResourceSchema),
  'claude-code':   z.array(ResourceSchema),
  'awesome-lists': z.array(ResourceSchema),
});
```

## Invariants

- A schema is added for every new primitive in lockstep with `kind.ts`.
- `manifest/load.ts` uses `ManifestSchema.parse()` and refuses to construct a `Manifest` if validation fails.

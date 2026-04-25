# `src/manifest/load.ts`

Load `src/data/packages.json`, validate against `ManifestSchema`, hydrate into typed `Resource` instances.

## Shape

```ts
import type { Manifest } from '../core/manifest.js';

export interface LoadOptions {
  path?: string;             // default: 'src/data/packages.json'
  strict?: boolean;          // default: true (fail on schema mismatch)
}

export function load(opts?: LoadOptions): Manifest;

export class ManifestParseError extends Error {
  constructor(public readonly issues: ReadonlyArray<{ path: string; message: string }>);
}
```

## Behavior

1. Read JSON from disk (or `import.meta.url`-resolved bundled JSON when running from `dist/`).
2. Run through `ManifestSchema.parse()` — throws `ManifestParseError` with Zod issues on failure.
3. Map each entry to its concrete `Resource` subclass via `kind` discriminator.
4. Verify global uniqueness of `id` across categories.

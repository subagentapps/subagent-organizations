# `src/manifest/sync.ts`

Optional helper to clone any subset of resources into `./vendor/` for local source inspection.
**`vendor/` is gitignored** — this is for ad-hoc reading, not vendoring.

## Shape

```ts
import type { Manifest } from '../core/manifest.js';
import type { Resource } from '../core/resource.js';

export interface SyncOptions {
  outDir?: string;                // default: './vendor'
  filter?: (r: Resource) => boolean;
  shallow?: boolean;              // default: true (--depth 1)
  concurrency?: number;           // default: 4
}

export interface SyncResult {
  cloned: ReadonlyArray<{ id: string; path: string }>;
  skipped: ReadonlyArray<{ id: string; reason: string }>;
  failed:  ReadonlyArray<{ id: string; error: string }>;
}

export async function sync(m: Manifest, opts?: SyncOptions): Promise<SyncResult>;
```

## Behavior

- Iterates filtered resources, runs `git clone --depth 1 --branch <ref> https://github.com/<repo>` into `outDir/<id>`.
- Skips entries with `kind: 'reference-only'` (e.g. AwesomeList) by default unless explicitly filtered in.
- Concurrent up to `concurrency`; aggregates errors instead of failing fast.

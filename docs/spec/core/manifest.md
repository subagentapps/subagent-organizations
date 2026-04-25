# `src/core/manifest.ts`

Typed collection of `Resource` instances grouped by category.

## Shape

```ts
import type { Resource } from './resource.js';

export type Category =
  | 'terminal'
  | 'zsh'
  | 'claude-code'
  | 'awesome-lists';

export type Manifest = {
  readonly [K in Category]: ReadonlyArray<Resource>;
};

export function flatten(m: Manifest): ReadonlyArray<Resource>;
export function byKind(m: Manifest, kind: ResourceKind): ReadonlyArray<Resource>;
export function byId(m: Manifest, id: string): Resource | undefined;
```

## Invariants

- All `id`s are globally unique across categories.
- Categories with zero resources are still keyed (empty array), never missing.

# `src/core/resource.ts`

Abstract base class every primitive extends. Defines the shape of a referenced package.

## Imports & exports

```ts
import type { ResourceKind } from './kind.js';
import type { InstallDirective } from '../directives/installable.js';

export abstract class Resource { /* … */ }
export interface ResourceArgs { /* … */ }
```

## Shape

```ts
export interface ResourceArgs {
  id: string;          // stable slug, e.g. "antidote"
  name: string;        // human name, e.g. "Antidote"
  repo: string;        // "owner/name" on GitHub
  ref?: string;        // tag, branch, or 40-char SHA
  description?: string;
}

export abstract class Resource {
  abstract readonly kind: ResourceKind;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly repo: string,
    public readonly ref?: string,
    public readonly description?: string,
  );

  /** GitHub URL derived from `repo`. */
  get url(): string;

  /** How to install this resource on a fresh machine. */
  abstract install(): InstallDirective;

  /** Markdown bullet for REFERENCES.md. Optional override. */
  toMarkdown(): string;
}
```

## Invariants

- `id` is unique within a `Manifest` regardless of `kind`.
- `repo` matches `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`.
- `ref` if present is non-empty.

## Subclasses

See `src/primitives/*.ts` for the eight concrete subclasses currently planned.

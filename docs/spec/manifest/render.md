# `src/manifest/render.ts`

Render a `Manifest` into a human-readable Markdown document (`REFERENCES.md`).

## Shape

```ts
import type { Manifest } from '../core/manifest.js';

export interface RenderOptions {
  /** Title at the top of REFERENCES.md. */
  title?: string;
  /** Group order — defaults to insertion order on `Manifest`. */
  categoryOrder?: ReadonlyArray<keyof Manifest>;
  /** Include each Resource's install directive as an admonition. */
  includeInstall?: boolean;
}

export function render(m: Manifest, opts?: RenderOptions): string;

export function writeReferences(m: Manifest, outPath?: string): void;
```

## Output format (sketch)

```markdown
# REFERENCES

Generated from `src/data/packages.json`. Do not edit by hand.

## Terminal

- **[ghostty](https://github.com/ghostty-org/ghostty)** `v1.3.1` — fallback
  > Install: `brew install --cask ghostty`

- **[cmux](https://github.com/manaflow-ai/cmux)** `v0.63.2` — current
  > Install: `brew install --cask cmux`

## Zsh

- **[antidote](https://github.com/mattmc3/antidote)** `v1.9.7`
  > Install: `brew install antidote`

…
```

## Invariants

- Output is deterministic — sort within each category by `id` so diffs stay clean.
- Every `kind` in `RESOURCE_KINDS` must be handled (compile-time exhaustiveness check).

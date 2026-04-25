# `src/directives/installable.ts`

The `InstallDirective` type — the discriminated union returned by every `Resource.install()`.

## Shape

```ts
export type InstallDirective =
  | { kind: 'homebrew-cask';    cask: string }
  | { kind: 'homebrew-formula'; formula: string; tap?: string }
  | { kind: 'antidote-bundle';  entry: string }
  | { kind: 'claude-plugin';    command: string }
  | { kind: 'settings-hook-merge'; settingsPath: string; payload: unknown }
  | { kind: 'uv-tool';          pkg: string }
  | { kind: 'npm-global';       pkg: string }
  | { kind: 'cargo';            crate: string }
  | { kind: 'reference-only' };

export function describe(d: InstallDirective): string;     // human-readable one-liner
```

## Invariants

- Adding a new install method extends this union; `manifest/render.ts` is forced (by the compiler) to handle it via exhaustive switch.

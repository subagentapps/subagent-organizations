# `src/core/kind.ts`

Discriminated-union tag for every primitive. The `kind` field on `Resource` narrows to one of these.

## Shape

```ts
export type ResourceKind =
  | 'terminal'
  | 'zsh-plugin'
  | 'claude-skill'
  | 'claude-hook'
  | 'claude-tool'
  | 'claude-statusline'
  | 'claude-subagent'
  | 'awesome-list';

export const RESOURCE_KINDS: ReadonlyArray<ResourceKind>;

export function isResourceKind(x: unknown): x is ResourceKind;
```

## Invariants

- Adding a new primitive *must* extend this union and `RESOURCE_KINDS`. The compiler then forces `manifest/render.ts` and `manifest/load.ts` to handle it.

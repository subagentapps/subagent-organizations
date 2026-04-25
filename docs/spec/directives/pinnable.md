# `src/directives/pinnable.ts`

Rules for what a valid `ref` looks like — semver tag, branch, or commit SHA.

## Shape

```ts
export type Pin =
  | { kind: 'tag';    value: string }     // e.g. "v1.3.1"
  | { kind: 'branch'; value: string }     // e.g. "main"
  | { kind: 'sha';    value: string };    // 7-40 hex chars

export function classifyPin(ref: string): Pin;

export function isStable(p: Pin): boolean;       // tag or full SHA → true
export function isFloating(p: Pin): boolean;     // branch → true
```

## Invariants

- Manifests SHOULD prefer tags. Branches are allowed (necessary for repos that don't tag) but flagged by `classifyPin`.

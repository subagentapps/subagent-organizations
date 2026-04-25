# `src/directives/verifiable.ts`

Optional contract a `Resource` can implement to declare an acceptance test.

## Shape

```ts
export interface AcceptanceTest {
  name: string;
  command: string;            // shell command to run
  expectExitCode?: number;    // default 0
  expectStdoutMatch?: RegExp;
}

export interface Verifiable {
  acceptance(): ReadonlyArray<AcceptanceTest>;
}

export function isVerifiable(x: unknown): x is Verifiable;
```

## Usage

A primitive class that wants verification implements `Verifiable`:

```ts
class ClaudeTool extends Resource implements Verifiable {
  acceptance(): readonly AcceptanceTest[] {
    return [
      { name: 'binary on PATH', command: `which ${this.id}`, expectStdoutMatch: /\// },
    ];
  }
}
```

`scripts/verify.ts` discovers all `Verifiable` resources and runs them.

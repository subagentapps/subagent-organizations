# `src/primitives/terminal.ts`

`Terminal` — extends `Resource` for terminal emulators we use or evaluate.

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export interface TerminalArgs extends ResourceArgs {
  brewCask: string;
  bundleId?: string;            // e.g. "com.mitchellh.ghostty"
  role?: 'current' | 'evaluating' | 'fallback' | 'archived';
}

export class Terminal extends Resource {
  readonly kind = 'terminal' as const;
  readonly brewCask: string;
  readonly bundleId: string | undefined;
  readonly role: TerminalArgs['role'];

  constructor(args: TerminalArgs);

  install(): InstallDirective;   // → { kind: 'homebrew-cask', cask: this.brewCask }
}
```

## Manifest entries

- `ghostty-org/ghostty` (cask: `ghostty`, role: `fallback`)
- `manaflow-ai/cmux` (cask: `cmux`, role: `current`)

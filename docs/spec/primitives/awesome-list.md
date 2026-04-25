# `src/primitives/awesome-list.ts`

`AwesomeList` — extends `Resource` for curated meta-lists (e.g. awesome-zsh-plugins, awesome-claude-code).
These are tracked because most of the entries in this manifest *come from* them.

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export interface AwesomeListArgs extends ResourceArgs {
  topic: 'zsh' | 'claude-code' | 'mcp' | 'general';
  stars?: number;
}

export class AwesomeList extends Resource {
  readonly kind = 'awesome-list' as const;
  readonly topic: AwesomeListArgs['topic'];
  readonly stars: number | undefined;

  constructor(args: AwesomeListArgs);

  install(): InstallDirective;   // → { kind: 'reference-only' }
}
```

## Manifest entries

- `unixorn/awesome-zsh-plugins` (topic: zsh, stars ≈ 17.6k)
- `hesreallyhim/awesome-claude-code` (topic: claude-code, stars ≈ 41k)

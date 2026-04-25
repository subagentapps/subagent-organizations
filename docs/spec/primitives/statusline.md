# `src/primitives/statusline.ts`

`StatusLine` — extends `Resource` for Claude Code statusline renderers.

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export interface StatusLineArgs extends ResourceArgs {
  language: 'rust' | 'typescript' | 'bash' | 'go';
  feature: 'cost' | 'context' | 'rate-limit' | 'mixed';
}

export class StatusLine extends Resource {
  readonly kind = 'claude-statusline' as const;
  readonly language: StatusLineArgs['language'];
  readonly feature: StatusLineArgs['feature'];

  constructor(args: StatusLineArgs);

  install(): InstallDirective;
}
```

## Manifest entries

- `sirmalloc/ccstatusline` (typescript, mixed)
- `jarrodwatts/claude-hud` (typescript, mixed)
- `Astro-Han/claude-pace` (bash, rate-limit)

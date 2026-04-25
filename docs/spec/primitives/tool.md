# `src/primitives/tool.ts`

`ClaudeTool` — extends `Resource` for CLI utilities that compose with Claude Code (analytics, search, statusline generators not covered by `StatusLine`).

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export type ToolInstallMethod =
  | { method: 'uv-tool'; pkg: string }
  | { method: 'npm-global'; pkg: string }
  | { method: 'brew'; tap?: string; cask?: string; formula?: string }
  | { method: 'cargo'; crate: string };

export interface ClaudeToolArgs extends ResourceArgs {
  installMethod: ToolInstallMethod;
}

export class ClaudeTool extends Resource {
  readonly kind = 'claude-tool' as const;
  readonly installMethod: ToolInstallMethod;

  constructor(args: ClaudeToolArgs);

  install(): InstallDirective;
}
```

## Manifest entries

- `pchalasani/claude-code-tools` (uv-tool: `claude-code-tools`)
- `carlrannaberg/claudekit` (npm-global: `claudekit`)
- `ryoppippi/ccusage` (npm-global: `ccusage`)

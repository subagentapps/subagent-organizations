# `src/primitives/agent.ts`

`Subagent` — extends `Resource` for specialized Claude Code subagents (markdown definitions under `~/.claude/agents/`).

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export type SubagentDomain =
  | 'general' | 'framework' | 'tooling' | 'security' | 'docs';

export interface SubagentArgs extends ResourceArgs {
  domain: SubagentDomain;
  bundledIn?: string;           // e.g. "claudekit" if installed via that umbrella tool
}

export class Subagent extends Resource {
  readonly kind = 'claude-subagent' as const;
  readonly domain: SubagentDomain;
  readonly bundledIn: string | undefined;

  constructor(args: SubagentArgs);

  install(): InstallDirective;
}
```

## Manifest entries (sourced via claudekit bundle)

- `code-review-expert` (general, bundledIn: claudekit)
- `typescript-expert` (framework)
- `react-expert` (framework)
- `refactoring-expert` (general)
- `documentation-expert` (docs)

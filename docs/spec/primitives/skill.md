# `src/primitives/skill.ts`

`ClaudeSkill` — extends `Resource` for Claude Code Skills installed via the plugin marketplace.

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export interface ClaudeSkillArgs extends ResourceArgs {
  marketplace?: string;   // e.g. "obra/superpowers-marketplace" or "claude-plugins-official"
}

export class ClaudeSkill extends Resource {
  readonly kind = 'claude-skill' as const;
  readonly marketplace: string | undefined;

  constructor(args: ClaudeSkillArgs);

  install(): InstallDirective;   // → { kind: 'claude-plugin', command: '/plugin install <id>@<marketplace>' }
}
```

## Manifest entries

- `obra/superpowers` (marketplace: `superpowers-marketplace`)
- *more skills land here as we adopt them from awesome-claude-code*

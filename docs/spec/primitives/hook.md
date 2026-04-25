# `src/primitives/hook.ts`

`ClaudeHook` — extends `Resource` for Claude Code hooks (shell commands wired into agent lifecycle events).

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'SessionStart'
  | 'SessionEnd';

export interface ClaudeHookArgs extends ResourceArgs {
  events: ReadonlyArray<HookEvent>;
  command: string;        // e.g. "uvx parry-guard hook"
  timeoutMs?: number;
  matcher?: string;
}

export class ClaudeHook extends Resource {
  readonly kind = 'claude-hook' as const;
  readonly events: ReadonlyArray<HookEvent>;
  readonly command: string;
  readonly timeoutMs: number | undefined;
  readonly matcher: string | undefined;

  constructor(args: ClaudeHookArgs);

  install(): InstallDirective;   // → { kind: 'settings-hook-merge', settingsPath: '~/.claude/settings.json', payload: { … } }
}
```

## Manifest entries

- `vaporif/parry` (events: PreToolUse, PostToolUse, UserPromptSubmit)

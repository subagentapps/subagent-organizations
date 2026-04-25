# `src/primitives/plugin.ts`

`ZshPlugin` — extends `Resource` for plugins loaded by a zsh plugin manager (antidote, zinit, etc.).

## Shape

```ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export interface ZshPluginArgs extends ResourceArgs {
  manager?: 'antidote' | 'zinit';
}

export class ZshPlugin extends Resource {
  readonly kind = 'zsh-plugin' as const;
  readonly manager: 'antidote' | 'zinit';

  constructor(args: ZshPluginArgs);

  install(): InstallDirective;   // → { kind: 'antidote-bundle', entry: this.repo }
}
```

## Manifest entries this powers

- `zsh-users/zsh-autosuggestions`
- `zdharma-continuum/fast-syntax-highlighting`
- `wfxr/forgit`
- `MichaelAquilina/zsh-auto-notify`
- `hydai/zsh-ccusage`
- `1160054/claude-code-zsh-completion`
- `hjdarnel/org-hopper`
- `caarlos0/zsh-open-pr`
- `sgpthomas/zsh-up-dir`
- `mattmc3/antidote` (the manager itself, listed as a `ZshPlugin` for symmetry)

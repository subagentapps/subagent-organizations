# Spec

These markdown files are the **pre-implementation contract** for `src/`.
Every file under `src/` proposed in the architecture has a sibling spec here at the same relative path.

## Conventions

- **Code blocks are signatures only.** No function bodies, no logic. They state shape, exports, and intent.
- **One spec per planned source file.** When `src/core/resource.ts` is implemented, this `core/resource.md` is the spec it must satisfy.
- **Updates flow markdown → code.** If the spec changes, update the doc and open a `docs(spec): …` PR before any `feat:` commit.

## Index

### Core (`src/core/`)
- [resource.md](./core/resource.md) — abstract base class
- [manifest.md](./core/manifest.md) — typed collection of resources
- [kind.md](./core/kind.md) — discriminated-union tag
- [schema.md](./core/schema.md) — Zod schemas

### Primitives (`src/primitives/`)
- [plugin.md](./primitives/plugin.md) — `ZshPlugin`
- [skill.md](./primitives/skill.md) — `ClaudeSkill`
- [hook.md](./primitives/hook.md) — `ClaudeHook`
- [tool.md](./primitives/tool.md) — `ClaudeTool`
- [statusline.md](./primitives/statusline.md) — `StatusLine`
- [agent.md](./primitives/agent.md) — `Subagent`
- [terminal.md](./primitives/terminal.md) — `Terminal`
- [awesome-list.md](./primitives/awesome-list.md) — `AwesomeList`

### Directives (`src/directives/`)
- [installable.md](./directives/installable.md) — install method discriminator
- [pinnable.md](./directives/pinnable.md) — version-pinning rules
- [verifiable.md](./directives/verifiable.md) — acceptance-test contract

### Manifest (`src/manifest/`)
- [load.md](./manifest/load.md) — parse `packages.json`
- [render.md](./manifest/render.md) — manifest → `REFERENCES.md`
- [sync.md](./manifest/sync.md) — optional clone-on-demand

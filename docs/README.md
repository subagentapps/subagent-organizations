# Documentation

This branch hosts the human-readable docs and pre-implementation specs.

## Layout

```
docs/
├── README.md                       # this file
├── platforms-comparison.md         # Mintlify vs Stainless vs Slate research
└── spec/                           # markdown spec for every src/ file
    ├── README.md                   # index of specs
    ├── core/
    │   ├── resource.md
    │   ├── manifest.md
    │   ├── kind.md
    │   └── schema.md
    ├── primitives/
    │   ├── plugin.md
    │   ├── skill.md
    │   ├── hook.md
    │   ├── tool.md
    │   ├── statusline.md
    │   ├── agent.md
    │   ├── terminal.md
    │   └── awesome-list.md
    ├── directives/
    │   ├── installable.md
    │   ├── pinnable.md
    │   └── verifiable.md
    └── manifest/
        ├── load.md
        ├── render.md
        └── sync.md
```

Each spec file shows the planned signature with code-block snippets — **no implementation yet**.
The `src/` tree on `main` will mirror this layout 1:1 once specs are signed off.

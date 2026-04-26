# `~/.claude/keybindings.json`

**Location**: `~/.claude/keybindings.json` (global only)
**Commit?** No (personal preference)
**Loads**: Every session

## What it does

Custom keyboard shortcuts. Override defaults or add chord bindings (e.g. `Ctrl+G Ctrl+H`).

## Shape

```json
{
  "$schema": "https://json.schemastore.org/claude-code-keybindings.json",
  "keybindings": [
    { "key": "ctrl+s", "command": "save-and-submit" },
    { "chord": ["ctrl+g", "ctrl+h"], "command": "open-history" }
  ]
}
```

(Exact schema: see https://code.claude.com/docs/en/keybindings — the file at
`/Users/alexzh/.claude/keybindings.json` if it exists is the working example.)

## Available skill

The `keybindings-help` skill (built-in) walks through customization. Invoke `/keybindings-help`.

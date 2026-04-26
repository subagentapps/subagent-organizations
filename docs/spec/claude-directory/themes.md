# `themes/*.json`

**Location**: `~/.claude/themes/*.json` (global) or shipped via plugins
**Commit?** No (global) / Yes (in plugins)
**Loads**: When selected via `/theme <name>`
**Shipped in**: v2.1.118

## What it does

Custom color themes. Override the defaults; switch with `/theme`.

## Shape

```json
{
  "name": "ember",
  "colors": {
    "background": "#0d0a08",
    "foreground": "#c8bdb2",
    "accent":     "#e07848",
    "ansi": {
      "0": "#1a1410", "1": "#d45840", "2": "#b8a050", "3": "#e09848",
      "4": "#6888a8", "5": "#c06050", "6": "#88a898", "7": "#c8bdb2",
      "8": "#4a3e34", "9": "#e07050", "10":"#d0b860","11":"#eab068",
      "12":"#88a8c0","13":"#d47060","14":"#a0c0b0","15":"#e8ddd2"
    }
  }
}
```

(Exact schema: see https://code.claude.com/docs/en/terminal-config#create-a-custom-theme.)

## Recommendation for our stack

Create `~/.claude/themes/ember.json` matching the Ember Dark palette already in
`/Users/alexzh/.config/ghostty/config:34-51`. Switch via `/theme ember` for visual
consistency between Ghostty and Claude Code.

(Already on the Tier-2 follow-up list — see `improvements-batch.md` §"Tier 2: action #9".)

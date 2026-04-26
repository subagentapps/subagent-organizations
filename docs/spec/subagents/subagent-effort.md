# `effort:`

**Optional.** Model thinking effort.

## Shape

```yaml
effort: high              # low | medium | high
```

## Default

Per `updates/claude-code/2026-w13/...` and v2.1.117: **default is `high` for Pro/Max
subscribers on Opus 4.6+**, and `medium` otherwise. Was `medium` everywhere before v2.1.117.

## Cost / quality

| Value | Behavior |
|---|---|
| `low` | Minimal extended thinking; fast |
| `medium` | Default for most non-Pro/Max contexts |
| `high` | Maximum extended thinking; best quality, highest cost |

## Recommendation for Max-plan polyrepo

Leave omitted → defaults to `high` automatically on your subscription. If you want to
*reduce* cost on a chatty subagent, drop to `medium` explicitly.

## Related
- [`./subagent-model.md`](./subagent-model.md) — orthogonal: which model
- [`./subagent-max-turns.md`](./subagent-max-turns.md) — orthogonal: how many turns

# Veil — Instructions for AI coding agents

This file is read by Claude Code, Cursor, GitHub Copilot, and other AI coding assistants.
Follow these rules exactly. They are not style preferences — they are the privacy guarantees.

## Hard invariants — never break these

1. **No `user_id` anywhere.**
   No column, no field, no request body key, no log line, no metric label, no comment that says "TODO: add user_id".
   If you see `user_id` in any file, it is a bug. Remove it.

2. **Noise applied client-side before any network call.**
   In `extension/src/background/reporter.js`: `geometricMechanism()` is called before `fetch()`.
   In `client/`: `noisy_count()` is called before the HTTP POST.
   The server must never receive a true impression count.

3. **Cohort keys only. No individual identity.**
   Redis key format: `cap:{cohort_id}:{campaign_id}`.
   Cohort format: `{geo}-{age_bucket}-{device}` (example: `us-unknown-desktop`).
   Never encode a session token, browser fingerprint, or any user-specific value in a key.

4. **Budget manager is blocking. No fallback serve.**
   `cap-service` must call `budget-manager` before processing any impression.
   If budget is exhausted (429) or service is unreachable (network error): return 503. Do not serve.
   Privacy beats availability. No silent fallback that bypasses the budget check.

5. **No custom DP math.**
   Use `diffprivlib` (Python) or the existing `geometricMechanism` (JS).
   Do not implement your own noise function. Do not modify `geometric.js` without a citation to a peer-reviewed paper.

## What to do before writing code

- Check `server/store/postgres.go` — all three tables have no `user_id` column. Keep it that way.
- Check `extension/src/background/reporter.js` — payload object must not contain `user_id`.
- Run `grep -r "user_id" --include="*.go" --include="*.py" --include="*.js" --include="*.ts" .` — must return zero results.

## Project structure

```
extension/          Chrome MV3 extension (noise in JS, local-only by default)
server/             cap-service Go, port 8080
budget-manager/     privacy budget manager Go, port 8081
dashboard/          React dashboard, port 3000
client/             Python simulator + NoiseMechanism ABC
infra/              docker-compose.yml, migrations, redis.conf
docs/               GitHub Pages (privacy policy, landing page)
```

## Running locally

```bash
docker compose up                              # all services
docker compose --profile simulation up client  # run Python simulator
```

## Noise plugin interface (primary contribution target)

Python: subclass `client/noise/base.py::NoiseMechanism`, override `noisy_count(true_count: int) -> int`.
HTTP sidecar: implement `POST /noise {"true_count": N, "epsilon": E} → {"noisy_value": N}` in any language.

Both paths are welcome. Neither path may return `true_count` unchanged.

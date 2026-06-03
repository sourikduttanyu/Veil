# Contributing to Veil

## Before you start

Read the invariants below. PRs that break them will be closed without review — these are the privacy guarantees, not style preferences.

## Hard invariants

| Rule | Why it's non-negotiable |
|---|---|
| No `user_id` anywhere | The entire privacy model depends on the server never knowing who sent a report. One `user_id` field breaks the guarantee for every user. |
| Noise before network | True counts must never leave the device. Apply noise in `geometricMechanism()` (JS) or `noisy_count()` (Python) before any `fetch()` / HTTP POST. |
| Cohort keys only | `cap:{cohort_id}:{campaign_id}`. The cohort is a demographic group (`us-unknown-desktop`), not an individual. Never put session state or browser identity in a key. |
| Budget manager fail-closed | If `budget-manager` is unreachable, the cap-service returns 503. No silent fallback that serves an impression without a budget check. |
| No custom DP math | Use `diffprivlib` or the existing `geometric.js`. Custom noise implementations require a peer-reviewed citation and a maintainer review. |

Run this before opening a PR:

```bash
grep -r "user_id" --include="*.go" --include="*.py" --include="*.js" --include="*.ts" .
# must return zero results
```

## What contributions are most wanted

1. **Noise mechanism plugins** — Python `NoiseMechanism` subclasses, or HTTP sidecar implementations in any language (Rust, Java, Go, R). See `client/noise/base.py` for the interface.
2. **Epsilon-accuracy experiments** — run `experiments/run_experiment.py` at different epsilon values, submit results as a PR updating `experiments/results/`.
3. **Ad slot detection patterns** — new selectors for `extension/src/content/detector.js` that catch ad slots the current list misses.
4. **Dashboard improvements** — the React dashboard (`dashboard/src/`) is the most accessible entry point.

## Noise plugin contract

### Python ABC path

```python
from noise.base import NoiseMechanism

class MyMechanism(NoiseMechanism):
    def noisy_count(self, true_count: int) -> int:
        # apply noise, return non-negative int
        # must not return true_count unchanged

    def mechanism_name(self) -> str:
        return "my-mechanism"
```

### HTTP sidecar path (any language)

```
POST /noise
Content-Type: application/json

{"true_count": 4, "epsilon": 1.0}

→ 200 OK
{"noisy_value": 3}
```

Must respond within 1 second. Failures must raise — no silent fallback to a less-private value.

## Dev setup

```bash
git clone https://github.com/sourikduttanyu/Veil
cd Veil
cp .env.example .env
docker compose up
```

Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`

## PR checklist

See `.github/pull_request_template.md` — the checklist is required on every PR.

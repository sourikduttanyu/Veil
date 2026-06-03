# Veil

> Stop ads from stalking you — without giving up your data.
> Frequency caps enforced with math. No user IDs. No tracking. No exceptions.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Go 1.24](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go)](https://go.dev)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

## Why Veil exists — and why it's different

Most privacy tools pick a side: block everything, or block nothing.

uBlock Origin, Privacy Badger, and Ghostery block ads or trackers outright. They work well — but they break publisher revenue and still don't solve the core problem: the same ad stalking you across twenty sites because the ad network knows it has shown you that ad nineteen times already.

Veil takes a different position: **ads are fine. Surveillance to run them is not.**

### The balance Veil strikes

| | Ad blockers | No protection | Veil |
|---|---|---|---|
| You see repetitive ads | ✗ (blocks all) | ✓ | ✗ |
| Publishers earn revenue | ✗ | ✓ | ✓ |
| Advertisers reach right audiences | ✗ | ✓ | ✓ |
| Your identity is tracked | ✗ | ✓ | ✗ |
| Frequency caps enforced | N/A | ✓ (via user ID) | ✓ (via math) |

Advertisers benefit from frequency capping too — over-serving an ad tanks conversion rates and wastes budget. Veil enforces the same cap that ad networks already want, using cohort-level signals instead of individual surveillance. A cohort like `us-desktop` reaches the right demographic without pinning the count to a specific person.

The usual fix is a server-side frequency counter keyed on your user ID. Veil solves it with math: your true count never leaves your device. The server receives a mathematically noisy number — enough to enforce "too many times," not enough to identify you. The noise is provably private: [Local Differential Privacy](https://en.wikipedia.org/wiki/Local_differential_privacy) with a Geometric mechanism.

**Result:** publishers monetize. advertisers reach demographics without building profiles. you stop seeing the same ad fifty times.

---

## Veil works with your ad blocker, not instead of it

Ad blockers are good. They're not enough.

uBlock Origin, Brave Shields, and Privacy Badger block ads by matching requests against filter lists of known ad domains. This works — until it doesn't.

**The gaps ad blockers leave:**

| Where blockers fail | Why | What Veil does |
|---|---|---|
| YouTube, Twitch | Google's MV3 API change crippled domain-blocking extensions. Anti-adblock JS fights them directly. | Detects ad slot patterns in DOM, caps frequency regardless of domain |
| Facebook, Instagram, TikTok | Ads served from first-party domains — same domain as content. Can't block without breaking the feed. | `div[data-ad-slot]` and similar patterns still fire. Veil caps them. |
| "Please disable your ad blocker" gates | User turns blocker off to read the article. Now fully exposed. | Veil stays active regardless. Ads show, but can't stalk. |
| New ad domains | Filter lists lag new domains by days or weeks after launch. | Veil watches DOM patterns, not domains. No list to update. |
| Acceptable Ads whitelist | Adblock Plus is paid by ad networks to pass "acceptable" ads through unblocked. | Veil frequency-caps them anyway. |

**How the layers combine:**

```
Layer 1 — Your ad blocker (optional)
          Blocks known ad domains via filter lists.
          Handles ~70–80% of traditional display ads.

Layer 2 — Veil
          Runs on everything that gets through.
          Enforces frequency caps with differential privacy.
          Works even when Layer 1 is disabled.

Result:   Fewer total ads. Zero ad stalking. No surveillance.
          Even on sites where you've turned off your blocker,
          Veil holds the line on repetition.
```

The key scenario: a user disables uBlock to read a paywalled news site. Without Veil, the ad network now knows exactly how many times that user has seen each ad and can build a session profile. With Veil running, ads appear — but the true count never leaves the device, and the same ad can't appear more than your configured limit.

---

## Architecture

```
Browser (your device)                  Server infrastructure
─────────────────────────────────      ──────────────────────────────────────
 ┌─────────────────────────────┐
 │      Content Script         │
 │  detector.js                │
 │  Watches DOM for ad slots:  │
 │  • iframe[src*=doubleclick] │
 │  • ins.adsbygoogle          │
 │  • div[data-ad-slot]        │
 │                             │
 │  Extracts campaign_id       │
 │  Derives cohort (geo+device)│
 │  No user_id, ever           │
 └────────────┬────────────────┘
              │ AD_IMPRESSION message
              ▼
 ┌─────────────────────────────┐
 │    Background Service Worker│       ┌──────────────────────┐
 │  reporter.js                │       │   budget-manager     │
 │                             │  ┌───►│   :8081 (Go)         │
 │  true_count (in-memory,     │  │    │                      │
 │  never sent)                │  │    │  Tracks epsilon spend │
 │          │                  │  │    │  per cohort per window│
 │  Geometric noise applied ◄──┘  │    │  SELECT FOR UPDATE   │
 │  epsilon=1.0 (default)     │   │    │  Fail-closed: 503 if │
 │          │                 │   │    │  budget exhausted    │
 │  noisy_value sent ─────────┼───┘    └──────────────────────┘
 │  {cohort_id,               │
 │   campaign_id,             │        ┌──────────────────────┐
 │   noisy_value}             │───────►│   cap-service        │
 │                            │        │   :8080 (Go)         │
 └─────────────────────────────┘        │                      │
                                        │  Redis: counts/TTLs  │
                                        │  Postgres: audit log │
                                        │                      │
                                        │  Returns:            │
                                        │  {"action":"serve"}  │
                                        │  {"action":"suppress"}│
                                        └──────────────────────┘
                                                  │
                                        ┌─────────▼────────────┐
                                        │   dashboard          │
                                        │   :3000 (React)      │
                                        │                      │
                                        │  Top ads chart       │
                                        │  Budget gauge        │
                                        │  Protection stats    │
                                        │  Privacy vs accuracy │
                                        └──────────────────────┘
```

**Cohort key format**: `{geo}-{age_bucket}-{device}` (example: `us-unknown-desktop`)
No individual is ever identified. A cohort is the smallest addressable unit.

---

## Quick start

### Path 1 — Extension only (install and forget)

1. Clone the repo:
   ```bash
   git clone https://github.com/sourikduttanyu/privacap
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `extension/` folder

5. Browse normally. Veil runs silently in the background. The extension icon shows how many ads it has suppressed this session.

No account. No sign-up. No server required for basic use — the noise runs entirely in the service worker.

---

### Path 2 — Full stack (run the enforcement infrastructure)

**Prerequisites**: Docker, Docker Compose, Git

```bash
git clone https://github.com/sourikduttanyu/privacap
cd privacap
cp .env.example .env
docker compose up
```

Services that start:

| Service | URL | What it does |
|---|---|---|
| cap-service | `http://localhost:8080` | Receives noisy reports, enforces frequency caps |
| budget-manager | `http://localhost:8081` | Tracks epsilon budget per cohort per 24h window |
| dashboard | `http://localhost:3000` | Charts, budget gauge, protection stats |
| Postgres 16 | internal | Persistent impression log and cohort tables |
| Redis 7 | internal | Per-campaign counters with TTL-based window resets |

To simulate traffic against the stack:

```bash
docker compose --profile simulation up client
```

This runs the Python simulator with the default `DiffprivlibMechanism` (Geometric, ε=1.0). Watch the dashboard update in real time.

To tear everything down including volumes:

```bash
docker compose down -v
```

---

## How it works

```
1. DETECT   Content script watches the DOM for ad slots using
            MutationObserver. When an ad appears, it extracts a
            campaign_id from ad metadata and derives a cohort
            from timezone and screen width. One report per
            campaign per page load.

2. COUNT    The background service worker increments an in-memory
            true count for (cohort, campaign). This count lives
            only in memory. It is reset when the service worker
            restarts. It is never written to disk. It is never sent.

3. SCRAMBLE The Geometric mechanism is applied in pure JS before
            any network call:

              alpha = exp(-epsilon / 1)
              noise = ±Geometric(1 - alpha)
              noisy_value = max(0, true_count + noise)

            The server receives noisy_value. It has no way to
            recover true_count from a single report.

4. ENFORCE  cap-service receives {cohort_id, campaign_id, noisy_value}.
            It checks the budget-manager (fail-closed), then compares
            the noisy aggregate against FREQUENCY_CAP. Action is
            "serve" or "suppress". The result is stored back in the
            extension for popup display.
```

---

## Privacy guarantees

These are structural invariants, not policy promises. They are enforced by the schema and the code, not by configuration.

| Guarantee | How it's enforced |
|---|---|
| No user identifiers | `user_id` column does not exist in any table. `001_cohorts.sql` comment: `-- no user_id column. intentional. PII storage structurally impossible.` |
| Noise before network | `geometricMechanism()` is called in `reporter.js` before `fetch()`. The payload object has no `user_id` field — this is a code comment, not a lint rule. |
| Cohort granularity only | Cohort key: `{geo}-{age_bucket}-{device}`. Minimum group size is large by construction. |
| Budget enforcement | `budget-manager` uses `SELECT FOR UPDATE` to prevent concurrent epsilon overspend. |
| Fail-closed | If `budget-manager` returns 503 or is unreachable, `cap-service` returns 503. The ad is not served. Privacy over availability. |
| ε-bound per window | `MAX_EPSILON_PER_WINDOW` (default `10.0`) caps total epsilon spend per cohort per 24h window. Once exhausted, all reports from that cohort are rejected until the window resets. |

**What the server sees**: a stream of `{cohort_id, campaign_id, noisy_value}` tuples. No IP addresses are stored. No session tokens. No browser fingerprints.

**What the server does not see**: true counts, individual identities, cross-site histories, or anything that would let it reconstruct a user profile.

---

## Environment variables

All services read from environment. Copy `.env.example` to `.env` and edit before `docker compose up`.

| Variable | Default | Description |
|---|---|---|
| `DP_EPSILON` | `1.0` | Noise level. Lower = more privacy, less accuracy. `0.1` is maximum privacy; `5.0` approaches true counts. |
| `FREQUENCY_CAP` | `5` | Number of noisy impressions before suppression kicks in. |
| `CAMPAIGN_WINDOW_SECONDS` | `86400` | Window length in seconds. Counts reset at window expiry. |
| `MAX_EPSILON_PER_WINDOW` | `10.0` | Total epsilon budget per cohort per window. Exhaustion triggers fail-closed lockdown. |
| `NOISE_BACKEND` | `diffprivlib` | Python client noise backend. Options: `diffprivlib`, `http_sidecar`. |
| `BUDGET_MANAGER_URL` | `http://localhost:8081` | cap-service uses this to reach budget-manager. |
| `DATABASE_URL` | — | Postgres connection string. Required. |
| `REDIS_URL` | `localhost:6379` | Redis address for cap-service. |

The epsilon tradeoff in plain terms: at `DP_EPSILON=1.0`, a true count of 5 might be reported as anywhere from 2 to 8. The server can tell "this cohort has seen this ad a lot" but not "this exact person has seen it exactly 5 times." At `DP_EPSILON=0.1`, the noise range widens further. At `DP_EPSILON=5.0`, the noise is small enough that counts are nearly accurate — but you've traded privacy for precision.

---

## Bring your own noise

The Python client ships a `NoiseMechanism` abstract base class. Subclass it to plug in any noise implementation.

```python
from noise.base import NoiseMechanism

class NoiseMechanism(ABC):
    @abstractmethod
    def noisy_count(self, true_count: int) -> int:
        """Apply noise. Must return non-negative int. Must not return true_count exactly."""

    @abstractmethod
    def mechanism_name(self) -> str:
        """Human-readable name for logs and experiment output."""
```

Two implementations ship out of the box:

**`DiffprivlibMechanism`** (default) — wraps IBM's [diffprivlib](https://github.com/IBM/differential-privacy-library) Geometric mechanism. Correct for integer count data; produces integers natively without rounding artifacts.

```python
from noise.diffprivlib_mechanism import DiffprivlibMechanism

reporter = DPReporter(DiffprivlibMechanism(epsilon=1.0))
```

**`HttpSidecarMechanism`** — delegates to an HTTP sidecar. Implement the noise in any language; the contract is:

```
POST /noise
Content-Type: application/json

{"true_count": 4, "epsilon": 1.0}

→ 200 OK
{"noisy_value": 3}
```

The sidecar must respond within 1 second. Failures raise — no silent fallback to a less-private path.

```python
from noise.http_sidecar import HttpSidecarMechanism

reporter = DPReporter(HttpSidecarMechanism("http://localhost:9000", epsilon=1.0))
```

To add a new mechanism to the extension's JavaScript side, implement the same interface:

```javascript
// extension/src/noise/your_mechanism.js
export function yourMechanism(trueCount, epsilon) {
  // return a non-negative integer
}
```

Then swap the import in `extension/src/background/reporter.js`.

---

## Repository layout

```
dp-frequency-cap/
├── extension/              Chrome MV3 extension
│   ├── manifest.json
│   └── src/
│       ├── content/        detector.js — DOM ad slot detection
│       ├── background/     reporter.js — noise + reporting service worker
│       ├── noise/          geometric.js — Geometric mechanism (pure JS)
│       └── popup/          popup UI with session stats
├── server/                 cap-service (Go, port 8080)
│   ├── handlers/           HTTP handlers: /impressions, /caps, /distribution
│   └── store/              Redis + Postgres adapters
├── budget-manager/         privacy budget manager (Go, port 8081)
│   ├── handlers/           /budget/consume, /budget/{cohort_id}
│   └── store/              Postgres with SELECT FOR UPDATE
├── client/                 Python simulator
│   ├── simulator.py        Generates synthetic impressions
│   ├── dp_reporter.py      Builds noisy payloads, no user_id
│   └── noise/              NoiseMechanism ABC + two implementations
├── dashboard/              React + Recharts (port 3000)
└── infra/
    ├── docker-compose.yml  All services, Postgres, Redis
    ├── migrations/         001_cohorts.sql, 002_impression_log.sql, 003_cap_enforcement_log.sql
    └── redis.conf
```

---

## Contributing

Open an issue before starting large changes. PRs that add `user_id` anywhere — column, field, log, metric label — will be closed without review; this is not a stylistic preference, it is the core privacy guarantee.

The highest-value contributions right now are additional noise mechanism implementations (especially the HTTP sidecar path in languages other than Python), epsilon-accuracy experiment results, and documentation improvements.

See the hard invariants in `CLAUDE.md` before writing code.

---

## License

GPL v3. See [LICENSE](LICENSE).

---

*Veil is not affiliated with Google, the Chrome team, or any ad network. It is independent open-source software.*

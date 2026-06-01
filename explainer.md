# privacap — ELI5

## The problem

Imagine you see the same ad for running shoes 47 times in one day. Annoying. Ad companies want to stop this — they want to show you an ad at most 5 times. This is called **frequency capping**.

Old way: store a list. "User ID 9182 has seen this ad 3 times." Simple. Works. But also means the ad company now has a database of everywhere you've been and everything you've seen. That's a surveillance log. After GDPR, ATT (Apple's privacy rules), and cookie death, companies like Google can't do this anymore.

New problem: **how do you count how many times someone has seen an ad without knowing who they are?**

That's what privacap solves.

---

## The core trick: lying on purpose

Here's the key idea. Instead of reporting "I saw this ad 4 times," your device reports a **slightly wrong number** on purpose.

Maybe you saw it 4 times. But your device rolls a dice and reports 3. Or 5. Or 4. The noise is random and calibrated by a number called **epsilon**.

- Small epsilon (0.1) = lots of noise = very private, less accurate
- Large epsilon (5.0) = little noise = less private, more accurate

This is called **local differential privacy**. "Local" means the noise is added on your device before anything is sent. The server never sees your real number.

---

## How it works end to end

```
Your device saw ad 4 times
        │
        ▼
Add calibrated noise → report "3" (not the real 4)
        │
        ▼
Server receives "3" from you
Server receives "5" from Alice
Server receives "2" from Bob
Server receives "4" from Carol
        │
        ▼
Server averages all the noisy reports
Individual numbers are meaningless
But the average across millions of users is accurate
        │
        ▼
Server knows: "across this age group in the US,
average ad exposure is 3.8 — above cap of 3,
stop showing this ad to this group"
```

Nobody's individual count was ever trusted or stored. The server made a good decision anyway because statistics work at scale.

---

## The four pieces

**1. Client Simulator (Python)**
Pretends to be thousands of real users. Each fake user sees some ads, adds noise to their count, sends the noisy number to the server. Like a fake crowd for testing.

**2. Cap Enforcement Service (Go)**
Receives the noisy reports. Adds them up per group (e.g. "US users, age 18-34, on mobile"). When the group total crosses the cap, it switches from "serve" to "suppress" for that group.

**3. Privacy Budget Manager (Go)**
Here's the sneaky part: if you query the noisy data enough times, the noise stops protecting you. Like guessing a number — one guess, hard. A million guesses, easy. The budget manager counts how many times each group's data has been queried and blocks queries once you've spent too much "privacy budget." This is the most novel piece of the system.

**4. Dashboard (React)**
Shows charts: how accurate is the system at each epsilon level? How much privacy budget is left? How many ads were served vs suppressed? The most important chart is the **epsilon vs accuracy curve** — it shows the fundamental tradeoff visually.

---

## Why no user IDs anywhere

The database has no `user_id` column. Not "we deleted it" or "we hashed it." The column does not exist. There is no way to store user data even if someone wanted to. This is called **privacy by architecture** — the system is structurally incapable of surveillance, not just policy-prohibited.

Every record is tied to a **cohort** (a group): "US, age 18-34, mobile." Millions of people share a cohort ID. Knowing the cohort ID tells you nothing about any individual.

---

## The tradeoff in one sentence

More privacy (lower epsilon) = noisier counts = less accurate frequency caps = some ads get shown too many or too few times.

Less privacy (higher epsilon) = less noise = more accurate caps = better ad experience = more tracking risk.

privacap measures this tradeoff precisely and shows it on a graph. That's the whole point.

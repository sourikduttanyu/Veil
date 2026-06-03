Most privacy tools make a binary choice: block everything or block nothing. Veil takes a third path.

I am genuinely obsessed with privacy. Not in a theoretical way. In the way where you search for running shoes once and then see the same shoe ad on every website for the next three weeks. In the way where you mention something to a friend and an ad for it appears on your feed an hour later. In the way where it starts to feel less like marketing and more like the internet is watching you think.

That last one is not paranoia. It is the system working as designed.

The annoying part of advertising is not ads. It is surveillance. You do not mind seeing a relevant ad once or twice. You mind seeing the same ad forty times because a system somewhere has been logging every page you loaded, every search you made, every product you lingered on, and is now using that log to decide you are still a viable target.

Frequency capping, the feature that should prevent that experience, has historically required knowing who you are. You cannot count how many times a user has seen an ad without tracking the user. Or so the assumption went.

**Local Differential Privacy breaks that assumption.**

LDP lets you publish statistics without revealing individual data. The core mechanic is simple: before any data leaves your browser, you apply calibrated noise. The true count never travels. A noisy version does.

Veil uses the Geometric mechanism for this. If you have seen an ad five times, the extension adds integer-preserving noise before reporting anything to the server. The server might receive a 3. It might receive a 7. It will not receive a 5.

```python
from diffprivlib.mechanisms import Geometric

mech = Geometric(epsilon=0.5, sensitivity=1)
noisy_count = mech.randomise(true_count)
```

The epsilon parameter controls the tradeoff. Lower epsilon means more noise, more privacy, but less accuracy in aggregate statistics. Higher epsilon means tighter numbers, more useful for publishers, but weaker individual protection.

**The budget manager is where the real design decision lives.**

Every user gets an epsilon budget per ad campaign. The extension tracks how much has been spent. When the budget runs out, the ad is blocked. Not because the system decided to block it. Because the math says there is no privacy-preserving way to report further.

This is "fail-closed" design: privacy wins when resources are exhausted. Most ad tech fails open. Veil fails closed.

The architecture is deliberately simple. A Chrome Manifest V3 service worker intercepts ad requests. A MutationObserver watches the DOM for injected ad elements. Two Go microservices handle the backend: cap-service on port 8080 manages frequency counters in Redis, budget-manager on port 8081 enforces epsilon limits. Postgres stores the audit log. No user_id column exists in any table. That is structural, not a configuration choice someone could accidentally reverse.

**Why this matters now**

Third-party cookies are gone across all major browsers. The ad tech industry spent years treating that deadline as a reason to build cookie replacements. Most of those replacements still require some form of identity resolution.

Privacy laws now have real teeth. User-ID-based frequency capping carries genuine legal risk, and the infrastructure cost of identity graphs is not trivial.

Apple and Google both use LDP internally: Apple for keyboard analytics, Google for Chrome usage histograms. They understood years ago that you do not need to know individual data points to compute useful population statistics. Veil applies the same primitive to ad frequency, on the open web, as a browser extension anyone can install.

The result: publishers still get paid, advertisers still reach audiences, and the user stops seeing the same ad fifty times. Everyone wins, without anyone handing over a persistent identity.

**The thing I keep coming back to is how much the industry accepted surveillance as a technical necessity when it was actually a design choice.**

Frequency capping does not require knowing who you are. It requires knowing approximately how many times a certain ad has been shown to a certain browser, within some acceptable margin of error. LDP provides exactly that. The math was available. The assumption that identity was required was just never seriously questioned.

I am curious whether you think this kind of privacy-by-design approach can get real adoption in the ad ecosystem, or whether the incentives are too misaligned. The extension is heading to the Chrome Web Store soon, and the code is already open: https://github.com/sourikduttanyu/Veil

What would it take for an advertiser or publisher to actually trust this over their current stack?

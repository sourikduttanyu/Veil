# Chrome Web Store Submission Blockers

Track everything required before Veil can be submitted to the Chrome Web Store.
Update status as each item is resolved.

---

## Hard blockers — Chrome will reject without these

- [x] **Remove `localhost` from `host_permissions`** — done. `manifest.json` no longer contains localhost.

- [x] **Decide on backend architecture** — done. Local-only mode is default (`capServiceUrl: ""`). Server mode is opt-in via popup settings. Fallback to local cap check if server unreachable.

- [x] **Privacy policy written** — `docs/privacy-policy.html` created and ready.
  - [ ] **Enable GitHub Pages** (Settings → Pages → branch: main, folder: `/docs`) so it's live at `sourikduttanyu.github.io/privacap/privacy-policy.html`
  - [ ] **Add privacy policy URL to Chrome Web Store listing** during submission

---

## Required assets — store listing will be incomplete without these

- [ ] **1–5 screenshots at 1280×800 or 640×400**
  Capture: extension popup active on a real site, dashboard showing top ads chart, blocked ad counter.

- [ ] **Pay $5 one-time developer fee**
  URL: https://chrome.google.com/webstore/devconsole
  Sign in with Google account → Payments → Register.

- [ ] **Write permission justification** (submitted in the developer console form)
  Draft:
  > Veil's content script must run on all pages to detect ad slots (DoubleClick iframes, AdSense elements, data-ad-slot divs). It reads no user content — only checks for the presence of known ad slot patterns. No browsing history, page content, or user data is transmitted. The noisy_value sent to the cap service is a scrambled integer, not a URL or identifier.

---

## Recommended before submitting (not hard blockers, but improve approval odds)

- [ ] **Rename GitHub repo from `privacap` → `veil`**
  Settings → Repository name → Rename. GitHub auto-redirects old URL.
  Update all `git clone` references in README.md after rename.

- [ ] **Create 440×280 promotional tile** (optional but boosts store listing)
  Dark background, Veil wordmark, tagline: "Stop ads from stalking you."

- [ ] **Create `PRIVACY_POLICY.md`** and host it publicly
  Can live in repo + GitHub Pages.

- [ ] **Extension popup shows clear on/off toggle**
  Reviewers check that users can disable the extension easily from the popup.

- [ ] **Test on Chrome stable (not just Canary/Dev)**
  Load unpacked → verify no console errors on google.com, cnn.com, weather.com.

- [ ] **Version bump manifest to `1.0.0`** before first store submission
  `0.x` versions signal pre-release; store reviewers prefer `1.0.0`.

---

## Post-submission checklist

- [ ] Monitor review status at https://chrome.google.com/webstore/devconsole
  Typical review time: 1–3 business days for new extensions.
- [ ] Respond promptly to any reviewer questions (usually via email to developer account)
- [ ] If rejected: read the specific policy violation, fix, resubmit same listing (no new fee)

---

## Status

| Item | Status | Notes |
|---|---|---|
| Manifest V3 | ✅ Done | |
| Extension icons (16, 48, 128) | ✅ Done | |
| Name + description | ✅ Done | "Veil" |
| GPL v3 license | ✅ Done | |
| Remove localhost host_permission | ✅ Done | manifest.json cleaned |
| Backend decision | ✅ Done | local-only default, server opt-in |
| Privacy policy written | ✅ Done | docs/privacy-policy.html |
| GitHub Pages enabled | ❌ Manual step | Settings → Pages → /docs |
| Screenshots | ❌ Needed | |
| $5 developer fee | ❌ Needed | |
| Permission justification written | ❌ Needed | |
| Repo renamed to veil | ❌ Recommended | |

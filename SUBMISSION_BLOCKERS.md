# Chrome Web Store Submission Blockers

Track everything required before Veil can be submitted to the Chrome Web Store.
Update status as each item is resolved.

---

## Hard blockers — Chrome will reject without these

- [x] **Remove `localhost` from `host_permissions`** — done.

- [x] **Decide on backend architecture** — done. Local-only default, server opt-in via popup settings.

- [x] **Privacy policy live at public URL**
  Live at: `https://sourikduttanyu.github.io/Veil/privacy-policy.html`
  - [ ] Add this URL to the Chrome Web Store listing during submission.

- [x] **`declarativeNetRequest` removed — not used in v1**
  Network-level blocking deferred to v2. v1 uses DOM hiding only (display:none).
  This eliminates the primary CWS rejection risk. The privacy guarantee is unchanged —
  it comes from the DP math, not from blocking network requests.

---

## Required assets — store listing will be incomplete without these

- [ ] **1–5 screenshots at 1280×800 or 640×400**
  Capture: extension popup on a real site showing suppressed count, dashboard top ads chart, How it works panel open.

- [ ] **Pay $5 one-time developer fee**
  URL: https://chrome.google.com/webstore/devconsole
  Sign in → Payments → Register.

- [ ] **Update permission justification to cover all three permissions**

  | Permission | Risk | Justification |
  |---|---|---|
  | `storage` | None | Saves epsilon setting, frequency cap, session stats for popup. No browsing data. |
  | `activeTab` | Low | Reads ad slot attributes (data-ad-slot, element id) to identify which campaign is being seen. |
  | `https://*/*` host permission | Medium | Content script must run on all pages — ad slots appear on any site. No page content or URLs transmitted. Only a scrambled impression count. |

---

## Recommended before submitting

- [ ] **Test on Chrome stable**
  Load unpacked → browse weather.com, cnn.com → let an ad hit the cap → confirm the element gets `display:none` and `data-veil="suppressed"` attribute in DevTools Elements panel.

- [x] **GitHub Pages live** — `https://sourikduttanyu.github.io/Veil/`

- [ ] **Version bump manifest to `1.0.0`**

- [ ] **Extension popup shows clear on/off toggle**
  Reviewers check users can disable easily.

- [ ] **Promotional tile 440×280** (optional, improves store ranking)

---

## If rejected — appeals path

Chrome Web Store rejections come with a policy code. Most likely codes for Veil:

| Code | Reason | Fix |
|---|---|---|
| `Ads blocking` | Extension blocks ad requests | Appeal: cite frequency capping use case, session-only rules, ad-unit-specific filters |
| `Broad host permissions` | `https://*/*` flagged | Justify: ad slots appear on any site, content script can't predict which domains |
| `Missing privacy policy` | No policy URL in listing | Add `https://sourikduttanyu.github.io/Veil/privacy-policy.html` |
| `Deceptive functionality` | Misleading description | Clarify: Veil doesn't block all ads, it caps frequency |

---

## Status

| Item | Status | Notes |
|---|---|---|
| Manifest V3 | ✅ Done | |
| Extension icons (16, 48, 128) | ✅ Done | |
| Name + description | ✅ Done | "Veil" |
| GPL v3 license | ✅ Done | |
| Remove localhost host_permission | ✅ Done | |
| Backend: local-only default | ✅ Done | |
| Privacy policy written + live | ✅ Done | sourikduttanyu.github.io/Veil/privacy-policy.html |
| GitHub Pages live | ✅ Done | |
| declarativeNetRequest removed (v1) | ✅ Done | Eliminates primary rejection risk |
| Screenshots | ❌ Needed | |
| $5 developer fee | ❌ Needed | |
| Permission justification pasted in CWS | ❌ Needed | |
| Version bump to 1.0.0 | ❌ Recommended | |
| Test network blocking in DevTools | ❌ Needed | Verify Path A actually works |

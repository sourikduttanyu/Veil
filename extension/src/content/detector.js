/**
 * Content script — detects ad impressions on the current page.
 * Watches for ad slots via MutationObserver, reports to service worker,
 * and hides ad elements when the service worker returns "suppress".
 *
 * No user identity is ever sent — only campaign ID from ad metadata
 * and a cohort derived from timezone + screen width.
 */

const AD_SELECTORS = [
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="googleadservices.com"]',
  'ins.adsbygoogle',
  'div[data-ad-client]',
  'div[data-ad-slot]',
  'div[id^="google_ads_iframe"]',
  'div[class*="ad-slot"]',
  'div[class*="AdSlot"]',
];

const seen = new Set();

function extractCampaignId(el) {
  return (
    el.getAttribute("data-ad-slot") ||
    el.getAttribute("data-ad-unit-path") ||
    el.id ||
    "unknown-campaign"
  );
}

function deriveCohort() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  let geo = "unknown";
  if (/America/.test(tz)) geo = "us";
  else if (/Europe/.test(tz)) geo = "eu";
  else if (/Asia|Pacific|Australia/.test(tz)) geo = "apac";

  const device = window.screen.width < 768 ? "mobile" : "desktop";
  return `${geo}-unknown-${device}`;
}

function reportImpression(el) {
  const campaignId = extractCampaignId(el);
  const key = `${campaignId}::${location.hostname}`;
  if (seen.has(key)) return; // one report per campaign per page load
  seen.add(key);

  chrome.runtime.sendMessage(
    {
      type: "AD_IMPRESSION",
      cohortId: deriveCohort(),
      campaignId,
      hostname: location.hostname,
    },
    (response) => {
      if (chrome.runtime.lastError) return; // service worker restarted — no-op
      if (response?.action === "suppress") {
        // Hide the ad element. !important prevents ad network CSS overriding it.
        el.style.setProperty("display", "none", "important");
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("data-veil", "suppressed");
      }
    }
  );
}

function scanExisting() {
  AD_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach(reportImpression);
  });
}

const observer = new MutationObserver(() => scanExisting());
observer.observe(document.body, { childList: true, subtree: true });
scanExisting();

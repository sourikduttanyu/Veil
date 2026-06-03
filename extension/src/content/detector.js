/**
 * Content script — detects ad impressions on the current page.
 * Watches for ad slots via MutationObserver, sends impression events
 * to the service worker. Never sends user identity — only campaign ID
 * derived from ad metadata and a cohort derived from device signals.
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
  // Best-effort campaign ID from ad metadata — falls back to slot ID
  return (
    el.getAttribute("data-ad-slot") ||
    el.getAttribute("data-ad-unit-path") ||
    el.id ||
    "unknown-campaign"
  );
}

function deriveCohort() {
  // Cohort from timezone (geo proxy) + device width (device type).
  // No user identity. No fingerprinting beyond these two signals.
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

  chrome.runtime.sendMessage({
    type: "AD_IMPRESSION",
    cohortId: deriveCohort(),
    campaignId,
    hostname: location.hostname,
  });
}

function scanExisting() {
  AD_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach(reportImpression);
  });
}

const observer = new MutationObserver(() => scanExisting());
observer.observe(document.body, { childList: true, subtree: true });
scanExisting();

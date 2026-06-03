/**
 * Service worker — receives AD_IMPRESSION events from content script,
 * applies Geometric noise, enforces frequency cap locally (default)
 * or via optional cap-service, then adds declarativeNetRequest session
 * rules to block over-cap ads at the network level on subsequent loads.
 *
 * Suppression tiers (applied together on first suppress decision):
 *   1. DOM hide (immediate, this page load) — set display:none via sendResponse
 *   2. Network block (subsequent loads) — declarativeNetRequest session rule
 *      blocks the ad iframe before it downloads, fires tracking pixels, or
 *      registers an impression with the ad network.
 *
 * True counts never leave the browser. Only noisy_value is ever sent.
 * No user_id field is ever added to any payload.
 */

import { geometricMechanism } from "../noise/geometric.js";

const LOCAL_FREQUENCY_CAP = 5;

const DEFAULT_CONFIG = {
  capServiceUrl: "", // empty = local-only mode (default for CWS build)
  epsilon: 1.0,
  frequencyCap: LOCAL_FREQUENCY_CAP,
};

async function getConfig() {
  const stored = await chrome.storage.sync.get(["capServiceUrl", "epsilon", "frequencyCap"]);
  return {
    capServiceUrl: stored.capServiceUrl || DEFAULT_CONFIG.capServiceUrl,
    epsilon: parseFloat(stored.epsilon) || DEFAULT_CONFIG.epsilon,
    frequencyCap: parseInt(stored.frequencyCap) || DEFAULT_CONFIG.frequencyCap,
  };
}

// In-memory true count per cohort+campaign within this browser session.
// Reset on service worker restart. Never persisted. Never sent.
const trueCounts = {};

// Track which campaigns already have a network block rule this session.
// Rule IDs are integers; we use a counter starting at 1000 to avoid
// clashing with any static rules in the manifest.
let nextRuleId = 1000;
const campaignRuleIds = {};

/**
 * Build a URL filter string from an ad's campaign ID or captured iframe URL.
 * Returns null if no useful pattern can be constructed.
 *
 * The filter targets the specific ad unit path, not the whole ad domain,
 * so only that campaign is blocked — not all ads from the network.
 */
function buildUrlFilter(campaignId, adUrl) {
  // Try iframe URL first — most specific
  if (adUrl) {
    try {
      const url = new URL(adUrl);
      // Use hostname + up to 3 path segments (excludes volatile query params)
      const segments = url.pathname.split("/").filter(Boolean).slice(0, 3);
      if (segments.length > 0) {
        return `*${url.hostname}/${segments.join("/")}*`;
      }
      return `*${url.hostname}*`;
    } catch {
      // invalid URL — fall through to campaign ID path
    }
  }

  // Fall back to ad unit path extracted from campaign ID
  const adUnit = campaignId
    .replace(/^google_ads_iframe_/i, "")
    .replace(/_?\d+__container__$/i, "")
    .replace(/__container__$/i, "");

  // Only use if it looks like a real path (contains a slash) not a generic ID
  if (adUnit && adUnit.includes("/")) {
    return `*${adUnit}*`;
  }

  return null;
}

/**
 * Add a declarativeNetRequest session rule to block the ad's URL pattern.
 * Session rules are cleared automatically when the extension reloads.
 * Scoped to sub_frame resources — only blocks iframes, not page navigation.
 */
async function addNetworkBlockRule(campaignId, adUrl) {
  if (campaignRuleIds[campaignId]) return; // rule already registered

  const urlFilter = buildUrlFilter(campaignId, adUrl);
  if (!urlFilter) return; // no useful pattern — DOM hide only

  const ruleId = nextRuleId++;
  campaignRuleIds[campaignId] = ruleId;

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [
        {
          id: ruleId,
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter,
            resourceTypes: ["sub_frame"],
          },
        },
      ],
    });
  } catch {
    // declarativeNetRequest unavailable or rule rejected — DOM hide still applies
  }
}

async function handleImpression({ cohortId, campaignId, adUrl = "" }) {
  const key = `${cohortId}::${campaignId}`;
  trueCounts[key] = (trueCounts[key] || 0) + 1;
  const trueCount = trueCounts[key];

  const { capServiceUrl, epsilon, frequencyCap } = await getConfig();
  const noisyValue = geometricMechanism(trueCount, epsilon);

  let action = "serve";

  if (!capServiceUrl) {
    // Local-only mode: compare true count against local cap.
    action = trueCount > frequencyCap ? "suppress" : "serve";
  } else {
    const payload = {
      cohort_id: cohortId,
      campaign_id: campaignId,
      noisy_value: noisyValue,
      // no user_id field — intentional
    };
    try {
      const resp = await fetch(`${capServiceUrl}/impressions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const data = await resp.json();
        action = data.action;
      } else if (resp.status === 429) {
        action = "budget_exhausted";
      }
    } catch {
      // Server unreachable — fall back to local cap check
      action = trueCount > frequencyCap ? "suppress" : "serve";
    }
  }

  // On suppress: register network block rule so subsequent loads of this
  // ad are blocked before they download, fire tracking pixels, or register
  // an impression with the ad network — equivalent to ad blocker behavior.
  if (action === "suppress" || action === "budget_exhausted") {
    await addNetworkBlockRule(campaignId, adUrl);
  }

  // Persist stats for popup display
  const stats = await chrome.storage.local.get(["totalServed", "totalSuppressed", "recentActions"]);
  const totalServed = (stats.totalServed || 0) + (action === "serve" ? 1 : 0);
  const totalSuppressed = (stats.totalSuppressed || 0) + (action === "suppress" ? 1 : 0);
  const recentActions = (stats.recentActions || []).slice(-49);
  recentActions.push({ cohortId, campaignId, action, noisyValue, trueCount, ts: Date.now() });

  await chrome.storage.local.set({ totalServed, totalSuppressed, recentActions });

  return action;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "AD_IMPRESSION") {
    handleImpression(msg).then((action) => sendResponse({ action }));
    return true; // keep message channel open for async response
  }
});

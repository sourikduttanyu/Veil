/**
 * Service worker — receives AD_IMPRESSION events from content script,
 * applies Geometric noise, enforces frequency cap locally (default)
 * or reports to optional cap-service if a server URL is configured.
 *
 * True counts never leave the browser. Only noisy_value is ever sent.
 * No user_id field is ever added to any payload.
 *
 * Local-only mode (default): capServiceUrl is empty — cap check runs
 * entirely in memory. No network calls. Works with Chrome Web Store build.
 *
 * Server mode (optional): set capServiceUrl in extension settings popup.
 * Enables cross-session dashboard at localhost:3000.
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

async function handleImpression({ cohortId, campaignId }) {
  const key = `${cohortId}::${campaignId}`;
  trueCounts[key] = (trueCounts[key] || 0) + 1;
  const trueCount = trueCounts[key];

  const { capServiceUrl, epsilon, frequencyCap } = await getConfig();
  const noisyValue = geometricMechanism(trueCount, epsilon);

  let action = "serve";

  if (!capServiceUrl) {
    // Local-only mode: compare true count against local cap.
    // No network call. Privacy-by-default.
    action = trueCount > frequencyCap ? "suppress" : "serve";
  } else {
    // Server mode: report noisy value, let cap-service decide.
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
      // Server unreachable — fail to local cap check rather than silently serving
      action = trueCount > frequencyCap ? "suppress" : "serve";
    }
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

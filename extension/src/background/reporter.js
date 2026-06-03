/**
 * Service worker — receives AD_IMPRESSION events from content script,
 * applies Geometric noise locally, POSTs noisy report to cap-service.
 *
 * True counts never leave the browser. Only the noisy_value is sent.
 * No user_id field is ever added to any payload.
 */

import { geometricMechanism } from "../noise/geometric.js";

const DEFAULT_CONFIG = {
  capServiceUrl: "http://localhost:8080",
  epsilon: 1.0,
};

async function getConfig() {
  const stored = await chrome.storage.sync.get(["capServiceUrl", "epsilon"]);
  return {
    capServiceUrl: stored.capServiceUrl || DEFAULT_CONFIG.capServiceUrl,
    epsilon: parseFloat(stored.epsilon) || DEFAULT_CONFIG.epsilon,
  };
}

// In-memory true count per cohort+campaign within this browser session.
// Reset on service worker restart. Never persisted, never sent.
const trueCounts = {};

async function handleImpression({ cohortId, campaignId }) {
  const key = `${cohortId}::${campaignId}`;
  trueCounts[key] = (trueCounts[key] || 0) + 1;
  const trueCount = trueCounts[key];

  const { capServiceUrl, epsilon } = await getConfig();
  const noisyValue = geometricMechanism(trueCount, epsilon);

  const payload = {
    cohort_id: cohortId,
    campaign_id: campaignId,
    noisy_value: noisyValue,
    // no user_id field — intentional
  };

  let action = "unknown";
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
  } catch (e) {
    action = "cap_service_unreachable";
  }

  // Store stats for popup display
  const stats = await chrome.storage.local.get(["totalServed", "totalSuppressed", "recentActions"]);
  const totalServed = (stats.totalServed || 0) + (action === "serve" ? 1 : 0);
  const totalSuppressed = (stats.totalSuppressed || 0) + (action === "suppress" ? 1 : 0);
  const recentActions = (stats.recentActions || []).slice(-49);
  recentActions.push({ cohortId, campaignId, action, noisyValue, trueCount, ts: Date.now() });

  await chrome.storage.local.set({ totalServed, totalSuppressed, recentActions });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AD_IMPRESSION") {
    handleImpression(msg);
  }
});

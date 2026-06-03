async function render() {
  const stats = await chrome.storage.local.get(["totalServed", "totalSuppressed", "recentActions"]);
  const config = await chrome.storage.sync.get(["capServiceUrl", "epsilon"]);

  document.getElementById("totalServed").textContent = stats.totalServed || 0;
  document.getElementById("totalSuppressed").textContent = stats.totalSuppressed || 0;

  const epsilon = parseFloat(config.epsilon) || 1.0;
  document.getElementById("epsilonVal").textContent = `ε = ${epsilon}`;
  // Map epsilon 0.1–10 to bar width 5%–100%
  const pct = Math.min(100, Math.max(5, (epsilon / 10) * 100));
  document.getElementById("epsilonBar").style.width = `${pct}%`;

  document.getElementById("capServiceUrl").value = config.capServiceUrl || "http://localhost:8080";
  document.getElementById("epsilon").value = epsilon;

  const recentActions = (stats.recentActions || []).slice(-5).reverse();
  const list = document.getElementById("recentList");
  list.innerHTML = recentActions.length
    ? recentActions.map((a) => `
        <div class="action-row">
          <div class="dot ${a.action}"></div>
          <span class="campaign">${a.campaignId}</span>
          <span class="noisy">noisy=${a.noisyValue}</span>
        </div>`).join("")
    : `<div style="font-size:12px;color:#444;padding:8px 0">No impressions detected yet.</div>`;
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const url = document.getElementById("capServiceUrl").value.trim();
  const eps = parseFloat(document.getElementById("epsilon").value);
  if (!url || isNaN(eps) || eps <= 0) return;
  await chrome.storage.sync.set({ capServiceUrl: url, epsilon: eps });
  render();
});

render();

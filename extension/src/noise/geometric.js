/**
 * Two-sided Geometric mechanism for integer-valued local DP.
 *
 * Correct for count data — produces integers natively, no rounding.
 * Equivalent to IBM diffprivlib's Geometric mechanism.
 *
 * Math:
 *   alpha = exp(-epsilon / sensitivity)
 *   noise = sign * Geometric(1 - alpha)
 *   P(Z=k) = (1-alpha)/(1+alpha) * alpha^|k|
 *
 * To bring your own noise: implement the same interface —
 *   { noisyCount(trueCount, epsilon) => int }
 * and swap it in background/reporter.js.
 */

function sampleGeometric(alpha) {
  // Inverse CDF: P(X <= k) = 1 - alpha^(k+1)
  const u = Math.random();
  return Math.floor(Math.log(1 - u) / Math.log(alpha));
}

export function geometricMechanism(trueCount, epsilon, sensitivity = 1) {
  const alpha = Math.exp(-epsilon / sensitivity);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const noise = sampleGeometric(alpha);
  return Math.max(0, trueCount + sign * noise);
}

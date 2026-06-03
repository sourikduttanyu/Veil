import os
import random
import sys
from collections import Counter

import numpy as np
import requests
from dotenv import load_dotenv

from dp_reporter import DPReporter
from noise.diffprivlib_mechanism import DiffprivlibMechanism
from noise.http_sidecar import HttpSidecarMechanism

load_dotenv()

CAP_SERVICE_URL = os.getenv("CAP_SERVICE_URL", "http://localhost:8080")
NOISE_BACKEND = os.getenv("NOISE_BACKEND", "diffprivlib")
NOISE_SERVICE_URL = os.getenv("NOISE_SERVICE_URL", "http://localhost:9090")
DP_EPSILON = float(os.getenv("DP_EPSILON", "1.0"))
TARGET_USERS = int(os.getenv("TARGET_USERS", "1000"))
CAMPAIGNS = os.getenv("CAMPAIGNS", "camp_001,camp_002").split(",")

COHORT_IDS = [
    "us-18-34-mobile",
    "us-35-54-mobile",
    "us-18-34-desktop",
    "eu-18-34-mobile",
    "eu-35-54-desktop",
    "apac-18-34-mobile",
]


def build_mechanism() -> object:
    if NOISE_BACKEND == "http_sidecar":
        return HttpSidecarMechanism(sidecar_url=NOISE_SERVICE_URL, epsilon=DP_EPSILON)
    return DiffprivlibMechanism(epsilon=DP_EPSILON)


def generate_true_impressions() -> int:
    """Poisson(lambda=3) models realistic ad exposure distribution."""
    return int(np.random.poisson(lam=3))


def run_simulation():
    mechanism = build_mechanism()
    reporter = DPReporter(mechanism)

    print(f"Starting simulation: {TARGET_USERS} users, epsilon={DP_EPSILON}, backend={mechanism.mechanism_name()}")

    results = {"serve": 0, "suppress": 0, "error": 0}
    true_counts = []
    noisy_counts = []

    for _ in range(TARGET_USERS):
        cohort_id = random.choice(COHORT_IDS)
        campaign_id = random.choice(CAMPAIGNS)
        true_count = generate_true_impressions()

        payload = reporter.report(cohort_id, campaign_id, true_count)

        true_counts.append(true_count)
        noisy_counts.append(payload["noisy_value"])

        try:
            resp = requests.post(
                f"{CAP_SERVICE_URL}/impressions",
                json=payload,
                timeout=5,
            )
            if resp.status_code == 200:
                results[resp.json().get("action", "error")] += 1
            elif resp.status_code == 429:
                results["suppress"] += 1
            else:
                results["error"] += 1
        except requests.RequestException as e:
            results["error"] += 1
            print(f"request failed: {e}", file=sys.stderr)

    mae = float(np.mean(np.abs(np.array(true_counts) - np.array(noisy_counts))))
    print(f"\nResults:")
    print(f"  serve:    {results['serve']}")
    print(f"  suppress: {results['suppress']}")
    print(f"  error:    {results['error']}")
    print(f"  MAE (noisy vs true): {mae:.3f}")


if __name__ == "__main__":
    run_simulation()

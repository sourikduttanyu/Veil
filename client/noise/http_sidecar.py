import requests

from .base import NoiseMechanism


class HttpSidecarMechanism(NoiseMechanism):
    """Polyglot noise mechanism — delegates to an HTTP sidecar service.

    Implement noise in any language. Contract:

        POST /noise
        {"true_count": 4, "epsilon": 1.0}
        → {"noisy_value": 3}

    The sidecar must respond within 1 second. Failures raise — fail closed.
    See CONTRIBUTING.md for a reference implementation.
    """

    def __init__(self, sidecar_url: str, epsilon: float):
        self._url = sidecar_url.rstrip("/") + "/noise"
        self._epsilon = epsilon

    def noisy_count(self, true_count: int) -> int:
        resp = requests.post(
            self._url,
            json={"true_count": true_count, "epsilon": self._epsilon},
            timeout=1.0,
        )
        resp.raise_for_status()
        noisy = resp.json()["noisy_value"]
        return max(0, int(noisy))

    def mechanism_name(self) -> str:
        return f"http-sidecar({self._url}, epsilon={self._epsilon})"

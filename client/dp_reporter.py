from noise.base import NoiseMechanism


class DPReporter:
    """Applies a NoiseMechanism to impression counts and builds report payloads.

    The mechanism is injected — swap it without touching this class.
    """

    def __init__(self, mechanism: NoiseMechanism):
        self._mechanism = mechanism

    def report(self, cohort_id: str, campaign_id: str, true_count: int) -> dict:
        """Returns a POST payload for the cap service. No user_id field."""
        return {
            "cohort_id": cohort_id,
            "campaign_id": campaign_id,
            "noisy_value": self._mechanism.noisy_count(true_count),
        }

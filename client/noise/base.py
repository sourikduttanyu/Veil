from abc import ABC, abstractmethod


class NoiseMechanism(ABC):
    """Extension point for custom noise/DP mechanisms.

    To bring your own noise:
    1. Subclass NoiseMechanism
    2. Implement noisy_count() and mechanism_name()
    3. Pass your instance to DPReporter

    See CONTRIBUTING.md for the HTTP sidecar path (any language).
    """

    @abstractmethod
    def noisy_count(self, true_count: int) -> int:
        """Apply noise to a true impression count.

        Args:
            true_count: the actual number of times an ad was seen

        Returns:
            A noisy integer. Must never be negative.
            Must not expose true_count exactly (defeat the purpose).
        """

    @abstractmethod
    def mechanism_name(self) -> str:
        """Human-readable name for logging and experiment output."""

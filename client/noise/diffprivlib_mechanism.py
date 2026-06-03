from diffprivlib.mechanisms import Geometric

from .base import NoiseMechanism


class DiffprivlibMechanism(NoiseMechanism):
    """Default noise mechanism using IBM diffprivlib Geometric mechanism.

    Geometric is correct for integer count data — unlike Laplace it
    produces integers natively without rounding artifacts.
    """

    def __init__(self, epsilon: float, sensitivity: int = 1, max_count: int = 20):
        self._epsilon = epsilon
        self._sensitivity = sensitivity
        self._max_count = max_count
        self._mechanism = Geometric(epsilon=epsilon, sensitivity=sensitivity)

    def noisy_count(self, true_count: int) -> int:
        noisy = int(self._mechanism.randomise(true_count))
        return max(0, min(noisy, self._max_count))

    def mechanism_name(self) -> str:
        return f"diffprivlib-geometric(epsilon={self._epsilon})"

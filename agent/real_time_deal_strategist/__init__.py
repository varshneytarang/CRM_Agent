"""Real-time Deal Strategist (CI Agent).

Package contains:
- data contracts (models)
- competitor registry (battlecards)
- detection + synthesis
- Flask route registration
"""

from .routes import register_routes

__all__ = ["register_routes"]

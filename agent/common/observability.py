from __future__ import annotations

import logging
from typing import Any


logger = logging.getLogger("prospecting-agent-runtime")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def log_step(step: str, payload: dict[str, Any]) -> None:
    logger.info("step=%s payload=%s", step, payload)

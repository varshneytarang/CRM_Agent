from __future__ import annotations

from common.schemas import QAOutput
from common.observability import log_step
from graph.state import ProspectingState


def run_qa_compliance(state: ProspectingState) -> ProspectingState:
    sequence = state.get("sequence")
    if not sequence:
        state["error"] = "qa_compliance requires sequence"
        return state

    violations: list[str] = []
    for step in sequence.get("steps", []):
        body = str(step.get("body", "")).lower()
        if "guarantee" in body:
            violations.append("Avoid guaranteed outcome claims")

    output = QAOutput(
        approved=len(violations) == 0,
        violations=violations,
        corrected_copy=None,
    )

    state["qa"] = output.model_dump()
    state.setdefault("trace", []).append("qa_compliance:complete")
    log_step("qa_compliance", output.model_dump())
    return state

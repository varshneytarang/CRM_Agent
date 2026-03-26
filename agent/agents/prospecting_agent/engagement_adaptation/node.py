from __future__ import annotations

from common.schemas import AdaptationOutput
from common.observability import log_step
from graph.state import ProspectingState


def run_engagement_adaptation(state: ProspectingState) -> ProspectingState:
    signal = (state.get("context") or {}).get("engagement_signal", "no_response")

    stop = signal in {"unsubscribe", "bounce"}
    tone = "stop" if stop else ("consultative" if signal in {"open", "click"} else "friendly")

    output = AdaptationOutput(
        signal=signal,
        recommended_tone=tone,
        updated_cta="Would a 15-minute walkthrough next week be useful?" if not stop else "No further outreach.",
        next_message="Adapted follow-up draft based on engagement signal.",
        stop_sequence=stop,
    )

    state["adaptation"] = output.model_dump()
    state.setdefault("trace", []).append("engagement_adaptation:complete")
    log_step("engagement_adaptation", output.model_dump())
    return state

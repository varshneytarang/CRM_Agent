from __future__ import annotations

from common.groq_client import GroqClient
from common.schemas import PersonalizationOutput
from common.observability import log_step
from common.calendly_service import get_calendly_booking_url
from graph.state import ProspectingState


def run_personalization(state: ProspectingState) -> ProspectingState:
    lead = state.get("lead")
    if not lead:
        state["error"] = "personalization requires lead"
        return state

    prompt = (
        "Return strict JSON with keys sequence_name, steps, rationale. "
        "steps must include 4 entries: email1, followup1, followup2, linkedin. "
        "Each step needs step, channel, subject(optional), body. "
        f"Lead: {lead.model_dump_json()}"
    )

    client = GroqClient()
    try:
        raw = client.call_personalization([
            {"role": "system", "content": "You write concise B2B outreach. Output only JSON."},
            {"role": "user", "content": prompt},
        ])
        parsed = client.parse_json_strict(raw)
        validated = PersonalizationOutput.model_validate(parsed)
    except Exception:
        validated = PersonalizationOutput(
            sequence_name=f"4-Step Outreach: {lead.contact.full_name}",
            steps=[
                {"step": 1, "channel": "email", "subject": "Quick idea for pipeline lift", "body": "Personalized email 1"},
                {"step": 2, "channel": "email", "subject": "Following up", "body": "Follow-up email 1"},
                {"step": 3, "channel": "email", "subject": "One last nudge", "body": "Follow-up email 2"},
                {"step": 4, "channel": "linkedin", "body": "LinkedIn touchpoint"},
            ],
            rationale="Generated from company profile, role context, and research brief.",
        )

    # Optionally add Calendly booking as final step
    calendly_organizer = state.get("context", {}).get("calendly_organizer")
    if calendly_organizer:
        booking_url = get_calendly_booking_url(calendly_organizer)
        if booking_url:
            booking_step = {
                "step": len(validated.steps) + 1,
                "channel": "calendly",
                "booking_url": booking_url,
                "subject": "Let's schedule a time to chat",
                "body": "I'd love to discuss how we can help. Click below to pick a time that works for you.",
            }
            validated.steps.append(booking_step)

    state["sequence"] = validated.model_dump()
    state.setdefault("trace", []).append("personalization:complete")
    log_step("personalization", {"sequence_name": validated.sequence_name})
    return state

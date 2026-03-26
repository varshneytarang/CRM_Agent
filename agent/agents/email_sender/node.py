from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field
from common.observability import log_step
from common.email_service import send_email_via_resend, EmailPayload
from graph.state import ProspectingState


class EmailSendResult(BaseModel):
    """Result of attempting to send an email."""
    step_number: int
    channel: str
    recipient: str
    status: str  # "sent", "pending_approval", "error", "skipped"
    subject: str
    email_id: Optional[str] = None
    message: str


class EmailSenderOutput(BaseModel):
    """Output from email sender agent node."""
    send_results: list[EmailSendResult] = Field(default_factory=list)
    total_emails_attempted: int
    total_emails_sent: int
    total_pending_approval: int
    total_errors: int
    all_emails_sent: bool
    reason: str


def run_email_sender(state: ProspectingState) -> ProspectingState:
    """
    Send emails from the personalized sequence.
    
    Only sends email channel steps that passed guardrails check.
    LinkedIn steps are skipped (should be handled separately in engagement_adaptation).
    
    Returns updated state with email send results.
    """
    lead = state.get("lead")
    sequence = state.get("sequence")
    guardrails = state.get("guardrails")
    
    if not lead or not sequence:
        state["error"] = "email_sender requires lead and sequence"
        return state
    
    if not guardrails:
        state["error"] = "email_sender requires guardrails check to pass first"
        return state
    
    # If guardrails failed, don't send
    if not guardrails.get("can_send_email"):
        state["email_send_results"] = {
            "send_results": [],
            "total_emails_attempted": 0,
            "total_emails_sent": 0,
            "total_pending_approval": 0,
            "total_errors": 0,
            "all_emails_sent": False,
            "reason": f"Blocked by guardrails: {guardrails.get('reason', 'Unknown')}",
        }
        state.setdefault("trace", []).append("email_sender:skipped")
        return state
    
    # Extract steps from sequence
    steps = sequence.get("steps", [])
    send_results = []
    sent_count = 0
    pending_count = 0
    error_count = 0
    
    recipient_email = lead.contact.email
    
    for step in steps:
        channel = step.get("channel", "").lower()
        
        # Skip non-email channels
        if channel != "email":
            continue
        
        step_number = step.get("step", 0)
        subject = step.get("subject", "No subject")
        body = step.get("body", "")
        
        # Prepare email payload
        payload = EmailPayload(
            to=recipient_email,
            subject=subject,
            body=body,
        )
        
        # Send via Resend
        result = send_email_via_resend(payload)
        
        # Record result
        send_result = EmailSendResult(
            step_number=step_number,
            channel=channel,
            recipient=recipient_email,
            status=result.get("status"),
            subject=subject,
            email_id=result.get("email_id"),
            message=result.get("message"),
        )
        send_results.append(send_result.model_dump())
        
        if result.get("status") == "sent":
            sent_count += 1
        elif result.get("status") == "pending_approval":
            pending_count += 1
        elif result.get("status") == "error":
            error_count += 1
    
    all_sent = error_count == 0 and pending_count == 0
    
    email_output = EmailSenderOutput(
        send_results=send_results,
        total_emails_attempted=len([s for s in steps if s.get("channel", "").lower() == "email"]),
        total_emails_sent=sent_count,
        total_pending_approval=pending_count,
        total_errors=error_count,
        all_emails_sent=all_sent,
        reason="All email steps completed successfully" if all_sent else f"{error_count} errors, {pending_count} pending",
    )
    
    state["email_send_results"] = email_output.model_dump()
    state.setdefault("trace", []).append("email_sender:complete")
    log_step("email_sender", {
        "sent": sent_count,
        "pending_approval": pending_count,
        "errors": error_count,
    })
    
    return state

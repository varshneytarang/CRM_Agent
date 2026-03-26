from __future__ import annotations

from pydantic import BaseModel, Field
from common.observability import log_step
from common.email_service import (
    check_sender_warm_up,
    check_recipient_suppression,
)
from graph.state import ProspectingState


class GuardrailsOutput(BaseModel):
    """Output from guardrails agent node."""
    is_compliant: bool
    violations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    domain_warmup_status: str
    emails_sent_today: int
    daily_send_limit: int
    can_send_email: bool
    reason: str


def run_guardrails(state: ProspectingState) -> ProspectingState:
    """
    Check guardrails before sending email:
    1. Domain warmup status
    2. Rate limiting (emails sent today vs daily limit)
    3. Unsubscribe suppression list
    4. Human approval status
    
    Returns updated state with guardrails check result.
    """
    lead = state.get("lead")
    sequence = state.get("sequence")
    
    if not lead or not sequence:
        state["error"] = "guardrails requires lead and sequence"
        return state

    violations = []
    warnings = []
    
    # Check 1: Domain warmup
    sender_domain = state.get("context", {}).get("sender_domain", "crmagent.io")
    warmup = check_sender_warm_up(sender_domain)
    
    if warmup["warmup_status"] != "verified":
        warnings.append(f"Sender domain '{sender_domain}' not fully verified")
    
    # Check 2: Rate limiting
    emails_sent_today = state.get("context", {}).get("emails_sent_today", 0)
    daily_limit = warmup.get("daily_limit", 50)
    
    if emails_sent_today >= daily_limit:
        violations.append(f"Daily email limit ({daily_limit}) reached for domain '{sender_domain}'")
    
    # Check 3: Suppression list
    recipient_email = lead.contact.email
    suppression_list = state.get("context", {}).get("unsubscribe_list", [])
    
    if check_recipient_suppression(recipient_email, suppression_list):
        violations.append(f"Recipient {recipient_email} is on unsubscribe list")
    
    # Check 4: Human approval (if required)
    requires_approval = state.get("context", {}).get("require_human_approval", False)
    approval_status = state.get("context", {}).get("approval_status", "pending")
    
    if requires_approval and approval_status != "approved":
        violations.append("Awaiting human approval for first outbound")
    
    # Determine compliance
    is_compliant = len(violations) == 0
    can_send = is_compliant and approval_status == "approved" if requires_approval else is_compliant
    
    reason = "All checks passed" if is_compliant else f"Blocked by {len(violations)} violation(s)"
    
    guardrails_output = GuardrailsOutput(
        is_compliant=is_compliant,
        violations=violations,
        warnings=warnings,
        domain_warmup_status=warmup["warmup_status"],
        emails_sent_today=emails_sent_today,
        daily_send_limit=daily_limit,
        can_send_email=can_send,
        reason=reason,
    )
    
    state["guardrails"] = guardrails_output.model_dump()
    state.setdefault("trace", []).append("guardrails:complete")
    log_step("guardrails", {
        "is_compliant": is_compliant,
        "violations_count": len(violations),
        "warnings_count": len(warnings),
    })
    
    return state

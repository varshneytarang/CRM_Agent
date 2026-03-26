"""Email sending service using Resend API."""
import os
from typing import Optional
import requests
from pydantic import BaseModel


class EmailPayload(BaseModel):
    to: str
    subject: str
    body: str
    from_email: str = "noreply@crmagent.io"
    reply_to: Optional[str] = None


def send_email_via_resend(payload: EmailPayload) -> dict:
    """
    Send email via Resend API.
    
    Falls back gracefully if RESEND_API_KEY not set.
    Returns dict with status 'sent', 'pending_approval', or 'error'.
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return {
            "status": "pending_approval",
            "message": "No RESEND_API_KEY configured. Email queued for manual approval.",
            "payload": payload.model_dump(),
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    data = {
        "from": payload.from_email,
        "to": payload.to,
        "subject": payload.subject,
        "html": payload.body,
    }
    if payload.reply_to:
        data["reply_to"] = payload.reply_to

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=data,
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        return {
            "status": "sent",
            "message": f"Email sent successfully. ID: {result.get('id')}",
            "email_id": result.get("id"),
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "message": f"Failed to send email: {str(e)}",
            "error": str(e),
        }


def check_sender_warm_up(sender_domain: str) -> dict:
    """
    Check domain warmup status (simplified).
    In production, call Resend API to check verified senders.
    
    Returns dict with warmup_status, emails_sent_today, daily_limit.
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return {
            "warmup_status": "not_verified",
            "emails_sent_today": 0,
            "daily_limit": 50,  # Conservative limit for unverified
            "message": "Domain verification pending",
        }

    # In production, query Resend sender list and return actual status
    return {
        "warmup_status": "verified",
        "emails_sent_today": 0,
        "daily_limit": 500,  # Generous limit for verified domain
        "message": "Domain verified, ready to send",
    }


def check_recipient_suppression(email: str, suppression_list: list) -> bool:
    """
    Check if recipient is on unsubscribe suppression list.
    Returns True if recipient is suppressed (should NOT send).
    """
    return email.lower() in [e.lower() for e in suppression_list]

"""Calendly integration for meeting booking in sequences."""
import os
from typing import Optional
import requests
from pydantic import BaseModel


class CalendlyBookingStep(BaseModel):
    """Calendly booking step for adding to sequence."""
    step: int
    channel: str = "calendly"
    booking_url: str
    subject: str = "Let's schedule a time to chat"
    body: str = "I'd love to discuss how we can help. Click below to pick a time that works for you."


def get_calendly_booking_url(organizer_username: str) -> Optional[str]:
    """
    Get Calendly booking link for the organizer.
    
    Args:
        organizer_username: Username/slug of Calendly organizer
    
    Returns:
        Full URL to booking page or None if not configured
    """
    api_key = os.getenv("CALENDLY_API_KEY")
    if not api_key:
        return None

    # In production, call Calendly API to get user's event types
    # For now, return direct Calendly profile URL
    return f"https://calendly.com/{organizer_username}"


def create_calendly_event(
    organizer_username: str,
    invitee_name: str,
    invitee_email: str,
    event_type_uri: str,
) -> dict:
    """
    Create a Calendly event invitation.
    
    Args:
        organizer_username: Calendly organizer username
        invitee_name: Name of person to invite
        invitee_email: Email of person to invite
        event_type_uri: URI of the calendar event type
    
    Returns:
        Dict with booking status and details
    """
    api_key = os.getenv("CALENDLY_API_KEY")
    if not api_key:
        return {
            "status": "error",
            "message": "CALENDLY_API_KEY not configured",
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Note: This is a simplified example. Calendly API has specific requirements
    # for creating invitations via their GraphQL API.
    data = {
        "event": event_type_uri,
        "name": invitee_name,
        "email": invitee_email,
        "status": "active",
    }

    try:
        response = requests.post(
            "https://api.calendly.com/invitations",
            headers=headers,
            json=data,
            timeout=10,
        )
        response.raise_for_status()
        return {
            "status": "success",
            "message": "Meeting invitation sent via Calendly",
            "data": response.json(),
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "message": f"Failed to create Calendly event: {str(e)}",
            "error": str(e),
        }

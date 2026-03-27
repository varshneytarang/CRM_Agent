"""
Outcome Tracking Service
Tracks intervention outcomes through webhooks and email engagement tracking
"""

from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class InterventionOutcomeTracker:
    """
    Tracks outcomes of retention interventions
    """
    
    @staticmethod
    def track_email_opened(intervention_id: str, opened_at: datetime) -> Dict[str, Any]:
        """
        Track when an intervention email is opened
        
        Args:
            intervention_id: ID of the intervention
            opened_at: Time when email was opened
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "viewed",
            "email_opened_at": opened_at.isoformat(),
            "confidence_score": 0.7,  # High confidence that email was seen
            "engagement_signal": "email_opened",
        }
    
    @staticmethod
    def track_email_clicked(intervention_id: str, clicked_at: datetime, link_clicked: Optional[str] = None) -> Dict[str, Any]:
        """
        Track when a link in intervention email is clicked
        
        Args:
            intervention_id: ID of the intervention
            clicked_at: Time when link was clicked
            link_clicked: Which link was clicked (e.g., "calendly", "cta_button")
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "engaged",
            "email_clicked_at": clicked_at.isoformat(),
            "link_clicked": link_clicked,
            "confidence_score": 0.85,  # Very high confidence of engagement
            "engagement_signal": "email_clicked",
        }
    
    @staticmethod
    def track_meeting_scheduled(intervention_id: str, meeting_time: datetime) -> Dict[str, Any]:
        """
        Track when a meeting is scheduled via intervention
        
        Args:
            intervention_id: ID of the intervention
            meeting_time: Time of scheduled meeting
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "positive",
            "meeting_scheduled_at": datetime.utcnow().isoformat(),
            "scheduled_meeting_time": meeting_time.isoformat(),
            "confidence_score": 0.95,  # Extremely high confidence of positive outcome
            "engagement_signal": "meeting_accepted",
        }
    
    @staticmethod
    def track_meeting_attended(intervention_id: str, attended_at: datetime) -> Dict[str, Any]:
        """
        Track when a scheduled meeting is attended
        
        Args:
            intervention_id: ID of the intervention
            attended_at: Time when meeting was attended
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "positive",
            "meeting_attended": True,
            "meeting_attended_at": attended_at.isoformat(),
            "confidence_score": 1.0,  # Certain positive outcome
            "engagement_signal": "meeting_completed",
        }
    
    @staticmethod
    def track_email_response(
        intervention_id: str,
        responded_at: datetime,
        response_sentiment: str = "positive",
        response_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Track when an account responds to intervention email
        
        Args:
            intervention_id: ID of the intervention
            responded_at: Time when response was received
            response_sentiment: Sentiment of response (positive, neutral, negative)
            response_text: Text of the response
        
        Returns:
            Outcome data
        """
        outcome_status = {
            "positive": "positive",
            "neutral": "engaged",
            "negative": "negative",
        }.get(response_sentiment, "engaged")
        
        return {
            "intervention_id": intervention_id,
            "outcome_status": outcome_status,
            "response_received_at": responded_at.isoformat(),
            "response_sentiment": response_sentiment,
            "response_text": response_text,
            "confidence_score": 0.9,
            "engagement_signal": "email_response",
        }
    
    @staticmethod
    def track_discount_accepted(intervention_id: str, accepted_at: datetime) -> Dict[str, Any]:
        """
        Track when a discount offer is accepted
        
        Args:
            intervention_id: ID of the intervention
            accepted_at: Time when discount was accepted
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "positive",
            "discount_accepted_at": accepted_at.isoformat(),
            "confidence_score": 1.0,
            "engagement_signal": "discount_accepted",
        }
    
    @staticmethod
    def track_product_usage(
        intervention_id: str,
        usage_increase_percentage: float,
        new_features_adopted: int = 0,
    ) -> Dict[str, Any]:
        """
        Track product usage changes after intervention
        
        Args:
            intervention_id: ID of the intervention
            usage_increase_percentage: % increase in product usage
            new_features_adopted: Number of new features adopted
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "positive",
            "usage_increase_percentage": usage_increase_percentage,
            "new_features_adopted": new_features_adopted,
            "confidence_score": 0.75,
            "engagement_signal": "product_usage_increase",
        }
    
    @staticmethod
    def track_no_response(intervention_id: str, days_since_sent: int) -> Dict[str, Any]:
        """
        Track when no response is received to intervention
        
        Args:
            intervention_id: ID of the intervention
            days_since_sent: Days since intervention was sent
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "no_response",
            "days_since_sent": days_since_sent,
            "confidence_score": 0.5,
            "engagement_signal": "no_response",
        }
    
    @staticmethod
    def track_churn(intervention_id: str, churned_at: datetime) -> Dict[str, Any]:
        """
        Track when an account churns despite intervention
        
        Args:
            intervention_id: ID of the intervention
            churned_at: Time when churn occurred
        
        Returns:
            Outcome data
        """
        return {
            "intervention_id": intervention_id,
            "outcome_status": "churned",
            "churned_at": churned_at.isoformat(),
            "confidence_score": 1.0,
            "engagement_signal": "account_churned",
            "failure_indicator": True,
        }


class OutcomeWebhookHandler:
    """
    Handles incoming webhooks for intervention outcome tracking
    """
    
    @staticmethod
    def process_resend_webhook(webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process webhook from Resend (email service provider)
        
        Events:
        - email.sent
        - email.delivered
        - email.bounced
        - email.complained
        - email.opened
        - email.clicked
        - email.delivery_delayed
        
        Args:
            webhook_data: Webhook payload from Resend
        
        Returns:
            Processed outcome data or None
        """
        try:
            event_type = webhook_data.get("type")
            email_id = webhook_data.get("email_id")
            timestamp = webhook_data.get("timestamp")
            
            if not email_id or not event_type:
                return None
            
            if event_type == "email.opened":
                return {
                    "email_id": email_id,
                    "outcome_type": "email_opened",
                    "timestamp": timestamp,
                    "action": "opened",
                }
            
            elif event_type == "email.clicked":
                return {
                    "email_id": email_id,
                    "outcome_type": "email_clicked",
                    "timestamp": timestamp,
                    "action": "clicked",
                    "link": webhook_data.get("url"),
                }
            
            elif event_type == "email.bounced":
                return {
                    "email_id": email_id,
                    "outcome_type": "email_bounced",
                    "timestamp": timestamp,
                    "action": "bounced",
                    "error": webhook_data.get("error"),
                }
            
            elif event_type == "email.complained":
                return {
                    "email_id": email_id,
                    "outcome_type": "email_complained",
                    "timestamp": timestamp,
                    "action": "complained",
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing Resend webhook: {str(e)}")
            return None
    
    @staticmethod
    def process_calendly_webhook(webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process webhook from Calendly (meeting scheduling)
        
        Events:
        - invitee.created (booking made)
        - invitee.canceled (booking canceled)
        
        Args:
            webhook_data: Webhook payload from Calendly
        
        Returns:
            Processed outcome data or None
        """
        try:
            event_type = webhook_data.get("event")
            payload = webhook_data.get("payload", {})
            
            if event_type == "invitee.created":
                return {
                    "outcome_type": "meeting_scheduled",
                    "event_id": payload.get("event_id"),
                    "invitee_email": payload.get("email"),
                    "scheduled_time": payload.get("event_start_time"),
                    "timestamp": payload.get("created_at"),
                    "action": "scheduled",
                }
            
            elif event_type == "invitee.canceled":
                return {
                    "outcome_type": "meeting_canceled",
                    "event_id": payload.get("event_id"),
                    "invitee_email": payload.get("email"),
                    "timestamp": payload.get("canceled_at"),
                    "action": "canceled",
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing Calendly webhook: {str(e)}")
            return None


def track_engagement_impact(
    churn_score_before: float,
    churn_score_after: float,
    outcome_status: str,
) -> Dict[str, float]:
    """
    Calculate engagement impact metrics
    
    Args:
        churn_score_before: Churn score before intervention
        churn_score_after: Churn score after intervention
        outcome_status: Status of outcome (positive, negative, etc)
    
    Returns:
        Impact metrics
    """
    score_change = churn_score_after - churn_score_before
    score_improvement_percent = (
        (churn_score_before - churn_score_after) / churn_score_before * 100
        if churn_score_before > 0
        else 0
    )
    
    return {
        "churn_score_change": score_change,
        "churn_score_improvement_percent": score_improvement_percent,
        "engagement_change": 0.15 if outcome_status == "positive" else -0.05 if outcome_status == "negative" else 0,
        "impact_score": 0.8 if outcome_status == "positive" else 0.2 if outcome_status == "negative" else 0.5,
    }

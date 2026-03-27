"""
Intervention Execution Engine
Handles execution of retention interventions via email, calendar, and other channels
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import logging

from .email_service import send_email_via_resend, EmailPayload
from .calendly_service import get_calendly_booking_url

logger = logging.getLogger(__name__)


class ExecutionType(str, Enum):
    """Types of intervention execution"""
    EMAIL = "email"
    CALL = "call"
    MEETING = "meeting"
    DISCOUNT_OFFER = "discount_offer"


@dataclass
class InterventionExecution:
    """Details of an intervention execution"""
    intervention_id: str
    account_id: str
    strategy_name: str
    execution_type: ExecutionType
    status: str  # "pending", "sent", "scheduled", "failed"
    details: Dict[str, Any]
    error: Optional[str] = None


class InterventionExecutionEngine:
    """
    Executes retention interventions across multiple channels
    """
    
    def __init__(self):
        pass
    
    def execute_intervention(
        self,
        account_id: str,
        account_name: str,
        contact_email: str,
        contact_name: str,
        strategy_name: str,
        strategy_description: str,
        target_outcome: str,
        suggested_actions: List[Dict[str, str]],
        execution_type: ExecutionType,
        **kwargs
    ) -> InterventionExecution:
        """
        Execute a retention intervention
        
        Args:
            account_id: Account ID
            account_name: Account name
            contact_email: Contact email
            contact_name: Contact name
            strategy_name: Name of the strategy
            strategy_description: Description of the strategy
            target_outcome: Target outcome
            suggested_actions: List of suggested actions
            execution_type: Type of execution (email, call, meeting, discount_offer)
            **kwargs: Additional parameters (e.g., organizer_username for meetings)
        
        Returns:
            InterventionExecution with status and details
        """
        try:
            if execution_type == ExecutionType.EMAIL:
                return self._execute_email_intervention(
                    account_id=account_id,
                    account_name=account_name,
                    contact_email=contact_email,
                    contact_name=contact_name,
                    strategy_name=strategy_name,
                    strategy_description=strategy_description,
                    target_outcome=target_outcome,
                    suggested_actions=suggested_actions,
                )
            
            elif execution_type == ExecutionType.MEETING:
                organizer_username = kwargs.get("organizer_username", "sales")
                return self._execute_meeting_intervention(
                    account_id=account_id,
                    account_name=account_name,
                    contact_email=contact_email,
                    contact_name=contact_name,
                    strategy_name=strategy_name,
                    strategy_description=strategy_description,
                    organizer_username=organizer_username,
                )
            
            elif execution_type == ExecutionType.DISCOUNT_OFFER:
                discount_percentage = kwargs.get("discount_percentage", 10)
                return self._execute_discount_intervention(
                    account_id=account_id,
                    account_name=account_name,
                    contact_email=contact_email,
                    contact_name=contact_name,
                    strategy_name=strategy_name,
                    discount_percentage=discount_percentage,
                )
            
            else:
                return InterventionExecution(
                    intervention_id=f"interv-{account_id}-unknown",
                    account_id=account_id,
                    strategy_name=strategy_name,
                    execution_type=execution_type,
                    status="pending",
                    details={
                        "message": f"Execution type {execution_type} requires manual intervention"
                    },
                    error=f"Unsupported execution type: {execution_type}",
                )
        
        except Exception as e:
            logger.error(f"Error executing intervention: {str(e)}")
            return InterventionExecution(
                intervention_id=f"interv-{account_id}-error",
                account_id=account_id,
                strategy_name=strategy_name,
                execution_type=execution_type,
                status="failed",
                details={},
                error=str(e),
            )
    
    def _execute_email_intervention(
        self,
        account_id: str,
        account_name: str,
        contact_email: str,
        contact_name: str,
        strategy_name: str,
        strategy_description: str,
        target_outcome: str,
        suggested_actions: List[Dict[str, str]],
    ) -> InterventionExecution:
        """
        Execute email-based intervention
        """
        # Build personalized email
        subject = f"Unlocking more value from {account_name}'s account"
        
        html_body = self._build_email_html(
            contact_name=contact_name,
            account_name=account_name,
            strategy_name=strategy_name,
            strategy_description=strategy_description,
            target_outcome=target_outcome,
            suggested_actions=suggested_actions,
        )
        
        # Send email
        email_payload = EmailPayload(
            to=contact_email,
            subject=subject,
            body=html_body,
            reply_to="account-team@company.com",
        )
        
        result = send_email_via_resend(email_payload)
        
        return InterventionExecution(
            intervention_id=f"interv-{account_id}-email",
            account_id=account_id,
            strategy_name=strategy_name,
            execution_type=ExecutionType.EMAIL,
            status="sent" if result.get("status") == "sent" else result.get("status", "pending"),
            details={
                "email_to": contact_email,
                "subject": subject,
                "status": result.get("status"),
                "message_id": result.get("id"),
            },
            error=result.get("error"),
        )
    
    def _execute_meeting_intervention(
        self,
        account_id: str,
        account_name: str,
        contact_email: str,
        contact_name: str,
        strategy_name: str,
        strategy_description: str,
        organizer_username: str,
    ) -> InterventionExecution:
        """
        Execute meeting scheduling intervention
        """
        # Get Calendly booking link
        booking_url = get_calendly_booking_url(organizer_username)
        
        if not booking_url:
            return InterventionExecution(
                intervention_id=f"interv-{account_id}-meeting",
                account_id=account_id,
                strategy_name=strategy_name,
                execution_type=ExecutionType.MEETING,
                status="failed",
                details={},
                error="Calendly not configured",
            )
        
        # Send meeting request email with Calendly link
        subject = f"Let's schedule a business review for {account_name}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hi {contact_name},</p>
            
            <p>I'd like to schedule a time to discuss how we can help {account_name} 
            achieve its goals with our platform.</p>
            
            <p><strong>Strategy: {strategy_name}</strong></p>
            <p>{strategy_description}</p>
            
            <p style="margin: 20px 0;">
                <a href="{booking_url}" 
                   style="background-color: #0066cc; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px;">
                    Schedule a Meeting
                </a>
            </p>
            
            <p>Looking forward to connecting!</p>
            <p>Best regards,<br>Your Account Team</p>
        </body>
        </html>
        """
        
        # Send the meeting invitation email
        email_payload = EmailPayload(
            to=contact_email,
            subject=subject,
            body=html_body,
            reply_to="account-team@company.com",
        )
        
        result = send_email_via_resend(email_payload)
        
        return InterventionExecution(
            intervention_id=f"interv-{account_id}-meeting",
            account_id=account_id,
            strategy_name=strategy_name,
            execution_type=ExecutionType.MEETING,
            status="scheduled" if result.get("status") == "sent" else result.get("status", "pending"),
            details={
                "email_to": contact_email,
                "booking_url": booking_url,
                "subject": subject,
                "status": result.get("status"),
            },
            error=result.get("error"),
        )
    
    def _execute_discount_intervention(
        self,
        account_id: str,
        account_name: str,
        contact_email: str,
        contact_name: str,
        strategy_name: str,
        discount_percentage: int = 10,
    ) -> InterventionExecution:
        """
        Execute discount offer intervention
        """
        subject = f"Special renewal offer for {account_name}"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hi {contact_name},</p>
            
            <p>As a valued customer, we want to ensure you continue to receive 
            exceptional value from our platform.</p>
            
            <p style="background-color: #f0f0f0; padding: 20px; text-align: center;
                      border-radius: 5px; margin: 20px 0;">
                <strong style="font-size: 24px; color: #0066cc;">
                    {discount_percentage}% OFF
                </strong>
                <br>
                <span style="font-size: 18px;">Your renewal</span>
            </p>
            
            <p>This special offer is valid only until the end of this month.</p>
            
            <p>Please reply to this email or contact us to discuss the next steps.</p>
            
            <p>Best regards,<br>Your Account Team</p>
        </body>
        </html>
        """
        
        email_payload = EmailPayload(
            to=contact_email,
            subject=subject,
            body=html_body,
            reply_to="account-team@company.com",
        )
        
        result = send_email_via_resend(email_payload)
        
        return InterventionExecution(
            intervention_id=f"interv-{account_id}-discount",
            account_id=account_id,
            strategy_name=strategy_name,
            execution_type=ExecutionType.DISCOUNT_OFFER,
            status="sent" if result.get("status") == "sent" else result.get("status", "pending"),
            details={
                "email_to": contact_email,
                "discount_percentage": discount_percentage,
                "subject": subject,
                "status": result.get("status"),
            },
            error=result.get("error"),
        )
    
    @staticmethod
    def _build_email_html(
        contact_name: str,
        account_name: str,
        strategy_name: str,
        strategy_description: str,
        target_outcome: str,
        suggested_actions: List[Dict[str, str]],
    ) -> str:
        """Build HTML email body for intervention"""
        
        actions_html = ""
        for idx, action in enumerate(suggested_actions, 1):
            action_text = action.get("action", "")
            timeline = action.get("timeline", "")
            actions_html += f"""
            <li style="margin-bottom: 10px;">
                <strong>{action_text}</strong>
                {f'<br><small>Timeline: {timeline}</small>' if timeline else ''}
            </li>
            """
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hi {contact_name},</p>
            
            <p>I hope this message finds you well! I wanted to reach out to discuss 
            an opportunity to help {account_name} get even more value from our platform.</p>
            
            <h2 style="color: #0066cc; font-size: 18px; margin-top: 20px;">
                {strategy_name}
            </h2>
            
            <p>{strategy_description}</p>
            
            <h3 style="color: #333; font-size: 16px; margin-top: 15px;">Target Outcome</h3>
            <p>{target_outcome}</p>
            
            <h3 style="color: #333; font-size: 16px; margin-top: 15px;">Suggested Actions</h3>
            <ul style="margin: 10px 0;">
                {actions_html}
            </ul>
            
            <p style="margin-top: 20px;">
                I'd love to schedule a time to discuss this in more detail. 
                Please let me know your availability.
            </p>
            
            <p>Best regards,<br>Your Account Team</p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                This is a personalized message based on your account activity.
            </p>
        </body>
        </html>
        """
        
        return html


# Example usage
if __name__ == "__main__":
    engine = InterventionExecutionEngine()
    
    # Example email execution
    result = engine.execute_intervention(
        account_id="acc_001",
        account_name="TechCorp Industries",
        contact_email="john.doe@techcorp.com",
        contact_name="John Doe",
        strategy_name="Executive Business Review",
        strategy_description="Schedule a comprehensive business review with leadership",
        target_outcome="Align on value and identify growth opportunities",
        suggested_actions=[
            {"action": "Schedule 60-minute review meeting", "timeline": "Next 7 days"},
            {"action": "Prepare ROI analysis", "timeline": "Before meeting"},
        ],
        execution_type=ExecutionType.EMAIL,
    )
    
    print(f"Intervention Execution Result:")
    print(f"  Status: {result.status}")
    print(f"  Details: {result.details}")
    if result.error:
        print(f"  Error: {result.error}")

"""
Real-time Alert System
Sends alerts to account teams and executives about critical churn risks and outcomes
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AlertChannel(str, Enum):
    """Alert delivery channels"""
    EMAIL = "email"
    SLACK = "slack"
    SMS = "sms"
    WEBHOOK = "webhook"
    DASHBOARD = "dashboard"


class AlertType(str, Enum):
    """Types of alerts"""
    CRITICAL_RISK_DETECTED = "critical_risk_detected"
    HIGH_RISK_DETECTED = "high_risk_detected"
    INTERVENTION_NEEDED = "intervention_needed"
    POSITIVE_OUTCOME = "positive_outcome"
    NEGATIVE_OUTCOME = "negative_outcome"
    RENEWAL_AT_RISK = "renewal_at_risk"
    INTERVENTION_RESPONSE_RECEIVED = "intervention_response_received"


class RealtimeAlert:
    """Represents a real-time alert"""
    
    def __init__(
        self,
        alert_id: str,
        alert_type: AlertType,
        severity: AlertSeverity,
        account_id: str,
        account_name: str,
        title: str,
        message: str,
        data: Dict[str, Any],
        channels: List[AlertChannel],
        assignee: Optional[str] = None,
        required_action: Optional[str] = None,
    ):
        self.alert_id = alert_id
        self.alert_type = alert_type
        self.severity = severity
        self.account_id = account_id
        self.account_name = account_name
        self.title = title
        self.message = message
        self.data = data
        self.channels = channels
        self.assignee = assignee
        self.required_action = required_action
        self.created_at = datetime.utcnow()
        self.status = "active"  # active, acknowledged, resolved


class AlertRuleEngine:
    """
    Evaluates churn indicators and generates alerts based on rules
    """
    
    def __init__(self):
        self.rules = self._load_default_rules()
    
    def evaluate_account(
        self,
        account_id: str,
        account_name: str,
        churn_score: float,
        risk_level: str,
        key_risk_factors: List[str],
        days_until_renewal: int,
        last_login_days_ago: int,
        unresolved_tickets: int,
    ) -> List[RealtimeAlert]:
        """
        Evaluate an account and generate alerts based on rules
        
        Args:
            account_id: Account ID
            account_name: Account name
            churn_score: Churn risk score (0.0-1.0)
            risk_level: Risk level (low, medium, high, critical)
            key_risk_factors: List of risk factors
            days_until_renewal: Days until renewal
            last_login_days_ago: Days since last login
            unresolved_tickets: Number of unresolved support tickets
        
        Returns:
            List of generated alerts
        """
        alerts = []
        
        # Critical risk alert
        if churn_score >= 0.85:
            alerts.append(self._create_alert(
                alert_type=AlertType.CRITICAL_RISK_DETECTED,
                severity=AlertSeverity.CRITICAL,
                account_id=account_id,
                account_name=account_name,
                churn_score=churn_score,
                risk_level=risk_level,
                risk_factors=key_risk_factors,
                days_until_renewal=days_until_renewal,
            ))
        
        # High risk alert
        elif churn_score >= 0.70:
            alerts.append(self._create_alert(
                alert_type=AlertType.HIGH_RISK_DETECTED,
                severity=AlertSeverity.HIGH,
                account_id=account_id,
                account_name=account_name,
                churn_score=churn_score,
                risk_level=risk_level,
                risk_factors=key_risk_factors,
                days_until_renewal=days_until_renewal,
            ))
        
        # Renewal at risk (less than 60 days AND high risk)
        if days_until_renewal < 60 and churn_score >= 0.60:
            alerts.append(self._create_alert(
                alert_type=AlertType.RENEWAL_AT_RISK,
                severity=AlertSeverity.HIGH if churn_score >= 0.70 else AlertSeverity.MEDIUM,
                account_id=account_id,
                account_name=account_name,
                churn_score=churn_score,
                risk_level=risk_level,
                days_until_renewal=days_until_renewal,
            ))
        
        # No login in 60+ days alert
        if last_login_days_ago >= 60:
            alerts.append(self._create_alert(
                alert_type=AlertType.INTERVENTION_NEEDED,
                severity=AlertSeverity.HIGH,
                account_id=account_id,
                account_name=account_name,
                title="Account showing zero engagement",
                message=f"No login activity for {last_login_days_ago} days. Immediate outreach recommended.",
                required_action="Schedule customer check-in call",
            ))
        
        # Unresolved critical support issue
        if unresolved_tickets >= 3:
            alerts.append(self._create_alert(
                alert_type=AlertType.INTERVENTION_NEEDED,
                severity=AlertSeverity.HIGH,
                account_id=account_id,
                account_name=account_name,
                title="Critical: Multiple unresolved support issues",
                message=f"{unresolved_tickets} support tickets remain unresolved. Customer satisfaction at risk.",
                required_action="Assign support specialist for resolution sprint",
            ))
        
        return alerts
    
    def evaluate_intervention_response(
        self,
        account_id: str,
        account_name: str,
        intervention_type: str,
        outcome_status: str,
        churn_score_before: float,
        churn_score_after: float,
    ) -> Optional[RealtimeAlert]:
        """
        Evaluate intervention response and generate alert if needed
        
        Args:
            account_id: Account ID
            account_name: Account name
            intervention_type: Type of intervention
            outcome_status: Status of outcome
            churn_score_before: Churn score before intervention
            churn_score_after: Churn score after intervention
        
        Returns:
            Alert or None
        """
        
        # Positive outcome
        if outcome_status in ["positive", "engaged", "meeting_scheduled"]:
            score_improvement = (churn_score_before - churn_score_after) / churn_score_before * 100
            return self._create_alert(
                alert_type=AlertType.POSITIVE_OUTCOME,
                severity=AlertSeverity.LOW,
                account_id=account_id,
                account_name=account_name,
                title=f"Positive response to {intervention_type} intervention",
                message=f"Account showing engagement. Churn risk improved by {score_improvement:.0f}%",
                data={
                    "intervention_type": intervention_type,
                    "outcome_status": outcome_status,
                    "churn_score_improvement_percent": score_improvement,
                },
            )
        
        # Negative outcome
        elif outcome_status == "negative":
            return self._create_alert(
                alert_type=AlertType.NEGATIVE_OUTCOME,
                severity=AlertSeverity.HIGH,
                account_id=account_id,
                account_name=account_name,
                title=f"Negative response to {intervention_type}",
                message="Account expressed dissatisfaction. Escalation may be needed.",
                data={"intervention_type": intervention_type},
            )
        
        return None
    
    def _load_default_rules(self) -> List[Dict[str, Any]]:
        """Load default alert rules"""
        return [
            {
                "name": "Critical Churn Risk",
                "condition": "churn_score >= 0.85",
                "severity": AlertSeverity.CRITICAL,
                "channels": [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD],
            },
            {
                "name": "High Churn Risk",
                "condition": "churn_score >= 0.70",
                "severity": AlertSeverity.HIGH,
                "channels": [AlertChannel.EMAIL, AlertChannel.DASHBOARD],
            },
            {
                "name": "Renewal at Risk",
                "condition": "days_until_renewal < 60 and churn_score >= 0.60",
                "severity": AlertSeverity.HIGH,
                "channels": [AlertChannel.EMAIL, AlertChannel.DASHBOARD],
            },
        ]
    
    @staticmethod
    def _create_alert(
        alert_type: AlertType,
        severity: AlertSeverity,
        account_id: str,
        account_name: str,
        title: Optional[str] = None,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        required_action: Optional[str] = None,
        **kwargs,
    ) -> RealtimeAlert:
        """Create an alert"""
        
        # Default title and message
        if not title:
            title_map = {
                AlertType.CRITICAL_RISK_DETECTED: "CRITICAL: Severe churn risk detected",
                AlertType.HIGH_RISK_DETECTED: "High churn risk detected",
                AlertType.INTERVENTION_NEEDED: "Immediate intervention required",
                AlertType.POSITIVE_OUTCOME: "Positive engagement signal received",
                AlertType.NEGATIVE_OUTCOME: "Negative response from customer",
                AlertType.RENEWAL_AT_RISK: "Contract renewal at risk",
                AlertType.INTERVENTION_RESPONSE_RECEIVED: "Customer response to intervention",
            }
            title = title_map.get(alert_type, "Account Alert")
        
        if not message:
            churn_score = kwargs.get("churn_score", 0)
            risk_level = kwargs.get("risk_level", "unknown")
            days_until_renewal = kwargs.get("days_until_renewal", 0)
            
            message = f"{account_name}: Churn risk {churn_score:.0%} ({risk_level})"
            if days_until_renewal > 0:
                message += f", renewal in {days_until_renewal} days"
        
        if not data:
            data = kwargs
        
        # Determine channels based on severity
        channels = [AlertChannel.DASHBOARD]
        if severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
            channels.extend([AlertChannel.EMAIL, AlertChannel.SLACK if severity == AlertSeverity.CRITICAL else ""])
            channels = [c for c in channels if c]
        
        return RealtimeAlert(
            alert_id=f"alert-{account_id}-{datetime.utcnow().timestamp()}",
            alert_type=alert_type,
            severity=severity,
            account_id=account_id,
            account_name=account_name,
            title=title,
            message=message,
            data=data,
            channels=channels,
            required_action=required_action,
        )


class AlertDispatcher:
    """
    Dispatches alerts to various channels (email, Slack, SMS, webhooks)
    """
    
    def dispatch_alert(
        self,
        alert: RealtimeAlert,
        recipients: Dict[str, List[str]],
    ) -> Dict[str, bool]:
        """
        Dispatch alert to specified channels
        
        Args:
            alert: Alert to dispatch
            recipients: Dict of channel -> email/phone/webhook_url
        
        Returns:
            Dict of channel -> success status
        """
        results = {}
        
        for channel in alert.channels:
            if channel == AlertChannel.EMAIL:
                results[channel.value] = self._send_email_alert(alert, recipients.get("email", []))
            
            elif channel == AlertChannel.SLACK:
                results[channel.value] = self._send_slack_alert(alert, recipients.get("slack_webhook"))
            
            elif channel == AlertChannel.SMS:
                results[channel.value] = self._send_sms_alert(alert, recipients.get("phone", []))
            
            elif channel == AlertChannel.WEBHOOK:
                results[channel.value] = self._send_webhook_alert(alert, recipients.get("webhook_url"))
            
            elif channel == AlertChannel.DASHBOARD:
                results[channel.value] = self._store_dashboard_alert(alert)
        
        return results
    
    @staticmethod
    def _send_email_alert(alert: RealtimeAlert, recipients: List[str]) -> bool:
        """Send alert via email"""
        try:
            # TODO: Implement email sending
            logger.info(f"Email alert sent to {recipients}: {alert.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
            return False
    
    @staticmethod
    def _send_slack_alert(alert: RealtimeAlert, webhook_url: Optional[str]) -> bool:
        """Send alert to Slack"""
        try:
            if not webhook_url:
                return False
            
            # TODO: Implement Slack webhook
            logger.info(f"Slack alert sent: {alert.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {str(e)}")
            return False
    
    @staticmethod
    def _send_sms_alert(alert: RealtimeAlert, recipients: List[str]) -> bool:
        """Send alert via SMS"""
        try:
            # TODO: Implement SMS sending
            logger.info(f"SMS alert sent to {recipients}: {alert.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS alert: {str(e)}")
            return False
    
    @staticmethod
    def _send_webhook_alert(alert: RealtimeAlert, webhook_url: Optional[str]) -> bool:
        """Send alert via webhook"""
        try:
            if not webhook_url:
                return False
            
            # TODO: Implement webhook sending
            logger.info(f"Webhook alert sent: {alert.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {str(e)}")
            return False
    
    @staticmethod
    def _store_dashboard_alert(alert: RealtimeAlert) -> bool:
        """Store alert for dashboard display"""
        try:
            # TODO: Store in database for dashboard
            logger.info(f"Alert stored for dashboard: {alert.title}")
            return True
        except Exception as e:
            logger.error(f"Failed to store dashboard alert: {str(e)}")
            return False


# Example usage
if __name__ == "__main__":
    # Test the alert system
    engine = AlertRuleEngine()
    
    alerts = engine.evaluate_account(
        account_id="acc_001",
        account_name="TechCorp Industries",
        churn_score=0.82,
        risk_level="critical",
        key_risk_factors=["No logins in 60 days", "High support ticket volume"],
        days_until_renewal=45,
        last_login_days_ago=120,
        unresolved_tickets=3,
    )
    
    print(f"Generated {len(alerts)} alerts:\n")
    for alert in alerts:
        print(f"• {alert.title}")
        print(f"  Severity: {alert.severity.value}")
        print(f"  Message: {alert.message}")
        print()
    
    # Test intervention response alert
    response_alert = engine.evaluate_intervention_response(
        account_id="acc_001",
        account_name="TechCorp Industries",
        intervention_type="Executive Business Review",
        outcome_status="positive",
        churn_score_before=0.82,
        churn_score_after=0.45,
    )
    
    if response_alert:
        print(f"Response Alert: {response_alert.title}")
        print(f"Message: {response_alert.message}")

"""
Alert Preferences Management
Allows customers to configure how they receive alerts
"""

from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum


class AlertPreference:
    """Represents user alert preferences"""
    
    def __init__(
        self,
        user_id: str,
        account_id: str,
        enabled_alerts: List[str],  # List of AlertType values
        preferred_channels: List[str],  # List of AlertChannel values
        quiet_hours_start: Optional[str] = None,  # HH:MM format
        quiet_hours_end: Optional[str] = None,    # HH:MM format
        alert_threshold_critical: float = 0.85,   # Churn score threshold for critical alerts
        alert_threshold_high: float = 0.70,       # Churn score threshold for high alerts
        digest_frequency: str = "real-time",      # real-time, daily, weekly
        created_at: Optional[datetime] = None,
    ):
        self.user_id = user_id
        self.account_id = account_id
        self.enabled_alerts = enabled_alerts
        self.preferred_channels = preferred_channels
        self.quiet_hours_start = quiet_hours_start
        self.quiet_hours_end = quiet_hours_end
        self.alert_threshold_critical = alert_threshold_critical
        self.alert_threshold_high = alert_threshold_high
        self.digest_frequency = digest_frequency
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = datetime.utcnow()


class AlertPreferenceManager:
    """
    Manages alert preferences for users and accounts
    """
    
    # Default preferences
    DEFAULT_ENABLED_ALERTS = [
        "critical_risk_detected",
        "renewal_at_risk",
        "intervention_needed",
        "intervention_response_received",
    ]
    
    DEFAULT_CHANNELS = ["email", "dashboard"]
    
    def __init__(self):
        # In-memory store (TODO: use database)
        self.preferences: Dict[str, AlertPreference] = {}
    
    def get_user_preferences(
        self,
        user_id: str,
        account_id: str,
    ) -> AlertPreference:
        """
        Get alert preferences for a user
        
        Args:
            user_id: User ID
            account_id: Account ID
        
        Returns:
            AlertPreference object
        """
        key = f"{account_id}:{user_id}"
        
        if key not in self.preferences:
            # Return default preferences
            return AlertPreference(
                user_id=user_id,
                account_id=account_id,
                enabled_alerts=self.DEFAULT_ENABLED_ALERTS,
                preferred_channels=self.DEFAULT_CHANNELS,
            )
        
        return self.preferences[key]
    
    def update_preferences(
        self,
        user_id: str,
        account_id: str,
        enabled_alerts: Optional[List[str]] = None,
        preferred_channels: Optional[List[str]] = None,
        quiet_hours_start: Optional[str] = None,
        quiet_hours_end: Optional[str] = None,
        alert_threshold_critical: Optional[float] = None,
        alert_threshold_high: Optional[float] = None,
        digest_frequency: Optional[str] = None,
    ) -> AlertPreference:
        """
        Update alert preferences for a user
        
        Args:
            user_id: User ID
            account_id: Account ID
            enabled_alerts: List of alert types to enable
            preferred_channels: List of preferred notification channels
            quiet_hours_start: Start of quiet hours (HH:MM)
            quiet_hours_end: End of quiet hours (HH:MM)
            alert_threshold_critical: Churn score threshold for critical alerts
            alert_threshold_high: Churn score threshold for high alerts
            digest_frequency: Frequency of alerts (real-time, daily, weekly)
        
        Returns:
            Updated AlertPreference object
        """
        key = f"{account_id}:{user_id}"
        
        # Get existing or create new
        if key in self.preferences:
            prefs = self.preferences[key]
        else:
            prefs = AlertPreference(
                user_id=user_id,
                account_id=account_id,
                enabled_alerts=self.DEFAULT_ENABLED_ALERTS,
                preferred_channels=self.DEFAULT_CHANNELS,
            )
        
        # Update fields
        if enabled_alerts is not None:
            prefs.enabled_alerts = enabled_alerts
        if preferred_channels is not None:
            prefs.preferred_channels = preferred_channels
        if quiet_hours_start is not None:
            prefs.quiet_hours_start = quiet_hours_start
        if quiet_hours_end is not None:
            prefs.quiet_hours_end = quiet_hours_end
        if alert_threshold_critical is not None:
            prefs.alert_threshold_critical = alert_threshold_critical
        if alert_threshold_high is not None:
            prefs.alert_threshold_high = alert_threshold_high
        if digest_frequency is not None:
            prefs.digest_frequency = digest_frequency
        
        prefs.updated_at = datetime.utcnow()
        self.preferences[key] = prefs
        
        return prefs
    
    def is_in_quiet_hours(self, user_id: str, account_id: str) -> bool:
        """
        Check if current time is within user's quiet hours
        
        Args:
            user_id: User ID
            account_id: Account ID
        
        Returns:
            True if in quiet hours, False otherwise
        """
        prefs = self.get_user_preferences(user_id, account_id)
        
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        from datetime import datetime as dt
        now = dt.now().time()
        start = dt.strptime(prefs.quiet_hours_start, "%H:%M").time()
        end = dt.strptime(prefs.quiet_hours_end, "%H:%M").time()
        
        if start <= end:
            return start <= now <= end
        else:
            # Spans midnight
            return now >= start or now <= end
    
    def should_send_alert(
        self,
        user_id: str,
        account_id: str,
        alert_type: str,
        alert_severity: str,
    ) -> bool:
        """
        Determine if alert should be sent based on preferences
        
        Args:
            user_id: User ID
            account_id: Account ID
            alert_type: Type of alert
            alert_severity: Severity level
        
        Returns:
            True if alert should be sent, False otherwise
        """
        prefs = self.get_user_preferences(user_id, account_id)
        
        # Check if alert type is enabled
        if alert_type not in prefs.enabled_alerts:
            return False
        
        # Check quiet hours (only for non-critical)
        if alert_severity != "critical" and self.is_in_quiet_hours(user_id, account_id):
            return False
        
        return True
    
    def get_account_alert_recipients(
        self,
        account_id: str,
        alert_type: str,
        alert_severity: str,
    ) -> Dict[str, List[str]]:
        """
        Get all recipients for an account that want this alert
        
        Args:
            account_id: Account ID
            alert_type: Type of alert
            alert_severity: Severity level
        
        Returns:
            Dict of channel -> recipient list
        """
        recipients = {}
        
        # TODO: Query database for users in account
        # For now return empty dict
        return recipients
    
    def get_alert_statistics(self, account_id: str) -> Dict[str, any]:
        """
        Get alert statistics for an account
        
        Args:
            account_id: Account ID
        
        Returns:
            Dict with alert stats
        """
        return {
            "total_users": 0,
            "alerts_enabled": 0,
            "most_common_channel": "email",
            "avg_alert_threshold": 0.75,
        }


# Example usage and default alert type configurations
ALERT_CONFIGURATIONS = {
    "critical_risk_detected": {
        "description": "Account has high risk of churning (score ≥85%)",
        "recommended_channels": ["email", "slack", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
    "high_risk_detected": {
        "description": "Account has elevated risk of churning (score ≥70%)",
        "recommended_channels": ["email", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
    "renewal_at_risk": {
        "description": "Renewal is approaching and account is at risk",
        "recommended_channels": ["email", "slack", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
    "intervention_needed": {
        "description": "Immediate action required (e.g., no login in 60+ days)",
        "recommended_channels": ["email", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
    "intervention_response_received": {
        "description": "Customer engaged with intervention",
        "recommended_channels": ["email", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
    "positive_outcome": {
        "description": "Positive engagement signal received",
        "recommended_channels": ["dashboard"],
        "recommended_frequency": "daily",
        "default_enabled": False,
    },
    "negative_outcome": {
        "description": "Negative response from customer",
        "recommended_channels": ["email", "slack", "dashboard"],
        "recommended_frequency": "real-time",
        "default_enabled": True,
    },
}


if __name__ == "__main__":
    # Test alert preferences
    manager = AlertPreferenceManager()
    
    # Get default preferences
    prefs = manager.get_user_preferences("user_123", "acc_001")
    print(f"Default enabled alerts: {prefs.enabled_alerts}")
    print(f"Default channels: {prefs.preferred_channels}")
    
    # Update preferences
    updated = manager.update_preferences(
        "user_123",
        "acc_001",
        preferred_channels=["slack", "email"],
        alert_threshold_critical=0.80,
        digest_frequency="daily",
    )
    print(f"\nUpdated alert threshold: {updated.alert_threshold_critical}")
    print(f"Updated digest frequency: {updated.digest_frequency}")

"""
Real-Time Alert System - Usage Examples
Demonstrates how to use the alert system in various scenarios
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:5000"
HEADERS = {"Content-Type": "application/json"}


# ============================================================================
# Example 1: Detect Critical Risk and Generate Alerts
# ============================================================================

def example_1_critical_risk_detection():
    """
    Scenario: Account shows critical churn risk after engagement analysis.
    Action: Generate and dispatch alerts to account team.
    """
    print("\n" + "="*70)
    print("EXAMPLE 1: Critical Risk Detection")
    print("="*70)
    
    # Step 1: Calculate churn score for account
    print("\n1. Calculate Churn Score...")
    score_response = requests.post(
        f"{API_BASE_URL}/agent/retention/score",
        headers=HEADERS,
        json={
            "account_id": "acc_001",
            "tenant_id": "tenant_001",
            "account_name": "TechCorp Industries",
            "logins_last_30_days": 2,  # Very low engagement
            "active_users": 1,
            "total_users": 50,
            "api_calls_last_30_days": 0,
            "support_tickets_critical": 2,  # Critical issues open
            "support_tickets_total": 5,
            "unresolved_tickets": 3,
            "days_until_renewal": 45,
            "annual_contract_value": 100000,
            "last_login_days_ago": 120,  # No login in 4 months
        }
    )
    
    score_data = score_response.json()
    churn_score = score_data["churn_risk_score"]
    risk_level = score_data["risk_level"]
    key_factors = score_data["key_risk_factors"]
    
    print(f"   Churn Score: {churn_score} ({risk_level})")
    print(f"   Risk Factors: {', '.join(key_factors)}")
    
    # Step 2: Check for alerts
    print("\n2. Check for Alerts...")
    alert_response = requests.post(
        f"{API_BASE_URL}/agent/retention/alerts/check",
        headers=HEADERS,
        json={
            "account_id": "acc_001",
            "tenant_id": "tenant_001",
            "account_name": "TechCorp Industries",
            "churn_score": churn_score,
            "risk_level": risk_level,
            "key_risk_factors": key_factors,
            "days_until_renewal": 45,
            "last_login_days_ago": 120,
            "unresolved_tickets": 3,
        }
    )
    
    alert_data = alert_response.json()
    alerts = alert_data["alerts"]
    
    print(f"   Alerts Generated: {alert_data['alerts_generated']}")
    for alert in alerts:
        print(f"\n   • {alert['severity'].upper()}: {alert['title']}")
        print(f"     Channels: {', '.join(alert['channels'])}")
        print(f"     Action: {alert.get('required_action', 'N/A')}")
    
    # Step 3: Display active alerts
    print("\n3. Retrieve Active Alerts...")
    get_alerts_response = requests.get(
        f"{API_BASE_URL}/agent/retention/alerts",
        headers=HEADERS,
        params={
            "account_id": "acc_001",
            "status": "active",
        }
    )
    
    alerts_data = get_alerts_response.json()
    print(f"   Total Active Alerts: {alerts_data['total_count']}")
    print(f"   Critical Alerts: {alerts_data['critical_count']}")
    print(f"   High Alerts: {alerts_data['high_count']}")


# ============================================================================
# Example 2: Customize Alert Preferences
# ============================================================================

def example_2_customize_preferences():
    """
    Scenario: Account manager wants to customize how they receive alerts.
    Action: Update alert preferences for the user.
    """
    print("\n" + "="*70)
    print("EXAMPLE 2: Customize Alert Preferences")
    print("="*70)
    
    user_id = "user_001"
    account_id = "acc_001"
    
    # Step 1: Get current preferences
    print("\n1. Get Current Preferences...")
    get_prefs_response = requests.get(
        f"{API_BASE_URL}/agent/retention/alerts/preferences",
        headers=HEADERS,
        params={
            "user_id": user_id,
            "account_id": account_id,
        }
    )
    
    prefs_data = get_prefs_response.json()
    print(f"   Enabled Alerts: {prefs_data['preferences']['enabled_alerts']}")
    print(f"   Channels: {prefs_data['preferences']['preferred_channels']}")
    print(f"   Frequency: {prefs_data['preferences']['digest_frequency']}")
    
    # Step 2: Update preferences
    print("\n2. Update Preferences...")
    update_response = requests.post(
        f"{API_BASE_URL}/agent/retention/alerts/preferences",
        headers=HEADERS,
        json={
            "user_id": user_id,
            "account_id": account_id,
            "enabled_alerts": [
                "critical_risk_detected",
                "renewal_at_risk",
                "positive_outcome",  # Now also want positive news
            ],
            "preferred_channels": ["slack", "email"],  # Also add Slack
            "quiet_hours_start": "18:00",  # No alerts after 6 PM
            "quiet_hours_end": "08:00",    # Resume at 8 AM
            "alert_threshold_critical": 0.80,  # Lower threshold to 80%
            "digest_frequency": "daily",  # Daily digest instead of real-time
        }
    )
    
    updated = update_response.json()
    print(f"   ✓ Preferences Updated")
    print(f"   Channels: {updated['preferences']['preferred_channels']}")
    print(f"   Quiet Hours: {updated['preferences']['quiet_hours_start']} - {updated['preferences']['quiet_hours_end']}")
    print(f"   Digest: {updated['preferences']['digest_frequency']}")


# ============================================================================
# Example 3: Positive Outcome After Intervention
# ============================================================================

def example_3_positive_outcome():
    """
    Scenario: After executing an intervention, customer shows positive engagement.
    Action: Track the positive outcome and generate achievement alert.
    """
    print("\n" + "="*70)
    print("EXAMPLE 3: Positive Outcome After Intervention")
    print("="*70)
    
    account_id = "acc_002"
    intervention_id = "int_001"
    
    # Step 1: Record positive engagement
    print("\n1. Record Positive Engagement (Email Opened)...")
    outcome_response = requests.post(
        f"{API_BASE_URL}/agent/retention/record-outcome",
        headers=HEADERS,
        json={
            "intervention_id": intervention_id,
            "account_id": account_id,
            "outcome_type": "email_opened",
            "churn_score_before": 0.72,
            "churn_score_after": 0.55,  # Score improved!
        }
    )
    
    outcome_data = outcome_response.json()
    print(f"   ✓ Outcome Recorded: {outcome_data['outcome_type']}")
    print(f"   Impact: Churn score improved from 0.72 → 0.55")
    
    # Step 2: Track meeting scheduled
    print("\n2. Record Meeting Scheduled...")
    meeting_response = requests.post(
        f"{API_BASE_URL}/agent/retention/record-outcome",
        headers=HEADERS,
        json={
            "intervention_id": intervention_id,
            "account_id": account_id,
            "outcome_type": "meeting_scheduled",
            "meeting_time": datetime.utcnow().isoformat(),
            "churn_score_before": 0.55,
            "churn_score_after": 0.35,  # Further improvement!
        }
    )
    
    print(f"   ✓ Meeting Scheduled")
    print(f"   Impact: Churn score improved from 0.55 → 0.35")
    
    # Step 3: Check alerts for positive feedback
    print("\n3. Positive Outcome Alert Generated...")
    alerts_response = requests.get(
        f"{API_BASE_URL}/agent/retention/alerts",
        params={"account_id": account_id}
    )
    
    alerts = alerts_response.json()["alerts"]
    positive_alerts = [a for a in alerts if "positive" in a.get("alert_type", "")]
    
    print(f"   ✓ {len(positive_alerts)} Positive Outcome Alerts")
    for alert in positive_alerts:
        print(f"   • {alert['title']}")


# ============================================================================
# Example 4: Renewal Coming Up
# ============================================================================

def example_4_renewal_at_risk():
    """
    Scenario: Contract renewal is approaching but account shows churn signals.
    Action: Generate renewal-at-risk alert with action items.
    """
    print("\n" + "="*70)
    print("EXAMPLE 4: Renewal at Risk Alert")
    print("="*70)
    
    account_id = "acc_003"
    
    print("\n1. Account Status:")
    print("   • Days until renewal: 30 (approaching!)")
    print("   • Churn score: 0.68 (elevated risk)")
    print("   • Engagement: Declining usage, no new feature adoption")
    
    # Check for alerts
    print("\n2. Generate Alerts...")
    alert_response = requests.post(
        f"{API_BASE_URL}/agent/retention/alerts/check",
        headers=HEADERS,
        json={
            "account_id": account_id,
            "tenant_id": "tenant_001",
            "churn_score": 0.68,
            "risk_level": "high",
            "days_until_renewal": 30,
            "last_login_days_ago": 14,
            "unresolved_tickets": 1,
        }
    )
    
    alerts = alert_response.json()["alerts"]
    renewal_alerts = [a for a in alerts if "renewal" in a.get("alert_type", "")]
    
    for alert in renewal_alerts:
        print(f"\n   ✓ {alert['severity'].upper()}: {alert['title']}")
        print(f"     Required Action: {alert.get('required_action', 'N/A')}")
        print(f"     Channels: {', '.join(alert['channels'])}")


# ============================================================================
# Example 5: Handle No Response Situation
# ============================================================================

def example_5_no_response():
    """
    Scenario: Intervention was sent but customer has not engaged for 7 days.
    Action: Track no-response and escalate if needed.
    """
    print("\n" + "="*70)
    print("EXAMPLE 5: No Response After Intervention")
    print("="*70)
    
    intervention_id = "int_002"
    account_id = "acc_004"
    
    print("\n1. Track No Response...")
    no_response_response = requests.post(
        f"{API_BASE_URL}/agent/retention/record-outcome",
        headers=HEADERS,
        json={
            "intervention_id": intervention_id,
            "account_id": account_id,
            "outcome_type": "no_response",
            "days_since_sent": 7,
        }
    )
    
    print("   ✓ No Response Recorded (7 days)")
    
    print("\n2. Check Alert Status...")
    alerts_response = requests.get(
        f"{API_BASE_URL}/agent/retention/alerts",
        params={"account_id": account_id}
    )
    
    alerts = alerts_response.json()["alerts"]
    print(f"   Total Alerts: {alerts_response.json()['total_count']}")
    
    # Identify if escalation alert was generated
    escalation_alerts = [a for a in alerts if a["severity"] in ["critical", "high"]]
    if escalation_alerts:
        print(f"\n   ! Escalation Required:")
        for alert in escalation_alerts:
            print(f"   • {alert['title']}")
            print(f"     Action: {alert.get('required_action', 'N/A')}")


# ============================================================================
# Example 6: Account Team Dashboard View
# ============================================================================

def example_6_dashboard_summary():
    """
    Scenario: Customer success manager wants to see dashboard of all alerts.
    Action: Retrieve and display alert summary.
    """
    print("\n" + "="*70)
    print("EXAMPLE 6: Dashboard View - All Active Alerts")
    print("="*70)
    
    print("\n1. Retrieve Dashboard Summary...")
    dashboard_response = requests.post(
        f"{API_BASE_URL}/agent/retention/dashboard-summary",
        headers=HEADERS,
        json={
            "tenant_id": "tenant_001",
            "time_range": "30d",
        }
    )
    
    dashboard = dashboard_response.json()
    
    print(f"\n   Total At-Risk Accounts: {dashboard['total_accounts_at_risk']}")
    print(f"   Critical Risk: {dashboard['critical_risk_count']}")
    print(f"   High Risk: {dashboard['high_risk_count']}")
    print(f"   Medium Risk: {dashboard['medium_risk_count']}")
    print(f"\n   Last 30 Days Interventions: {dashboard['interventions_last_30_days']}")
    print(f"   Success Rate: {dashboard['intervention_success_rate']:.0%}")
    
    print(f"\n   Top Risk Factors:")
    for i, factor in enumerate(dashboard['top_risk_factors'], 1):
        print(f"   {i}. {factor}")


# ============================================================================
# Example 7: Acknowledge Alerts
# ============================================================================

def example_7_acknowledge_alert():
    """
    Scenario: Team member reviewed critical alert and took action.
    Action: Acknowledge alert to mark as handled.
    """
    print("\n" + "="*70)
    print("EXAMPLE 7: Acknowledge Alert")
    print("="*70)
    
    print("\n1. Get Active Alerts...")
    alerts_response = requests.get(
        f"{API_BASE_URL}/agent/retention/alerts",
        params={"account_id": "acc_001", "status": "active"}
    )
    
    alerts = alerts_response.json()["alerts"]
    if alerts:
        alert_to_ack = alerts[0]
        alert_id = alert_to_ack["alert_id"]
        
        print(f"   Found Alert: {alert_to_ack['title']}")
        
        print("\n2. Acknowledge Alert...")
        ack_response = requests.post(
            f"{API_BASE_URL}/agent/retention/alerts/acknowledge",
            headers=HEADERS,
            json={
                "alert_id": alert_id,
                "user_id": "user_123",
            }
        )
        
        ack_data = ack_response.json()
        print(f"   ✓ Alert Status: {ack_data['status']}")
        print(f"   Acknowledged By: {ack_data['acknowledged_by']}")
        print(f"   Acknowledged At: {ack_data['acknowledged_at']}")


# ============================================================================
# Run All Examples
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("REAL-TIME ALERT SYSTEM - USAGE EXAMPLES")
    print("="*70)
    
    try:
        example_1_critical_risk_detection()
        example_2_customize_preferences()
        example_3_positive_outcome()
        example_4_renewal_at_risk()
        example_5_no_response()
        example_6_dashboard_summary()
        example_7_acknowledge_alert()
        
        print("\n" + "="*70)
        print("✓ All Examples Completed Successfully!")
        print("="*70 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to API server")
        print("   Make sure the Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

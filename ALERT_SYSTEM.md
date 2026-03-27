# Real-Time Alert System Documentation

## Overview

The Real-Time Alert System monitors account health and churn risks, automatically generating and dispatching alerts to relevant team members when critical events occur.

**Key Features:**
- Automatic risk detection and alert generation
- Multi-channel alert delivery (email, Slack, SMS, webhooks)
- Customizable alert preferences per user
- Alert severity levels (critical, high, medium, low)
- Quiet hours support to prevent notification fatigue
- Intervention response tracking

---

## Alert Types

### 1. **CRITICAL_RISK_DETECTED**
- **Trigger:** Churn score ≥ 0.85 (85%)
- **Severity:** CRITICAL
- **Default Channels:** Email, Slack, Dashboard
- **Description:** Account shows severe risk of churning and requires immediate attention
- **Required Action:** Contact account executive immediately

### 2. **HIGH_RISK_DETECTED**
- **Trigger:** Churn score 0.70-0.84 (70-84%)
- **Severity:** HIGH
- **Default Channels:** Email, Dashboard
- **Description:** Account shows elevated churn risk
- **Required Action:** Schedule customer check-in within 24 hours

### 3. **RENEWAL_AT_RISK**
- **Trigger:** Days until renewal < 60 AND churn score ≥ 0.60
- **Severity:** HIGH (or MEDIUM if score < 0.70)
- **Default Channels:** Email, Slack (if critical), Dashboard
- **Description:** Contract renewal is approaching while account shows churn signals
- **Required Action:** Prepare renewal strategy and engagement plan

### 4. **INTERVENTION_NEEDED**
- **Trigger:** No login in 60+ days OR 3+ unresolved support tickets
- **Severity:** HIGH
- **Default Channels:** Email, Dashboard
- **Description:** Account requires immediate outreach
- **Required Action:** Schedule customer check-in call or assign support specialist

### 5. **POSITIVE_OUTCOME**
- **Trigger:** Customer engagement after intervention (email opened, meeting scheduled, usage increased)
- **Severity:** LOW
- **Default Channels:** Dashboard
- **Description:** Account showing positive engagement signals
- **Action:** Continue engagement, monitor progress

### 6. **NEGATIVE_OUTCOME**
- **Trigger:** Customer expressed dissatisfaction or unsubscribed
- **Severity:** HIGH
- **Default Channels:** Email, Slack, Dashboard
- **Description:** Customer expressed concerns about product/service
- **Required Action:** Escalate to customer success manager

### 7. **INTERVENTION_RESPONSE_RECEIVED**
- **Trigger:** Customer responded to outreach intervention
- **Severity:** MEDIUM
- **Default Channels:** Email, Dashboard
- **Description:** Customer engaged with retention intervention
- **Action:** Track response sentiment and engagement impact

---

## Alert Severity Levels

### CRITICAL
- **When:** Churn risk ≥ 85% or imminent churn signals detected
- **Delivery:** All channels (Email, Slack, SMS, Webhooks)
- **Quiet Hours:** Bypassed - always delivered
- **Response Time:** Immediate (within 15 minutes)
- **Default Recipients:** Account executive, Customer success manager

### HIGH
- **When:** Churn risk 70-84% or renewal at risk
- **Delivery:** Email, Slack, Dashboard
- **Quiet Hours:** Respected - Slack suppressed
- **Response Time:** Within 24 hours
- **Default Recipients:** Account manager, Customer success team

### MEDIUM
- **When:** Churn risk 40-69% or moderate engagement issues
- **Delivery:** Email, Dashboard
- **Quiet Hours:** Respected
- **Response Time:** Within 48 hours
- **Default Recipients:** Customer success team

### LOW
- **When:** Positive engagement signals, routine monitoring
- **Delivery:** Dashboard only
- **Quiet Hours:** N/A
- **Response Time:** Informational, no immediate action required
- **Default Recipients:** Account team

---

## Alert Channels

### 1. **EMAIL**
- Direct email notifications to team members
- HTML formatted with account details and action items
- Includes direct links to account dashboard
- **Use Cases:** All alert types (customizable)

### 2. **SLACK**
- Real-time notifications in Slack channels
- Formatted as rich message blocks
- Clickable buttons for quick actions
- **Use Cases:** Critical and high-risk alerts
- **Support Required:** Slack webhook URL in account settings

### 3. **SMS**
- Short message service for critical incidents
- Limited to critical alerts
- Concise message format with action required
- **Use Cases:** Critical churn risks
- **Support Required:** Phone numbers in contact list

### 4. **WEBHOOK**
- Custom webhook integration for third-party systems
- JSON payload with full alert details
- Supports custom headers and authentication
- **Use Cases:** PagerDuty, Zapier, custom automation
- **Support Required:** Webhook URL configuration

### 5. **DASHBOARD**
- Display alerts in CRM dashboard
- Color-coded by severity
- Timeline view of all account alerts
- **Use Cases:** All alert types (always included)
- **Support Required:** None - built-in

---

## Alert Rule Engine

The `AlertRuleEngine` class evaluates account metrics and generates alerts:

```python
from agent.common.realtime_alerts import AlertRuleEngine

engine = AlertRuleEngine()
alerts = engine.evaluate_account(
    account_id="acc_001",
    account_name="TechCorp Industries",
    churn_score=0.82,
    risk_level="critical",
    key_risk_factors=["No logins in 60 days"],
    days_until_renewal=45,
    last_login_days_ago=120,
    unresolved_tickets=3,
)

for alert in alerts:
    print(f"{alert.severity}: {alert.title}")
    # Output:
    # critical: CRITICAL: Severe churn risk detected
    # high: High churn risk detected
    # high: Contract renewal at risk
    # high: Account showing zero engagement
    # high: Critical: Multiple unresolved support issues
```

**Evaluation Logic:**
1. **Critical Risk:** score ≥ 0.85 → single alert
2. **High Risk:** 0.70 ≤ score < 0.85 → single alert
3. **Renewal Risk:** days < 60 AND score ≥ 0.60 → separate alert
4. **No Engagement:** last_login ≥ 60 days → separate alert
5. **Support Issues:** unresolved ≥ 3 tickets → separate alert

**Output:** List of `RealtimeAlert` objects with all necessary metadata

---

## Alert Preferences

Users can customize how they receive alerts through the preference system.

### Default Preferences
```json
{
  "enabled_alerts": [
    "critical_risk_detected",
    "renewal_at_risk",
    "intervention_needed",
    "intervention_response_received"
  ],
  "preferred_channels": ["email", "dashboard"],
  "quiet_hours_start": null,
  "quiet_hours_end": null,
  "alert_threshold_critical": 0.85,
  "alert_threshold_high": 0.70,
  "digest_frequency": "real-time"
}
```

### Customization Options

#### 1. **Enabled Alerts**
Enable/disable specific alert types:
```json
{
  "enabled_alerts": [
    "critical_risk_detected",  // Always alert on critical risk
    "renewal_at_risk",          // Alert on renewal issues
    "positive_outcome"          // Also notify on good news
  ]
}
```

#### 2. **Preferred Channels**
Choose notification delivery methods:
```json
{
  "preferred_channels": [
    "email",          // Email notifications
    "slack",          // Slack messages
    "dashboard"       // Dashboard alerts
  ]
}
```

#### 3. **Quiet Hours**
Disable notifications during specified times:
```json
{
  "quiet_hours_start": "18:00",  // 6 PM
  "quiet_hours_end": "08:00"      // 8 AM
  // Critical alerts still delivered during quiet hours
}
```

#### 4. **Custom Thresholds**
Adjust churn score thresholds:
```json
{
  "alert_threshold_critical": 0.80,  // Alert at 80% instead of 85%
  "alert_threshold_high": 0.65       // Alert at 65% instead of 70%
}
```

#### 5. **Digest Frequency**
Control alert batching:
```json
{
  "digest_frequency": "daily"  // Options: real-time, daily, weekly
  // Daily=consolidate alerts, weekly=summary report
}
```

---

## API Endpoints

### Get Alerts
**Endpoint:** `GET /agent/retention/alerts`

**Parameters:**
```json
{
  "account_id": "acc_001",
  "status": "active",  // active, acknowledged, resolved, all
  "limit": 50
}
```

**Response:**
```json
{
  "account_id": "acc_001",
  "alerts": [
    {
      "alert_id": "alert_001",
      "alert_type": "critical_risk_detected",
      "severity": "critical",
      "title": "CRITICAL: Severe churn risk detected",
      "message": "Account churn risk at 82% (critical)",
      "key_data": {
        "churn_score": 0.82,
        "risk_level": "critical"
      },
      "required_action": "Schedule review immediately",
      "created_at": "2024-01-15T10:30:00Z",
      "status": "active"
    }
  ],
  "total_count": 1,
  "critical_count": 1,
  "high_count": 0
}
```

### Get Alert Preferences
**Endpoint:** `GET /agent/retention/alerts/preferences`

**Parameters:**
```json
{
  "user_id": "user_123",
  "account_id": "acc_001"
}
```

**Response:**
```json
{
  "user_id": "user_123",
  "account_id": "acc_001",
  "preferences": {
    "enabled_alerts": [...],
    "preferred_channels": ["email", "dashboard"],
    "quiet_hours_start": "18:00",
    "quiet_hours_end": "08:00",
    "alert_threshold_critical": 0.85,
    "alert_threshold_high": 0.70,
    "digest_frequency": "real-time"
  },
  "available_alert_types": [
    "critical_risk_detected",
    "high_risk_detected",
    ...
  ],
  "available_channels": ["email", "slack", "dashboard", "sms", "webhook"],
  "available_frequencies": ["real-time", "daily", "weekly"]
}
```

### Update Alert Preferences
**Endpoint:** `POST /agent/retention/alerts/preferences`

**Request Body:**
```json
{
  "user_id": "user_123",
  "account_id": "acc_001",
  "enabled_alerts": ["critical_risk_detected", "renewal_at_risk"],
  "preferred_channels": ["slack", "email"],
  "quiet_hours_start": "18:00",
  "quiet_hours_end": "08:00",
  "alert_threshold_critical": 0.80,
  "digest_frequency": "daily"
}
```

**Response:** Updated preferences object

### Acknowledge Alert
**Endpoint:** `POST /agent/retention/alerts/acknowledge`

**Request Body:**
```json
{
  "alert_id": "alert_001",
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "alert_id": "alert_001",
  "status": "acknowledged",
  "acknowledged_by": "user_123",
  "acknowledged_at": "2024-01-15T10:35:00Z"
}
```

### Check Account Alerts
**Endpoint:** `POST /agent/retention/alerts/check`

**Request Body:**
```json
{
  "account_id": "acc_001",
  "tenant_id": "tenant_001",
  "churn_score": 0.82,
  "risk_level": "critical",
  "key_risk_factors": ["No logins in 60 days"],
  "days_until_renewal": 45,
  "last_login_days_ago": 120,
  "unresolved_tickets": 3
}
```

**Response:**
```json
{
  "account_id": "acc_001",
  "alerts_generated": 5,
  "alerts": [
    {
      "alert_id": "alert_001",
      "alert_type": "critical_risk_detected",
      "severity": "critical",
      "title": "CRITICAL: Severe churn risk detected",
      "message": "Account churn risk at 82% (critical)",
      "channels": ["email", "slack", "dashboard"],
      "required_action": "Schedule review immediately",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "evaluated_at": "2024-01-15T10:30:00Z"
}
```

---

## Workflow: Churn Detection to Alert Dispatch

```
1. Account Churn Score Calculation
   ↓
2. Alert Rule Engine Evaluation
   (Checks: score, renewal date, engagement, support)
   ↓
3. Alert Generation
   (Creates RealtimeAlert objects with severity/channels)
   ↓
4. Preference Validation
   (Check user preferences, quiet hours, enabled types)
   ↓
5. Alert Dispatch
   (Send to enabled channels: email, Slack, SMS, webhook)
   ↓
6. Dashboard Storage
   (Store in database for persistent view)
   ↓
7. User Acknowledgment
   (Mark as acknowledged when user reviews)
   ↓
8. Archive/Resolution
   (Mark resolved when issue handled)
```

---

## Integration Examples

### 1. **Post-Scoring Alert Check**
After calculating churn score, automatically check for alerts:

```python
@app.post("/retention/score")
def calculate_score():
    # ... calculate churn score ...
    churn_score = 0.82
    
    # Check for alerts
    response = requests.post("https://api/agent/retention/alerts/check", json={
        "account_id": "acc_001",
        "tenant_id": "tenant_001",
        "churn_score": churn_score,
        "risk_level": "critical",
        "days_until_renewal": 45,
        "last_login_days_ago": 120,
        "unresolved_tickets": 3,
    })
    
    alerts = response.json()["alerts"]
    # Alerts are automatically generated and dispatched
```

### 2. **Post-Intervention Response Tracking**
When intervention outcome is recorded, evaluate if situation improved:

```python
@app.post("/retention/record-outcome")
def record_outcome():
    # ... record outcome ...
    churn_score_after = 0.45
    
    # Check for positive response alert
    alert = engine.evaluate_intervention_response(
        account_id="acc_001",
        account_name="TechCorp",
        intervention_type="Executive Review",
        outcome_status="positive",
        churn_score_before=0.82,
        churn_score_after=0.45,
    )
    
    # Positive outcome alert generated and dispatched
```

### 3. **Dashboard Alert Summary**
Fetch all active alerts for dashboard display:

```python
def get_dashboard_data(account_id):
    response = requests.get("https://api/agent/retention/alerts", params={
        "account_id": account_id,
        "status": "active",
        "limit": 10,
    })
    
    return {
        "alerts": response.json()["alerts"],
        "critical_count": response.json()["critical_count"],
        "high_count": response.json()["high_count"],
    }
```

---

## Implementation Roadmap

### **Phase 2 (Completed - Basic Alert System)**
- ✅ Alert types and severity levels defined
- ✅ AlertRuleEngine with evaluation logic
- ✅ AlertPreferenceManager for customization
- ✅ Basic alert dispatch infrastructure
- ✅ 5 API endpoints for alert management

### **Phase 3 (TODO - Full Integration)**
- Database persistence for alerts
- Email template styling and branding
- Slack webhook integration and formatting
- SMS provider integration (Twilio)
- Custom webhook delivery with retries
- Alert digest generation (daily/weekly)
- Alert history and analytics

### **Phase 4 (TODO - Advanced Features)**
- Machine learning alert tuning
- Predictive alerting (predict churn 30 days out)
- Alert deduplication and correlation
- Integration with PagerDuty for escalation
- Mobile push notifications
- Alert performance metrics dashboard

---

## Configuration

### Required Environment Variables
```env
ALERT_RESEND_WEBHOOK_SECRET=your_webhook_key
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_TWILIO_SID=account_sid
ALERT_TWILIO_TOKEN=auth_token
ALERT_DB_CONNECTION=postgresql://user:pass@host/db
```

### Default Configuration
```python
ALERT_CONFIG = {
    "critical_threshold": 0.85,
    "high_threshold": 0.70,
    "medium_threshold": 0.40,
    "renewal_warning_days": 60,
    "no_login_warning_days": 60,
    "critical_tickets_threshold": 3,
    "alert_retry_max": 3,
    "alert_retention_days": 90,
}
```

---

## Troubleshooting

### Alerts Not Triggering
1. Check alert rule engine configuration
2. Verify churn score calculation is accurate
3. Ensure account_id and tenant_id are valid
4. Check alert preferences - may be disabled

### Alerts Not Delivering
1. Verify email/Slack/SMS configuration
2. Check webhook URLs are correct
3. Review error logs in alert_dispatch
4. Check quiet hours settings
5. Verify recipient email addresses/phone numbers

### Too Many Alerts
1. Adjust `alert_threshold_critical` and `alert_threshold_high`
2. Enable digest mode (daily/weekly instead of real-time)
3. Disable lower-priority alert types
4. Set quiet hours to reduce noise

---

## Best Practices

1. **Alert Fatigue Prevention**
   - Use digest mode for non-critical alerts
   - Set appropriate quiet hours
   - Enable only relevant alert types
   - Regularly review and acknowledge alerts

2. **Timely Response**
   - Set SLAs: Critical (15 min), High (4 hours), Medium (24 hours)
   - Include clear "Required Action" in alerts
   - Make action items clickable when possible

3. **Integration**
   - Call `/alerts/check` after every churn score update
   - Track alert effectiveness in your metrics
   - Link alerts to intervention outcomes
   - Use alerts to drive business metrics

4. **Data Quality**
   - Ensure engagement metrics are accurate
   - Keep renewal dates current
   - Track support ticket data
   - Regular data validation


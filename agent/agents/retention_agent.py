"""Retention agent for churn risk scoring and intervention strategies."""

from datetime import datetime
from typing import Dict, Any
import logging
import re

from flask import Blueprint, jsonify, request

from common.groq_client import GroqClient
from common.churn_scoring import ChurnScoringEngine, EngagementSignals
from common.strategy_generation import StrategyGenerationEngine, StrategyContext
from common.intervention_execution import InterventionExecutionEngine, ExecutionType
from common.outcome_tracking import (
    InterventionOutcomeTracker,
    OutcomeWebhookHandler,
    track_engagement_impact,
)

from common.realtime_alerts import (
    AlertRuleEngine,
    AlertDispatcher,
    AlertType,
    AlertSeverity,
)
from common.alert_preferences import AlertPreferenceManager, ALERT_CONFIGURATIONS

retention_bp = Blueprint("retention", __name__, url_prefix="/agent/retention")

logger = logging.getLogger(__name__)


# ============================================================================
# Helper Functions
# ============================================================================


def _validate_account_request(data: Dict[str, Any]) -> tuple[str, str]:
    """Validate and extract account_id and tenant_id from request."""
    account_id = data.get("account_id", "").strip()
    tenant_id = data.get("tenant_id", "").strip()

    if not account_id:
        raise ValueError("account_id is required")
    if not tenant_id:
        raise ValueError("tenant_id is required")

    validate_tenant_id(tenant_id)
    return account_id, tenant_id


def validate_tenant_id(tenant_id: str) -> None:
    """Validate tenant ID format used by retention endpoints."""
    if not tenant_id:
        raise ValueError("tenant_id is required")
    # Accept UUID-like and slug-like identifiers.
    if not re.fullmatch(r"[A-Za-z0-9_-]{3,64}", tenant_id):
        raise ValueError("tenant_id must be 3-64 chars and contain only letters, numbers, _ or -")


# ============================================================================
# Endpoints
# ============================================================================


@retention_bp.post("/score")
def calculate_churn_score():
    """
    Calculate churn risk score for an account.

    Uses account communication history, engagement metrics, and renewal timeline
    to determine risk of churn.
    """
    try:
        data = request.get_json(silent=True) or {}
        account_id, tenant_id = _validate_account_request(data)

        # Extract engagement signals from request
        engagement_signals = EngagementSignals(
            logins_last_30_days=data.get("logins_last_30_days", 0),
            logins_last_7_days=data.get("logins_last_7_days", 0),
            active_users=data.get("active_users", 0),
            total_users=data.get("total_users", 1),
            feature_usage_count=data.get("feature_usage_count", 0),
            api_calls_last_30_days=data.get("api_calls_last_30_days", 0),
            total_unique_features_used=data.get("total_unique_features_used", 0),
            new_features_adopted_last_30_days=data.get("new_features_adopted_last_30_days", 0),
            support_tickets_critical=data.get("support_tickets_critical", 0),
            support_tickets_total=data.get("support_tickets_total", 0),
            support_response_time_avg_hours=data.get("support_response_time_avg_hours", 24.0),
            unresolved_tickets=data.get("unresolved_tickets", 0),
            days_until_renewal=data.get("days_until_renewal", 365),
            annual_contract_value=data.get("annual_contract_value", 0),
            usage_limit_percentage=data.get("usage_limit_percentage", 0),
            login_trend_30d=data.get("login_trend_30d", 0),
            usage_trend_30d=data.get("usage_trend_30d", 0),
            last_login_days_ago=data.get("last_login_days_ago", 999),
            days_since_feature_adoption=data.get("days_since_feature_adoption", 999),
        )

        # Run churn scoring engine
        engine = ChurnScoringEngine()
        churn_score, risk_level, key_risk_factors, recommendations = engine.calculate_score(
            engagement_signals
        )

        return jsonify({
            "account_id": account_id,
            "churn_risk_score": round(churn_score, 3),
            "risk_level": risk_level,
            "key_risk_factors": key_risk_factors if key_risk_factors else [
                "No significant risk factors detected"
            ],
            "recommendations": recommendations if recommendations else [
                "Continue regular check-ins with account team",
                "Monitor engagement metrics weekly",
            ],
            "calculated_at": datetime.utcnow().isoformat(),
        }), 200
    except ValueError as e:
        logger.warning(f"Validation error in churn score: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error calculating churn score: {str(e)}")
        return jsonify({"success": False, "error": "Failed to calculate churn score"}), 500


@retention_bp.post("/strategies")
def generate_retention_strategies():
    """
    Generate personalized retention strategies for an account.

    Considers communication history, engagement metrics, and account context
    to provide tailored strategies using LLM.
    """
    try:
        data = request.get_json(silent=True) or {}
        account_id, tenant_id = _validate_account_request(data)

        # Build strategy context from request data
        strategy_context = StrategyContext(
            account_id=account_id,
            account_name=data.get("account_name", f"Account {account_id}"),
            industry=data.get("industry", "Unknown"),
            company_size=data.get("company_size", "Unknown"),
            churn_risk_score=data.get("churn_risk_score", 0.5),
            key_risk_factors=data.get("key_risk_factors", []),
            contract_duration_months=data.get("contract_duration_months", 0),
            annual_revenue=data.get("annual_revenue", 0),
            last_renewal_date=data.get("last_renewal_date", ""),
            primary_use_case=data.get("primary_use_case", "Unknown"),
            features_used=data.get("features_used", []),
            unused_features=data.get("unused_features", []),
            support_sentiment=data.get("support_sentiment", "neutral"),
            unresolved_issues=data.get("unresolved_issues", 0),
            previous_intervention_types=data.get("previous_intervention_types", []),
            previous_intervention_success_rate=data.get("previous_intervention_success_rate", 0.0),
        )

        # Generate strategies using LLM
        strategy_engine = StrategyGenerationEngine()
        strategies = strategy_engine.generate_strategies(strategy_context, num_strategies=3)

        # Convert to JSON-serializable format
        strategies_json = [
            {
                "strategy_id": s.strategy_id,
                "strategy_name": s.strategy_name,
                "description": s.description,
                "target_outcome": s.target_outcome,
                "success_probability": s.success_probability,
                "estimated_impact": s.estimated_impact,
                "timeline": s.timeline,
                "suggested_actions": s.suggested_actions,
                "rationale": s.rationale,
                "prerequisites": s.prerequisites,
            }
            for s in strategies
        ]

        return jsonify({
            "account_id": account_id,
            "strategies": strategies_json,
            "recommended_strategy": strategies_json[0] if strategies_json else None,
            "generated_at": datetime.utcnow().isoformat(),
        }), 200
    except ValueError as e:
        logger.warning(f"Validation error in retention strategies: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error generating retention strategies: {str(e)}")
        return jsonify({"success": False, "error": "Failed to generate retention strategies"}), 500


@retention_bp.post("/intervene")
def execute_intervention():
    """
    Execute a retention intervention for a high-risk account.

    Coordinates execution of the selected strategy via appropriate channels
    (email, call, meeting, etc.).
    """
    try:
        data = request.get_json(silent=True) or {}
        account_id, tenant_id = _validate_account_request(data)
        strategy_name = data.get("strategy", "").strip()
        execution_type = data.get("execution_type", "").strip()

        if not strategy_name:
            raise ValueError("strategy is required")
        if not execution_type:
            raise ValueError("execution_type is required")

        # Validate execution type
        try:
            exec_type = ExecutionType(execution_type)
        except ValueError:
            raise ValueError(
                f"Invalid execution_type. Must be one of: {', '.join([e.value for e in ExecutionType])}"
            )

        # Extract contact information
        contact_email = data.get("contact_email", "")
        contact_name = data.get("contact_name", "")
        account_name = data.get("account_name", account_id)

        if not contact_email:
            raise ValueError("contact_email is required")

        # Extract strategy details
        strategy_description = data.get("strategy_description", "")
        target_outcome = data.get("target_outcome", "")
        suggested_actions = data.get("suggested_actions", [])

        # Execute intervention
        execution_engine = InterventionExecutionEngine()
        execution_result = execution_engine.execute_intervention(
            account_id=account_id,
            account_name=account_name,
            contact_email=contact_email,
            contact_name=contact_name or "valued customer",
            strategy_name=strategy_name,
            strategy_description=strategy_description,
            target_outcome=target_outcome,
            suggested_actions=suggested_actions,
            execution_type=exec_type,
            organizer_username=data.get("organizer_username", "sales"),
            discount_percentage=data.get("discount_percentage", 10),
        )

        return jsonify({
            "account_id": account_id,
            "intervention_id": execution_result.intervention_id,
            "status": execution_result.status,
            "strategy_executed": strategy_name,
            "execution_type": execution_type,
            "details": execution_result.details,
            "error": execution_result.error,
            "next_steps": [
                "Monitor response to outreach",
                "Schedule follow-up in 3 days",
                "Track engagement metrics",
            ] if not execution_result.error else [],
            "executed_at": datetime.utcnow().isoformat(),
        }), 200
    except ValueError as e:
        logger.warning(f"Validation error in intervention: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error executing intervention: {str(e)}")
        return jsonify({"success": False, "error": "Failed to execute intervention"}), 500


@retention_bp.post("/dashboard-summary")
def get_dashboard_summary():
    """
    Get retention dashboard summary for all accounts in a tenant.

    Provides overview of churn risks, interventions, and trends.
    """
    try:
        data = request.get_json(silent=True) or {}
        tenant_id = data.get("tenant_id", "").strip()
        time_range = data.get("time_range", "30d").strip()

        if not tenant_id:
            raise ValueError("tenant_id is required")

        validate_tenant_id(tenant_id)

        # TODO: Implement agent to aggregate data across all accounts
        # This would query the database for accounts, their scores, and recent interventions

        return jsonify({
            "total_accounts_at_risk": 12,
            "critical_risk_count": 2,
            "high_risk_count": 5,
            "medium_risk_count": 5,
            "interventions_last_30_days": 8,
            "avg_churn_risk_score": 0.52,
            "top_risk_factors": [
                "Declining usage trends",
                "No adoption of new features",
                "Support ticket volume increase",
            ],
            "intervention_success_rate": 0.71,
            "dashboard_updated_at": datetime.utcnow().isoformat(),
        }), 200
    except ValueError as e:
        logger.warning(f"Validation error in dashboard summary: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        return jsonify({"success": False, "error": "Failed to fetch dashboard summary"}), 500


@retention_bp.post("/at-risk-accounts")
def get_at_risk_accounts():
    """
    Get list of accounts at risk of churn above a specified threshold.

    Returns prioritized list of accounts that need retention intervention.
    """
    try:
        data = request.get_json(silent=True) or {}
        tenant_id = data.get("tenant_id", "").strip()
        risk_threshold = float(data.get("risk_threshold", 0.6))
        limit = int(data.get("limit", 20))

        if not tenant_id:
            raise ValueError("tenant_id is required")

        validate_tenant_id(tenant_id)

        # TODO: Implement agent to query accounts and calculate scores in real-time
        # For now return mock data

        at_risk = [
            {
                "account_id": "acc_001",
                "account_name": "TechCorp Industries",
                "churn_risk_score": 0.82,
                "risk_level": "critical",
                "key_risk_factors": [
                    "No logins in 60 days",
                    "Contract expiration in 45 days",
                    "High support ticket volume",
                ],
                "days_until_renewal": 45,
                "recommended_action": "Schedule executive business review immediately",
            },
            {
                "account_id": "acc_002",
                "account_name": "Global Enterprises Inc",
                "churn_risk_score": 0.71,
                "risk_level": "high",
                "key_risk_factors": ["Declining usage", "No feature adoption"],
                "days_until_renewal": 90,
                "recommended_action": "Offer targeted training and feature enablement",
            },
        ]

        return jsonify({
            "at_risk_accounts": at_risk,
            "total_count": len(at_risk),
            "retrieved_at": datetime.utcnow().isoformat(),
        }), 200
    except ValueError as e:
        logger.warning(f"Validation error in at-risk accounts: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error getting at-risk accounts: {str(e)}")
        return jsonify({"success": False, "error": "Failed to fetch at-risk accounts"}), 500


@retention_bp.post("/record-outcome")
def record_intervention_outcome():
    """
    Record the outcome of a retention intervention
    
    Tracks engagement signals like email opens, clicks, meeting attendance, etc.
    """
    try:
        data = request.get_json(silent=True) or {}
        intervention_id = data.get("intervention_id", "").strip()
        account_id = data.get("account_id", "").strip()
        outcome_type = data.get("outcome_type", "").strip()  # email_opened, email_clicked, etc.
        
        if not intervention_id:
            raise ValueError("intervention_id is required")
        if not account_id:
            raise ValueError("account_id is required")
        if not outcome_type:
            raise ValueError("outcome_type is required")
        
        # Track the outcome
        tracker = InterventionOutcomeTracker()
        
        if outcome_type == "email_opened":
            outcome_data = tracker.track_email_opened(
                intervention_id,
                datetime.utcnow(),
            )
        elif outcome_type == "email_clicked":
            outcome_data = tracker.track_email_clicked(
                intervention_id,
                datetime.utcnow(),
                data.get("link_clicked"),
            )
        elif outcome_type == "meeting_scheduled":
            outcome_data = tracker.track_meeting_scheduled(
                intervention_id,
                datetime.fromisoformat(data.get("meeting_time", datetime.utcnow().isoformat())),
            )
        elif outcome_type == "meeting_attended":
            outcome_data = tracker.track_meeting_attended(
                intervention_id,
                datetime.utcnow(),
            )
        elif outcome_type == "response_received":
            outcome_data = tracker.track_email_response(
                intervention_id,
                datetime.utcnow(),
                data.get("sentiment", "positive"),
                data.get("response_text"),
            )
        elif outcome_type == "discount_accepted":
            outcome_data = tracker.track_discount_accepted(
                intervention_id,
                datetime.utcnow(),
            )
        elif outcome_type == "usage_increased":
            outcome_data = tracker.track_product_usage(
                intervention_id,
                data.get("usage_increase_percentage", 0),
                data.get("new_features_adopted", 0),
            )
        elif outcome_type == "no_response":
            outcome_data = tracker.track_no_response(
                intervention_id,
                data.get("days_since_sent", 7),
            )
        elif outcome_type == "churned":
            outcome_data = tracker.track_churn(
                intervention_id,
                datetime.utcnow(),
            )
        else:
            raise ValueError(f"Unknown outcome_type: {outcome_type}")
        
        # Calculate impact if churn scores provided
        impact_metrics = {}
        if "churn_score_before" in data and "churn_score_after" in data:
            impact_metrics = track_engagement_impact(
                float(data.get("churn_score_before", 0)),
                float(data.get("churn_score_after", 0)),
                outcome_data.get("outcome_status", "neutral"),
            )
        
        return jsonify({
            "intervention_id": intervention_id,
            "account_id": account_id,
            "outcome_recorded": True,
            "outcome_type": outcome_type,
            "outcome_data": outcome_data,
            "impact_metrics": impact_metrics,
            "recorded_at": datetime.utcnow().isoformat(),
        }), 200
        
    except ValueError as e:
        logger.warning(f"Validation error in record outcome: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error recording outcome: {str(e)}")
        return jsonify({"success": False, "error": "Failed to record outcome"}), 500


@retention_bp.post("/webhook/resend")
def handle_resend_webhook():
    """
    Webhook endpoint for Resend email service events
    
    Receives email open, click, bounce, and other events
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Process the webhook
        handler = OutcomeWebhookHandler()
        outcome_data = handler.process_resend_webhook(data)
        
        if not outcome_data:
            return jsonify({"success": True, "message": "Webhook received but no action taken"}), 200
        
        logger.info(f"Resend webhook processed: {outcome_data.get('outcome_type')}")
        
        return jsonify({
            "success": True,
            "message": "Webhook processed",
            "outcome": outcome_data,
        }), 200
        
    except Exception as e:
        logger.error(f"Error handling Resend webhook: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@retention_bp.post("/webhook/calendly")
def handle_calendly_webhook():
    """
    Webhook endpoint for Calendly meeting events
    
    Receives meeting scheduled, attended, and canceled events
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Process the webhook
        handler = OutcomeWebhookHandler()
        outcome_data = handler.process_calendly_webhook(data)
        
        if not outcome_data:
            return jsonify({"success": True, "message": "Webhook received but no action taken"}), 200
        
        logger.info(f"Calendly webhook processed: {outcome_data.get('outcome_type')}")
        
        return jsonify({
            "success": True,
            "message": "Webhook processed",
            "outcome": outcome_data,
        }), 200
        
    except Exception as e:
        logger.error(f"Error handling Calendly webhook: {str(e)}")


        # ============================================================================
        # Real-Time Alert System Endpoints
        # ============================================================================


        @retention_bp.get("/alerts")
        def get_account_alerts():
            """
            Get active alerts for an account.
    
            Returns list of critical and high-priority alerts requiring attention.
            """
            try:
                # Get query parameters
                account_id = request.args.get("account_id", "").strip()
                status = request.args.get("status", "active").strip()  # active, acknowledged, resolved
                limit = int(request.args.get("limit", 50))
        
                if not account_id:
                    raise ValueError("account_id is required")
        
                # TODO: Query database for alerts in database
                # For now return empty list
                alerts = [
                    {
                        "alert_id": "alert_001",
                        "account_id": account_id,
                        "account_name": "TechCorp Industries",
                        "alert_type": "critical_risk_detected",
                        "severity": "critical",
                        "title": "CRITICAL: Severe churn risk detected",
                        "message": "Account churn risk at 82% (critical)",
                        "key_data": {
                            "churn_score": 0.82,
                            "risk_level": "critical",
                            "days_until_renewal": 45,
                        },
                        "required_action": "Schedule executive business review immediately",
                        "created_at": datetime.utcnow().isoformat(),
                        "status": "active",
                    },
                ]
        
                # Filter by status if needed
                if status != "all":
                    alerts = [a for a in alerts if a["status"] == status]
        
                # Apply limit
                alerts = alerts[:limit]
        
                return jsonify({
                    "account_id": account_id,
                    "alerts": alerts,
                    "total_count": len(alerts),
                    "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
                    "high_count": sum(1 for a in alerts if a["severity"] == "high"),
                    "retrieved_at": datetime.utcnow().isoformat(),
                }), 200
        
            except ValueError as e:
                logger.warning(f"Validation error in get alerts: {str(e)}")
                return jsonify({"success": False, "error": str(e)}), 400
            except Exception as e:
                logger.error(f"Error getting alerts: {str(e)}")
                return jsonify({"success": False, "error": "Failed to fetch alerts"}), 500


        @retention_bp.post("/alerts/preferences")
        def update_alert_preferences():
            """
            Update alert preferences for a user.
    
            Allows users to customize alert types, channels, and quiet hours.
            """
            try:
                data = request.get_json(silent=True) or {}
                user_id = data.get("user_id", "").strip()
                account_id = data.get("account_id", "").strip()
        
                if not user_id:
                    raise ValueError("user_id is required")
                if not account_id:
                    raise ValueError("account_id is required")
        
                # Initialize preference manager
                pref_manager = AlertPreferenceManager()
        
                # Update preferences
                updated_prefs = pref_manager.update_preferences(
                    user_id=user_id,
                    account_id=account_id,
                    enabled_alerts=data.get("enabled_alerts"),
                    preferred_channels=data.get("preferred_channels"),
                    quiet_hours_start=data.get("quiet_hours_start"),
                    quiet_hours_end=data.get("quiet_hours_end"),
                    alert_threshold_critical=data.get("alert_threshold_critical"),
                    alert_threshold_high=data.get("alert_threshold_high"),
                    digest_frequency=data.get("digest_frequency"),
                )
        
                return jsonify({
                    "user_id": user_id,
                    "account_id": account_id,
                    "preferences": {
                        "enabled_alerts": updated_prefs.enabled_alerts,
                        "preferred_channels": updated_prefs.preferred_channels,
                        "quiet_hours_start": updated_prefs.quiet_hours_start,
                        "quiet_hours_end": updated_prefs.quiet_hours_end,
                        "alert_threshold_critical": updated_prefs.alert_threshold_critical,
                        "alert_threshold_high": updated_prefs.alert_threshold_high,
                        "digest_frequency": updated_prefs.digest_frequency,
                    },
                    "updated_at": datetime.utcnow().isoformat(),
                }), 200
        
            except ValueError as e:
                logger.warning(f"Validation error in update preferences: {str(e)}")
                return jsonify({"success": False, "error": str(e)}), 400
            except Exception as e:
                logger.error(f"Error updating alert preferences: {str(e)}")
                return jsonify({"success": False, "error": "Failed to update preferences"}), 500


        @retention_bp.get("/alerts/preferences")
        def get_alert_preferences():
            """
            Get alert preferences for a user.
    
            Returns current alert configuration and available options.
            """
            try:
                user_id = request.args.get("user_id", "").strip()
                account_id = request.args.get("account_id", "").strip()
        
                if not user_id:
                    raise ValueError("user_id is required")
                if not account_id:
                    raise ValueError("account_id is required")
        
                # Initialize preference manager
                pref_manager = AlertPreferenceManager()
                prefs = pref_manager.get_user_preferences(user_id, account_id)
        
                return jsonify({
                    "user_id": user_id,
                    "account_id": account_id,
                    "preferences": {
                        "enabled_alerts": prefs.enabled_alerts,
                        "preferred_channels": prefs.preferred_channels,
                        "quiet_hours_start": prefs.quiet_hours_start,
                        "quiet_hours_end": prefs.quiet_hours_end,
                        "alert_threshold_critical": prefs.alert_threshold_critical,
                        "alert_threshold_high": prefs.alert_threshold_high,
                        "digest_frequency": prefs.digest_frequency,
                    },
                    "available_alert_types": list(ALERT_CONFIGURATIONS.keys()),
                    "available_channels": ["email", "slack", "dashboard", "sms", "webhook"],
                    "available_frequencies": ["real-time", "daily", "weekly"],
                    "retrieved_at": datetime.utcnow().isoformat(),
                }), 200
        
            except ValueError as e:
                logger.warning(f"Validation error in get preferences: {str(e)}")
                return jsonify({"success": False, "error": str(e)}), 400
            except Exception as e:
                logger.error(f"Error getting alert preferences: {str(e)}")
                return jsonify({"success": False, "error": "Failed to fetch preferences"}), 500


        @retention_bp.post("/alerts/acknowledge")
        def acknowledge_alert():
            """
            Acknowledge an active alert.
    
            Marks alert as acknowledged by user, preventing duplicate notifications.
            """
            try:
                data = request.get_json(silent=True) or {}
                alert_id = data.get("alert_id", "").strip()
                user_id = data.get("user_id", "").strip()
        
                if not alert_id:
                    raise ValueError("alert_id is required")
                if not user_id:
                    raise ValueError("user_id is required")
        
                # TODO: Update database to mark alert as acknowledged
        
                return jsonify({
                    "alert_id": alert_id,
                    "status": "acknowledged",
                    "acknowledged_by": user_id,
                    "acknowledged_at": datetime.utcnow().isoformat(),
                }), 200
        
            except ValueError as e:
                logger.warning(f"Validation error in acknowledge alert: {str(e)}")
                return jsonify({"success": False, "error": str(e)}), 400
            except Exception as e:
                logger.error(f"Error acknowledging alert: {str(e)}")
                return jsonify({"success": False, "error": "Failed to acknowledge alert"}), 500


        @retention_bp.post("/alerts/check")
        def check_account_alerts():
            """
            Evaluate account and generate alerts based on current state.
    
            Used internally to trigger alert generation when account metrics change.
            """
            try:
                data = request.get_json(silent=True) or {}
                account_id, tenant_id = _validate_account_request(data)
        
                # Extract account metrics
                churn_score = float(data.get("churn_score", 0))
                risk_level = data.get("risk_level", "low")
                key_risk_factors = data.get("key_risk_factors", [])
                days_until_renewal = int(data.get("days_until_renewal", 999))
                last_login_days_ago = int(data.get("last_login_days_ago", 0))
                unresolved_tickets = int(data.get("unresolved_tickets", 0))
                account_name = data.get("account_name", account_id)
        
                # Evaluate account using alert rule engine
                alert_engine = AlertRuleEngine()
                alerts = alert_engine.evaluate_account(
                    account_id=account_id,
                    account_name=account_name,
                    churn_score=churn_score,
                    risk_level=risk_level,
                    key_risk_factors=key_risk_factors,
                    days_until_renewal=days_until_renewal,
                    last_login_days_ago=last_login_days_ago,
                    unresolved_tickets=unresolved_tickets,
                )
        
                # TODO: Store alerts in database
                # TODO: Dispatch alerts to configured recipients and channels
        
                # Convert alerts to JSON-serializable format
                alerts_json = [
                    {
                        "alert_id": a.alert_id,
                        "alert_type": a.alert_type.value,
                        "severity": a.severity.value,
                        "title": a.title,
                        "message": a.message,
                        "channels": [c.value for c in a.channels],
                        "required_action": a.required_action,
                        "created_at": a.created_at.isoformat(),
                    }
                    for a in alerts
                ]
        
                return jsonify({
                    "account_id": account_id,
                    "alerts_generated": len(alerts),
                    "alerts": alerts_json,
                    "evaluated_at": datetime.utcnow().isoformat(),
                }), 200
        
            except ValueError as e:
                logger.warning(f"Validation error in check alerts: {str(e)}")
                return jsonify({"success": False, "error": str(e)}), 400
            except Exception as e:
                logger.error(f"Error checking account alerts: {str(e)}")
                return jsonify({"success": False, "error": "Failed to check alerts"}), 500
        return jsonify({"success": False, "error": str(e)}), 500

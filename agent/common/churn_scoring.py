"""
Churn Scoring Algorithm
Analyzes multiple engagement signals to calculate account churn risk
"""

from typing import Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import math


@dataclass
class EngagementSignals:
    """Container for engagement metrics"""
    # User Activity
    logins_last_30_days: int = 0
    logins_last_7_days: int = 0
    active_users: int = 0
    total_users: int = 1
    
    # Product Usage
    feature_usage_count: int = 0
    api_calls_last_30_days: int = 0
    total_unique_features_used: int = 0
    new_features_adopted_last_30_days: int = 0
    
    # Support/Issues
    support_tickets_critical: int = 0
    support_tickets_total: int = 0
    support_response_time_avg_hours: float = 24.0
    unresolved_tickets: int = 0
    
    # Contract/Business
    days_until_renewal: int = 365
    annual_contract_value: float = 0
    usage_limit_percentage: float = 0  # % of limit being used
    
    # Historical Trends
    login_trend_30d: float = 0  # % change week-over-week
    usage_trend_30d: float = 0  # % change week-over-week
    
    # Engagement History
    last_login_days_ago: int = 999
    days_since_feature_adoption: int = 999


class ChurnScoringEngine:
    """
    ML-style churn scoring algorithm
    Calculates risk score 0.0-1.0 based on weighted engagement signals
    """
    
    # Risk Thresholds
    CRITICAL_THRESHOLD = 0.85
    HIGH_THRESHOLD = 0.70
    MEDIUM_THRESHOLD = 0.40
    
    # Signal weights (must sum to 1.0)
    SIGNAL_WEIGHTS = {
        "engagement": 0.35,      # Login activity, user engagement
        "usage": 0.25,           # Feature usage, API calls
        "business_health": 0.20, # Renewal timeline, contract value
        "support_issues": 0.15,  # Support tickets, unresolved issues
        "trend": 0.05,           # Usage trends
    }
    
    def __init__(self):
        self.risk_factors: List[str] = []
        self.recommendations: List[str] = []
    
    def calculate_score(self, signals: EngagementSignals) -> Tuple[float, str, List[str], List[str]]:
        """
        Calculate churn risk score for an account
        
        Returns:
            (score: float, risk_level: str, key_risk_factors: List[str], recommendations: List[str])
        """
        self.risk_factors = []
        self.recommendations = []
        
        # Calculate component scores
        engagement_score = self._score_engagement(signals)
        usage_score = self._score_usage(signals)
        business_score = self._score_business_health(signals)
        support_score = self._score_support_health(signals)
        trend_score = self._score_trends(signals)
        
        # Weighted combination
        final_score = (
            engagement_score * self.SIGNAL_WEIGHTS["engagement"] +
            usage_score * self.SIGNAL_WEIGHTS["usage"] +
            business_score * self.SIGNAL_WEIGHTS["business_health"] +
            support_score * self.SIGNAL_WEIGHTS["support_issues"] +
            trend_score * self.SIGNAL_WEIGHTS["trend"]
        )
        
        # Clamp to 0-1 range
        final_score = max(0.0, min(1.0, final_score))
        
        # Determine risk level
        if final_score >= self.CRITICAL_THRESHOLD:
            risk_level = "critical"
        elif final_score >= self.HIGH_THRESHOLD:
            risk_level = "high"
        elif final_score >= self.MEDIUM_THRESHOLD:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return final_score, risk_level, self.risk_factors, self.recommendations
    
    def _score_engagement(self, signals: EngagementSignals) -> float:
        """Score engagement based on user login activity (0.0-1.0)"""
        score = 0.0
        
        # No logins recently is highest risk
        if signals.last_login_days_ago > 90:
            score += 1.0
            self.risk_factors.append("No logins in 90+ days")
            self.recommendations.append("Schedule executive business review")
        elif signals.last_login_days_ago > 60:
            score += 0.9
            self.risk_factors.append("No logins in 60+ days")
        elif signals.last_login_days_ago > 30:
            score += 0.6
            self.risk_factors.append("No logins in last month")
        elif signals.last_login_days_ago > 14:
            score += 0.3
        
        # Active users ratio
        if signals.total_users > 0:
            active_ratio = signals.active_users / signals.total_users
            if active_ratio < 0.2:
                score += 0.5
                self.risk_factors.append("Low active user adoption (<20%)")
            elif active_ratio < 0.5:
                score += 0.3
                self.risk_factors.append("Moderate active user ratio (20-50%)")
        
        # Recent logins trend
        if signals.logins_last_7_days == 0 and signals.logins_last_30_days > 0:
            score += 0.3
            self.risk_factors.append("Declining login activity")
        
        return min(1.0, score)
    
    def _score_usage(self, signals: EngagementSignals) -> float:
        """Score product usage (0.0-1.0)"""
        score = 0.0
        
        # No feature usage
        if signals.feature_usage_count == 0:
            score += 1.0
            self.risk_factors.append("Zero feature usage detected")
            self.recommendations.append("Launch targeted onboarding or training program")
        elif signals.feature_usage_count < 2:
            score += 0.8
            self.risk_factors.append("Minimal feature adoption (< 2 features)")
        elif signals.feature_usage_count < 5:
            score += 0.4
            self.risk_factors.append("Limited feature adoption (< 5 features)")
        
        # API call usage
        if signals.api_calls_last_30_days == 0:
            score += 0.3
            self.risk_factors.append("No API integration detected")
        elif signals.api_calls_last_30_days < 100:
            score += 0.1
        
        # New feature adoption (early adoption indicates engagement)
        if signals.days_since_feature_adoption > 60 and signals.new_features_adopted_last_30_days == 0:
            score += 0.3
            self.risk_factors.append("No adoption of new features")
            self.recommendations.append("Introduce new features relevant to their use case")
        
        return min(1.0, score)
    
    def _score_business_health(self, signals: EngagementSignals) -> float:
        """Score business metrics like renewal and contract value (0.0-1.0)"""
        score = 0.0
        
        # Imminent renewal
        if signals.days_until_renewal < 30:
            score += 1.0
            self.risk_factors.append(f"Renewal in {signals.days_until_renewal} days")
            self.recommendations.append("Immediate intervention required")
        elif signals.days_until_renewal < 60:
            score += 0.7
            self.risk_factors.append(f"Renewal approaching ({signals.days_until_renewal} days)")
        elif signals.days_until_renewal < 90:
            score += 0.4
        
        # Small contract value (lower value = higher risk since business impact is less)
        if signals.annual_contract_value > 0:
            # More than 50% usage of limit might indicate growth or lack of headroom
            if signals.usage_limit_percentage > 80:
                score += 0.2
                self.risk_factors.append("Near usage limit - upgrade opportunity or constraint")
        
        return min(1.0, score)
    
    def _score_support_health(self, signals: EngagementSignals) -> float:
        """Score support interactions and issues (0.0-1.0)"""
        score = 0.0
        
        # Critical issues unanswered
        if signals.support_tickets_critical > 0:
            score += 0.8
            self.risk_factors.append(f"{signals.support_tickets_critical} critical support tickets")
            self.recommendations.append("Prioritize critical issue resolution")
        
        # Many unresolved tickets
        if signals.unresolved_tickets > 3:
            score += 0.5
            self.risk_factors.append(f"{signals.unresolved_tickets} unresolved support tickets")
        elif signals.unresolved_tickets > 1:
            score += 0.2
        
        # Slow support response
        if signals.support_response_time_avg_hours > 48:
            score += 0.3
            self.risk_factors.append("Slow support response time")
        
        # High ticket volume might indicate issues
        if signals.support_tickets_total > 10:
            score += 0.2
            self.risk_factors.append("High support ticket volume")
        
        return min(1.0, score)
    
    def _score_trends(self, signals: EngagementSignals) -> float:
        """Score usage trends (0.0-1.0)"""
        score = 0.0
        
        # Declining login trend
        if signals.login_trend_30d < -20:  # > 20% decline
            score += 0.7
            self.risk_factors.append("Declining login activity (>20% drop)")
            self.recommendations.append("Increase engagement communications")
        elif signals.login_trend_30d < -10:
            score += 0.4
            self.risk_factors.append("Declining login activity (>10% drop)")
        
        # Declining usage trend
        if signals.usage_trend_30d < -20:  # > 20% decline
            score += 0.7
            self.risk_factors.append("Declining product usage (>20% drop)")
        elif signals.usage_trend_30d < -10:
            score += 0.4
            self.risk_factors.append("Declining product usage (>10% drop)")
        
        return min(1.0, score)
    
    @staticmethod
    def get_risk_level(score: float) -> str:
        """Convert score to risk level"""
        if score >= ChurnScoringEngine.CRITICAL_THRESHOLD:
            return "critical"
        elif score >= ChurnScoringEngine.HIGH_THRESHOLD:
            return "high"
        elif score >= ChurnScoringEngine.MEDIUM_THRESHOLD:
            return "medium"
        else:
            return "low"
    
    @staticmethod
    def get_risk_color(risk_level: str) -> str:
        """Get UI color for risk level"""
        colors = {
            "critical": "#dc2626",  # red
            "high": "#ea580c",      # orange
            "medium": "#eab308",    # yellow
            "low": "#22c55e",       # green
        }
        return colors.get(risk_level, "#6b7280")


# Example usage and testing
if __name__ == "__main__":
    # Test case 1: High-risk account (critical)
    critical_account = EngagementSignals(
        logins_last_30_days=0,
        logins_last_7_days=0,
        active_users=0,
        total_users=50,
        feature_usage_count=0,
        api_calls_last_30_days=0,
        last_login_days_ago=120,
        days_until_renewal=30,
        support_tickets_critical=2,
        unresolved_tickets=3,
    )
    
    engine = ChurnScoringEngine()
    score, risk_level, factors, recommendations = engine.calculate_score(critical_account)
    
    print(f"Critical Account Test:")
    print(f"  Score: {score:.2f}")
    print(f"  Risk Level: {risk_level}")
    print(f"  Risk Factors: {factors}")
    print(f"  Recommendations: {recommendations}")
    
    # Test case 2: Healthy account (low risk)
    healthy_account = EngagementSignals(
        logins_last_30_days=20,
        logins_last_7_days=5,
        active_users=30,
        total_users=50,
        feature_usage_count=8,
        api_calls_last_30_days=500,
        last_login_days_ago=1,
        days_until_renewal=180,
        support_tickets_total=1,
        unresolved_tickets=0,
        login_trend_30d=5.0,
        usage_trend_30d=10.0,
    )
    
    engine = ChurnScoringEngine()
    score, risk_level, factors, recommendations = engine.calculate_score(healthy_account)
    
    print(f"\nHealthy Account Test:")
    print(f"  Score: {score:.2f}")
    print(f"  Risk Level: {risk_level}")
    print(f"  Risk Factors: {factors}")
    print(f"  Recommendations: {recommendations}")

"""
Strategy Generation Engine
Uses LLM to generate personalized retention strategies based on account context
"""

from typing import List, Dict, Any
from dataclasses import dataclass
import json

from .groq_client import GroqClient


@dataclass
class StrategyContext:
    """Account context for strategy generation"""
    account_id: str
    account_name: str
    industry: str = "Unknown"
    company_size: str = "Unknown"
    
    # Risk indicators
    churn_risk_score: float = 0.5
    key_risk_factors: List[str] = None
    
    # Account history
    contract_duration_months: int = 0
    annual_revenue: float = 0
    last_renewal_date: str = ""
    
    # Engagement
    primary_use_case: str = "Unknown"
    features_used: List[str] = None
    unused_features: List[str] = None
    
    # Support
    support_sentiment: str = "neutral"  # positive, neutral, negative
    unresolved_issues: int = 0
    
    # Previous interventions
    previous_intervention_types: List[str] = None
    previous_intervention_success_rate: float = 0.0
    
    def __post_init__(self):
        if self.key_risk_factors is None:
            self.key_risk_factors = []
        if self.features_used is None:
            self.features_used = []
        if self.unused_features is None:
            self.unused_features = []
        if self.previous_intervention_types is None:
            self.previous_intervention_types = []


@dataclass
class RetentionStrategy:
    """Generated retention strategy"""
    strategy_id: str
    strategy_name: str
    description: str
    target_outcome: str
    success_probability: float
    estimated_impact: str
    timeline: str
    suggested_actions: List[Dict[str, Any]]
    rationale: str
    prerequisites: List[str]


class StrategyGenerationEngine:
    """
    Generates personalized retention strategies using LLM
    """
    
    def __init__(self):
        self.groq_client = GroqClient()
        self.default_strategies = self._get_default_strategies()
    
    def generate_strategies(
        self, 
        context: StrategyContext,
        num_strategies: int = 3
    ) -> List[RetentionStrategy]:
        """
        Generate personalized retention strategies for an account
        """
        try:
            # Build context for LLM
            context_text = self._build_context_prompt(context)
            
            # Create LLM prompt
            prompt = f"""
You are a retention strategy expert for B2B SaaS companies. Generate {num_strategies} personalized 
retention strategies for the following account:

{context_text}

For each strategy, provide:
1. A creative strategy name
2. Clear description of the approach
3. Target outcome
4. Estimated success probability (0.0-1.0)
5. Estimated business impact
6. Timeline to implement
7. Specific action items with timeline
8. Rationale explaining why this strategy fits this account
9. Prerequisites needed to execute

Return the response as a JSON array with this structure:
[
  {{
    "strategy_name": "string",
    "description": "string",
    "target_outcome": "string",
    "success_probability": 0.75,
    "estimated_impact": "string describing business impact",
    "timeline": "string like '2 weeks' or '30 days'",
    "suggested_actions": [
      {{"action": "action description", "timeline": "timeline for this action"}},
    ],
    "rationale": "why this strategy fits",
    "prerequisites": ["item1", "item2"]
  }},
]

Be specific, actionable, and personalized to this account's situation.
"""

            # Call LLM
            response = self.groq_client.call_fast(
                [
                    {
                        "role": "system",
                        "content": "You are a retention expert for B2B SaaS. Respond only with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse response
            strategies = self._parse_strategy_response(response, context)
            
            return strategies if strategies else self.default_strategies
            
        except Exception as e:
            # If LLM fails, fall back to rule-based strategies
            return self._generate_fallback_strategies(context)
    
    def _build_context_prompt(self, context: StrategyContext) -> str:
        """Build a detailed context prompt for the LLM"""
        parts = [
            f"Account: {context.account_name}",
            f"Industry: {context.industry}",
            f"Company Size: {context.company_size}",
            f"",
            "RISK PROFILE:",
            f"  Churn Risk Score: {context.churn_risk_score:.0%}",
            f"  Key Risk Factors: {', '.join(context.key_risk_factors) if context.key_risk_factors else 'None identified'}",
            f"  Unresolved Support Issues: {context.unresolved_issues}",
            f"",
            "ACCOUNT HISTORY:",
            f"  Contract Duration: {context.contract_duration_months} months",
            f"  Annual Revenue: ${context.annual_revenue:,.0f}",
            f"  Last Renewal: {context.last_renewal_date or 'Unknown'}",
            f"",
            "ENGAGEMENT:",
            f"  Primary Use Case: {context.primary_use_case}",
            f"  Features Used: {', '.join(context.features_used) if context.features_used else 'None'}",
            f"  Unused Features: {', '.join(context.unused_features) if context.unused_features else 'None'}",
            f"",
            "SUPPORT:",
            f"  Support Sentiment: {context.support_sentiment}",
            f"",
            "HISTORY:",
            f"  Previous Interventions: {', '.join(context.previous_intervention_types) if context.previous_intervention_types else 'None'}",
            f"  Previous Success Rate: {context.previous_intervention_success_rate:.0%}",
        ]
        
        return "\n".join(parts)
    
    def _parse_strategy_response(
        self, 
        response: str,
        context: StrategyContext
    ) -> List[RetentionStrategy]:
        """Parse LLM response into strategy objects"""
        try:
            # Try to extract JSON
            import json
            
            # Look for JSON array
            start = response.find('[')
            end = response.rfind(']') + 1
            
            if start == -1 or end == 0:
                return []
            
            json_str = response[start:end]
            strategies_data = json.loads(json_str)
            
            strategies = []
            for idx, data in enumerate(strategies_data[:3]):  # Limit to 3
                try:
                    strategy = RetentionStrategy(
                        strategy_id=f"strat-{context.account_id}-{idx}",
                        strategy_name=data.get("strategy_name", f"Strategy {idx + 1}"),
                        description=data.get("description", ""),
                        target_outcome=data.get("target_outcome", ""),
                        success_probability=float(data.get("success_probability", 0.5)),
                        estimated_impact=data.get("estimated_impact", ""),
                        timeline=data.get("timeline", ""),
                        suggested_actions=data.get("suggested_actions", []),
                        rationale=data.get("rationale", ""),
                        prerequisites=data.get("prerequisites", []),
                    )
                    strategies.append(strategy)
                except (ValueError, KeyError) as e:
                    continue
            
            return strategies
            
        except Exception as e:
            return []
    
    def _generate_fallback_strategies(self, context: StrategyContext) -> List[RetentionStrategy]:
        """Generate rule-based strategies when LLM fails"""
        strategies = []
        
        # Strategy 1: Executive Engagement
        if context.churn_risk_score > 0.7:
            strategies.append(RetentionStrategy(
                strategy_id=f"strat-{context.account_id}-1",
                strategy_name="Executive Business Review",
                description="Schedule a comprehensive business review with account leadership to align on value realization and future growth opportunities",
                target_outcome="Demonstrate clear ROI and strategic value, identify expansion opportunities",
                success_probability=0.78,
                estimated_impact="45% improvement in renewal likelihood",
                timeline="2 weeks",
                suggested_actions=[
                    {"action": "Schedule 60-minute executive review meeting", "timeline": "Next 7 days"},
                    {"action": "Prepare ROI analysis and business impact report", "timeline": "Before meeting"},
                    {"action": "Identify and present expansion opportunities", "timeline": "During meeting"},
                    {"action": "Define joint 90-day success plan", "timeline": "During meeting"},
                ],
                rationale="High-risk accounts need direct C-level engagement to rebuild confidence and demonstrate value",
                prerequisites=["ROI data prepared", "Executive sponsor identified"],
            ))
        
        # Strategy 2: Feature Adoption
        if context.unused_features and len(context.unused_features) > 0:
            strategies.append(RetentionStrategy(
                strategy_id=f"strat-{context.account_id}-2",
                strategy_name="Feature Enablement Program",
                description=f"Launch targeted training on high-value unused features: {', '.join(context.unused_features[:3])}",
                target_outcome="Increase product adoption and engagement, unlock additional value",
                success_probability=0.65,
                estimated_impact="30% increase in feature adoption within 30 days",
                timeline="3 weeks",
                suggested_actions=[
                    {"action": "Assess current feature usage patterns", "timeline": "Immediately"},
                    {"action": "Design targeted training curriculum", "timeline": "Next 3 days"},
                    {"action": "Schedule training sessions", "timeline": "Next 7 days"},
                    {"action": "Provide one-on-one coaching if needed", "timeline": "Days 8-21"},
                    {"action": "Measure adoption improvement", "timeline": "Day 21"},
                ],
                rationale="Unused features represent unrealized value that could drive engagement and renewals",
                prerequisites=["Training resources available", "Designated point-of-contact for training"],
            ))
        
        # Strategy 3: Support Resolution
        if context.unresolved_issues > 0:
            strategies.append(RetentionStrategy(
                strategy_id=f"strat-{context.account_id}-3",
                strategy_name="Support Issue Resolution Sprint",
                description="Prioritize and resolve all outstanding support issues through a dedicated focus",
                target_outcome="Clear all open issues, restore support satisfaction",
                success_probability=0.72,
                estimated_impact="Rebuild trust and demonstrate commitment",
                timeline="10 days",
                suggested_actions=[
                    {"action": "Audit all open support tickets", "timeline": "Day 1"},
                    {"action": "Assign dedicated support specialist", "timeline": "Day 1"},
                    {"action": "Establish daily check-ins with customer", "timeline": "Days 2-10"},
                    {"action": "Resolve all identified issues", "timeline": "Days 2-10"},
                    {"action": "Post-resolution satisfaction check", "timeline": "Day 11"},
                ],
                rationale="Unresolved issues are a major churn driver that must be addressed immediately",
                prerequisites=["Support team availability", "Customer willingness to commit time"],
            ))
        
        # Strategy 4: Growth Partnership
        if context.annual_revenue > 50000:
            strategies.append(RetentionStrategy(
                strategy_id=f"strat-{context.account_id}-4",
                strategy_name="Growth Partnership Program",
                description="Position account as strategic partner with dedicated growth support and early access to innovations",
                target_outcome="Increase product stickiness through strategic partnership",
                success_probability=0.68,
                estimated_impact="Multi-year contract expansion, increased product adoption",
                timeline="4 weeks",
                suggested_actions=[
                    {"action": "Propose partnership program", "timeline": "Week 1"},
                    {"action": "Assign dedicated account executive", "timeline": "Week 1"},
                    {"action": "Conduct quarterly business reviews", "timeline": "Ongoing"},
                    {"action": "Provide early access to beta features", "timeline": "Ongoing"},
                ],
                rationale="High-value accounts benefit from proactive, partner-level engagement",
                prerequisites=["Dedicated account executive available", "Product roadmap clarity"],
            ))
        
        return strategies
    
    def _get_default_strategies(self) -> List[RetentionStrategy]:
        """Get list of general default strategies"""
        return [
            RetentionStrategy(
                strategy_id="default-1",
                strategy_name="Customer Success Check-in",
                description="Regular engagement with account team to ensure satisfaction and identify issues",
                target_outcome="Maintain engagement and identify issues early",
                success_probability=0.45,
                estimated_impact="Baseline retention improvement",
                timeline="Ongoing",
                suggested_actions=[
                    {"action": "Schedule monthly check-in calls", "timeline": "Monthly"},
                ],
                rationale="Regular communication helps identify and resolve issues before they become churn risks",
                prerequisites=["Account manager availability"],
            )
        ]


# Example usage
if __name__ == "__main__":
    context = StrategyContext(
        account_id="acc_001",
        account_name="TechCorp Industries",
        industry="Technology",
        company_size="500-1000 employees",
        churn_risk_score=0.82,
        key_risk_factors=["No logins in 60 days", "Contract expiration in 45 days"],
        contract_duration_months=24,
        annual_revenue=150000,
        primary_use_case="Data Analytics",
        features_used=["Dashboard", "Reports"],
        unused_features=["Advanced ML Models", "API Integration", "Custom Workflows"],
        support_sentiment="negative",
        unresolved_issues=2,
    )
    
    engine = StrategyGenerationEngine()
    strategies = engine.generate_strategies(context, num_strategies=3)
    
    print(f"Generated {len(strategies)} strategies for {context.account_name}:\n")
    for idx, strategy in enumerate(strategies, 1):
        print(f"{idx}. {strategy.strategy_name}")
        print(f"   Success Probability: {strategy.success_probability:.0%}")
        print(f"   Timeline: {strategy.timeline}")
        print()

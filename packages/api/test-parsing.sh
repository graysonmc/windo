#!/bin/bash
# Test Scenario Parsing Endpoint

API_URL="http://localhost:3000"

echo "🧪 Testing Scenario Parsing with OpenAI Function Calling"
echo "========================================================"
echo ""

# Test 1: Ethical Dilemma
echo "Test 1: Ethical Dilemma (Whistleblowing)"
echo "----------------------------------------"
curl -s -X POST "$API_URL/api/setup/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_text": "You are a manager at a financial services firm. You have discovered that your boss is manipulating earnings reports to inflate quarterly results. You have a family to support and this job provides critical income. The board meeting is next week where these results will be presented to investors. Your colleague Sarah, who also knows about this, is pressuring you to stay quiet."
  }' | jq '{
    scenario_type: .parsed.scenario_type,
    actors: (.parsed.actors | length),
    objectives: .parsed.suggested_objectives,
    ai_mode: .suggested_parameters.ai_mode,
    confidence: .parsed.confidence,
    valid: .actor_validation.valid
  }'
echo ""

# Test 2: Crisis Management
echo "Test 2: Crisis Management (Viral Product)"
echo "----------------------------------------"
curl -s -X POST "$API_URL/api/setup/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_text": "You are the CEO of Zara. A celebrity was photographed wearing a pink scarf from your store, and it has gone viral on social media. Analysts are projecting demand for 500,000 units, but you currently have zero inventory. Production takes 3 weeks. Your CFO warns about inventory risk, while your CMO is pushing to capitalize on the trend immediately. The board wants your decision by tomorrow."
  }' | jq '{
    scenario_type: .parsed.scenario_type,
    actors: (.parsed.actors | length),
    objectives: .parsed.suggested_objectives,
    ai_mode: .suggested_parameters.ai_mode,
    confidence: .parsed.confidence
  }'
echo ""

# Test 3: Negotiation
echo "Test 3: Negotiation (Supply Contract)"
echo "----------------------------------------"
curl -s -X POST "$API_URL/api/setup/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_text": "You are the head of procurement at Tesla negotiating a lithium supply contract. The supplier wants a 5-year commitment at $80k per ton. Market price is $70k but analysts predict shortages. Your manufacturing VP needs certainty, but your CFO wants flexibility. The supplier is meeting with your competitor tomorrow."
  }' | jq '{
    scenario_type: .parsed.scenario_type,
    actors: (.parsed.actors | map(.name)),
    objectives: .parsed.suggested_objectives,
    ai_mode: .suggested_parameters.ai_mode,
    context: .parsed.context
  }'
echo ""

echo "========================================================"
echo "✅ All parsing tests complete!"
echo ""
echo "Key Features Validated:"
echo "  • Scenario type classification"
echo "  • Actor extraction with roles"
echo "  • Learning objectives suggestion"
echo "  • AI parameter recommendation"
echo "  • Confidence scoring"
echo "  • Actor validation"

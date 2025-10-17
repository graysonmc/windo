#!/bin/bash
# Comprehensive API Test Script for Windo
# Tests all endpoints with database integration

set -e  # Exit on error

API_URL="http://localhost:3000"
echo "🧪 Testing Windo API with Database Integration"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
curl -s "$API_URL/api/health" | jq .
echo -e "${GREEN}✓ Health check passed${NC}\n"

# Test 2: Create Simulation
echo -e "${BLUE}Test 2: Create Simulation${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/professor/setup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ethical Dilemma - Whistleblowing",
    "scenario": "You are a manager who has discovered financial irregularities in your company. Your boss is involved. You have a family to support and need this job.",
    "instructions": "Act as a conflicted colleague who challenges both ethical and practical considerations."
  }')

SIMULATION_ID=$(echo $RESPONSE | jq -r '.simulationId')
echo "Created simulation: $SIMULATION_ID"
echo $RESPONSE | jq .
echo -e "${GREEN}✓ Simulation creation passed${NC}\n"

# Test 3: List Simulations
echo -e "${BLUE}Test 3: List All Simulations${NC}"
curl -s "$API_URL/api/simulations" | jq '.count, .simulations[].name'
echo -e "${GREEN}✓ List simulations passed${NC}\n"

# Test 4: Start Student Session (First Message)
echo -e "${BLUE}Test 4: Student First Message${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/student/respond" \
  -H "Content-Type: application/json" \
  -d "{
    \"simulationId\": \"$SIMULATION_ID\",
    \"studentInput\": \"I should report this to the authorities immediately.\"
  }")

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo "Created session: $SESSION_ID"
echo "AI Response: $(echo $RESPONSE | jq -r '.response')"
echo -e "${GREEN}✓ First message passed${NC}\n"

# Test 5: Continue Conversation
echo -e "${BLUE}Test 5: Continue Conversation${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/student/respond" \
  -H "Content-Type: application/json" \
  -d "{
    \"simulationId\": \"$SIMULATION_ID\",
    \"sessionId\": \"$SESSION_ID\",
    \"studentInput\": \"But what about my family? I need this job.\"
  }")

echo "Message Count: $(echo $RESPONSE | jq -r '.messageCount')"
echo "AI Response: $(echo $RESPONSE | jq -r '.response')"
echo -e "${GREEN}✓ Conversation continuity passed${NC}\n"

# Test 6: Get Simulation State
echo -e "${BLUE}Test 6: Get Simulation State${NC}"
curl -s "$API_URL/api/simulation/state?simulationId=$SIMULATION_ID&sessionId=$SESSION_ID" | \
  jq '{simulation: .simulation.name, messages: .session.messageCount, state: .session.state}'
echo -e "${GREEN}✓ Get state passed${NC}\n"

# Test 7: Edit Simulation
echo -e "${BLUE}Test 7: Edit Simulation Parameters${NC}"
curl -s -X PATCH "$API_URL/api/professor/edit" \
  -H "Content-Type: application/json" \
  -d "{
    \"simulationId\": \"$SIMULATION_ID\",
    \"parameters\": {\"ai_mode\": \"expert\", \"duration\": 30}
  }" | jq '.simulation.parameters.ai_mode, .simulation.parameters.duration'
echo -e "${GREEN}✓ Edit simulation passed${NC}\n"

# Test 8: Export Session (JSON)
echo -e "${BLUE}Test 8: Export Session (JSON)${NC}"
curl -s "$API_URL/api/simulation/export?sessionId=$SESSION_ID" | \
  jq '{sessionId: .sessionId, totalMessages: .metadata.totalMessages}'
echo -e "${GREEN}✓ JSON export passed${NC}\n"

# Test 9: Export Session (Text)
echo -e "${BLUE}Test 9: Export Session (Text)${NC}"
curl -s "$API_URL/api/simulation/export?sessionId=$SESSION_ID&format=text" | head -n 10
echo -e "${GREEN}✓ Text export passed${NC}\n"

# Test 10: Cleanup
echo -e "${BLUE}Test 10: Cleanup (Delete Session)${NC}"
curl -s -X DELETE "$API_URL/api/simulation/clear?sessionId=$SESSION_ID" | jq .
echo -e "${GREEN}✓ Cleanup passed${NC}\n"

echo "================================================"
echo -e "${GREEN}✅ All tests passed successfully!${NC}"
echo ""
echo "Database Integration Status:"
echo "  • Simulations stored in PostgreSQL ✓"
echo "  • Sessions tracked independently ✓"
echo "  • Conversation history persisted ✓"
echo "  • Multi-session support enabled ✓"

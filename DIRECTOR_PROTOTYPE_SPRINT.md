# Director Prototype Sprint Plan

**Goal:** Validate Director intelligence concept before committing to full NSM architecture

**Timeline:** 1 week
**Approach:** Build lightweight prototype that observes and logs suggestions without intervening

---

## Success Criteria

- ✅ Director analyzes real conversations and logs intervention suggestions
- ✅ Evaluate if those suggestions would improve sessions
- ✅ Measure latency/cost impact
- ✅ Decide: Full NSM worth it or enhance simpler triggers?

---

## Design Principles

1. **Zero refactoring** - Add alongside existing code
2. **Observation mode** - Director logs suggestions, doesn't intervene
3. **Minimal dependencies** - Use what's already installed
4. **Fast to build** - Reuse existing OpenAI calls where possible
5. **Data-driven** - Collect metrics to inform decision

---

## File Structure (Minimal Changes)

```
packages/
├── core/
│   ├── simulation-engine.js          # Existing - NO CHANGES
│   └── director-prototype.js         # NEW - Director logic
├── api/
│   ├── server.js                     # MINOR - Add Director logging
│   └── database/
│       └── supabase.js               # MINOR - Add director_logs table
└── web/
    └── src/
        └── components/
            └── DirectorAnalysis.jsx  # NEW - View Director suggestions
```

---

## How It Works

**On each student message:**
1. **Existing flow runs normally** (no disruption to current system)
2. **Director analyzes asynchronously**:
   - Detects current phase (intro/exploration/decision)
   - Identifies patterns (stuck, off-track, ready to advance)
   - Suggests what it would do ("introduce CFO challenge", "ask about risks")
3. **Logs suggestion to database**
4. **Never intervenes** (just observes)

**After sessions:**
- Review Director logs
- Evaluate if suggestions would have helped
- Measure cost/latency of analysis

---

## Implementation Steps

### Step 1: Director Prototype Class (Core Logic)

**File: `/packages/core/director-prototype.js`**

```javascript
// Lightweight Director that analyzes but doesn't intervene

class DirectorPrototype {
  constructor(openaiClient) {
    this.openai = openaiClient;
  }

  async analyzeConversation(simulation, conversationHistory, latestMessage) {
    // Simple analysis using GPT-3.5-turbo (cheaper, faster)
    const analysis = await this._runAnalysis(simulation, conversationHistory);

    return {
      timestamp: new Date().toISOString(),
      current_phase: analysis.phase,
      student_state: analysis.studentState,
      suggestion: analysis.suggestion,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      cost: analysis.cost,
      latency_ms: analysis.latency
    };
  }

  async _runAnalysis(simulation, conversationHistory) {
    const startTime = Date.now();

    // Build analysis prompt
    const prompt = this._buildAnalysisPrompt(simulation, conversationHistory);

    // Call GPT-3.5-turbo with structured output
    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: prompt
      }],
      temperature: 0.3,
      max_tokens: 300
    });

    const latency = Date.now() - startTime;

    // Parse response
    const result = this._parseAnalysis(response.choices[0].message.content);
    result.latency = latency;
    result.cost = this._estimateCost(response.usage);

    return result;
  }

  _buildAnalysisPrompt(simulation, conversationHistory) {
    return `You are analyzing an educational simulation conversation.

SCENARIO: ${simulation.scenario_text}

LEARNING OBJECTIVES: ${simulation.objectives?.join(', ') || 'Not specified'}

CONVERSATION (last 10 messages):
${conversationHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

Analyze this conversation and provide:
1. Current Phase: intro | exploration | decision | conclusion
2. Student State: engaged | stuck | off_track | ready_to_advance
3. Suggestion: What intervention would help? (one sentence)
4. Confidence: 0.0-1.0 how confident are you?
5. Reasoning: Brief explanation

Format as JSON:
{
  "phase": "...",
  "studentState": "...",
  "suggestion": "...",
  "confidence": 0.8,
  "reasoning": "..."
}`;
  }

  _parseAnalysis(content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      // Fallback if parsing fails
      return {
        phase: "unknown",
        studentState: "unknown",
        suggestion: "Analysis failed",
        confidence: 0,
        reasoning: "Failed to parse response"
      };
    }
  }

  _estimateCost(usage) {
    // GPT-3.5-turbo pricing: ~$0.0015/1K input, ~$0.002/1K output
    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;
    return inputCost + outputCost;
  }
}

module.exports = DirectorPrototype;
```

### Step 2: Database Schema (Minimal Addition)

**Migration SQL:**
```sql
-- Simple logging table for Director observations
CREATE TABLE director_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES simulation_sessions(id),
  simulation_id UUID REFERENCES simulations(id),
  message_number INTEGER,
  analysis JSONB,  -- Stores the full analysis result
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_director_logs_session ON director_logs(session_id);
CREATE INDEX idx_director_logs_created ON director_logs(created_at DESC);
```

### Step 3: Integration (Minimal API Changes)

**File: `/packages/api/server.js` (add to existing `/api/student/respond`)**

```javascript
// After existing response is generated and saved

// NEW: Director analysis (async, doesn't block response)
if (process.env.DIRECTOR_PROTOTYPE_ENABLED === 'true') {
  // Don't await - let it run in background
  analyzeWithDirector(simulation, session, studentInput)
    .catch(err => console.error('Director analysis failed:', err));
}

// Helper function
async function analyzeWithDirector(simulation, session, studentInput) {
  const DirectorPrototype = require('../core/director-prototype');
  const director = new DirectorPrototype(openaiClient);

  const analysis = await director.analyzeConversation(
    simulation,
    session.conversation_history,
    studentInput
  );

  // Save to database
  const { error } = await supabase
    .from('director_logs')
    .insert({
      session_id: session.id,
      simulation_id: simulation.id,
      message_number: session.conversation_history.length,
      analysis: analysis
    });

  if (error) {
    console.error('Failed to save director log:', error);
  }
}
```

### Step 4: Analysis Viewer (Simple UI)

**File: `/apps/web/src/components/DirectorAnalysis.jsx`**

Simple React component that shows Director suggestions alongside conversation history:
- Display what Director suggested at each turn
- Color-coded by confidence level
- Allow manual evaluation: "Would this have helped?"

---

## Validation Metrics

### What We'll Measure:

**1. Technical Feasibility:**
- ✅ Latency: Does async analysis complete before next message?
- ✅ Cost: Actual $ spent per session
- ✅ Accuracy: Can Director detect phases/states correctly?

**2. Value Proposition:**
- ✅ Intervention Quality: Would suggestions improve sessions?
- ✅ Frequency: How often does Director suggest something useful?
- ✅ False Positives: How often are suggestions wrong/unnecessary?

**3. Decision Criteria:**

| Metric | Proceed to NSM | Enhance Simpler | Abandon |
|--------|---------------|-----------------|---------|
| Useful suggestions | >60% | 40-60% | <40% |
| Cost per session | <$0.10 | $0.10-0.20 | >$0.20 |
| Latency impact | <500ms | 500ms-1s | >1s |
| Accuracy | >70% | 50-70% | <50% |

---

## Sprint Schedule

**Day 1-2: Build Core**
- Implement DirectorPrototype class
- Add database migration
- Unit test analysis logic

**Day 3: Integration**
- Add to API endpoint
- Test on development server
- Verify logging works

**Day 4-5: Testing**
- Run on 5-10 real/simulated sessions
- Collect Director logs
- Build simple analysis viewer

**Day 6: Evaluation**
- Review all suggestions
- Calculate metrics
- Manual quality assessment

**Day 7: Decision**
- Document findings
- Decide: Full NSM, iterate simpler, or pivot
- Plan next steps

---

## Environment Setup

**Required Environment Variables:**
```bash
# Add to .env
DIRECTOR_PROTOTYPE_ENABLED=true  # Toggle prototype on/off
```

**Database Migration:**
Run the SQL migration to create `director_logs` table in Supabase.

---

## Testing Approach

### Option 1: Real Sessions
- Enable prototype on development server
- Run actual student sessions
- Collect real-world data

### Option 2: Simulated Sessions
- Create mock student conversations
- Feed them through the system
- Faster iteration, more control

### Option 3: Hybrid
- Use existing session history from database
- Replay conversations through Director
- Analyze retrospectively

---

## Decision Framework

**After sprint completion, evaluate:**

### Proceed to Full NSM if:
- ✅ Suggestions are useful >60% of the time
- ✅ Cost is manageable (<$0.10 per session)
- ✅ Latency is acceptable (<500ms)
- ✅ Clear value over simple triggers

### Enhance Simpler Solution if:
- ⚠️ Suggestions are sometimes helpful (40-60%)
- ⚠️ Cost/complexity concerning
- ⚠️ Simple rule-based system could achieve similar results

### Abandon/Pivot if:
- ❌ Suggestions rarely useful (<40%)
- ❌ Too expensive (>$0.20 per session)
- ❌ Technical issues (latency, accuracy)
- ❌ No clear improvement over current system

---

## Next Steps After Sprint

### If Validated → Path A (Full NSM):
1. Proceed to Joint Implementation Plan Phase 0
2. Build shared contracts and translation layer
3. Implement full Director with interventions
4. Build Builder V2 enhancements

### If Partially Validated → Iterate:
1. Enhance current trigger system
2. Add simple phase tracking
3. Manual director controls for professors
4. Reevaluate need for AI Director

### If Not Validated → User Research:
1. Talk to professors about pain points
2. Observe actual student struggles
3. Identify real problems to solve
4. Consider alternative approaches

---

## Cost Estimates

**Prototype Sprint:**
- Development: ~40 hours
- Testing: 10-20 sessions × $0.05-0.10 = $0.50-2.00
- Total: Minimal cost, high learning value

**Full NSM (if validated):**
- Development: ~8-12 weeks
- Ongoing costs: 3-4x current LLM spend
- Infrastructure: Refactoring, new services, monitoring

---

## Questions to Answer

1. **Do you have active sessions/users** to test on, or should we simulate student conversations?
2. **What's your OpenAI API budget** for this sprint? (~$5-20 estimated)
3. **Who will evaluate suggestion quality** - you, or should we build automated scoring?
4. **Environment** - Continue on this branch or create new prototype branch?
5. **Database access** - Supabase credentials configured for migrations?

---

## Success Definition

**This sprint succeeds if:**
We have concrete data to make an informed decision about whether to invest in full NSM architecture or pursue simpler alternatives.

**This sprint fails if:**
We build without learning, or commit to full NSM without validation.

---

*Created: October 23, 2025*
*Branch: feature/nsm-builder-v2*
*Status: Ready to begin*

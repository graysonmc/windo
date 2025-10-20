# Actor Schema Extensions - Phase 4.1-4.3

## Current Actor Schema (Phase 1)

```javascript
{
  name: "Sarah Chen",
  role: "Board Member",
  is_student_role: false,
  personality_mode: "challenging",  // 'supportive', 'challenging', 'neutral', 'expert', 'conflicted'
  description: "Veteran board member focused on shareholder value"
}
```

---

## Extended Actor Schema (Phase 4.1-4.3)

```javascript
{
  // ===== EXISTING FIELDS (Phase 1) =====
  name: "Sarah Chen",
  role: "Board Member",
  is_student_role: false,
  personality_mode: "challenging",
  description: "Veteran board member focused on shareholder value",

  // ===== PHASE 4.1: GOALS & TRIGGERS SYSTEM =====

  /** What this actor is trying to achieve in the simulation */
  goals: [
    "Maximize shareholder value",
    "Minimize reputational risk",
    "Ensure compliance with regulations"
  ],

  /** Information this actor knows but student doesn't initially know */
  hidden_info: [
    "The company has product liability insurance up to $100M",
    "Board is considering CEO replacement if crisis isn't handled well",
    "A competitor is preparing a similar product launch next month"
  ],

  /** Conditional behaviors triggered by student actions/words */
  triggers: [
    {
      id: "recall_mention",
      condition: "student_mentions:recall",
      condition_type: "keyword",  // 'keyword', 'sentiment', 'message_count', 'time_elapsed'
      response_behavior: "become_more_aggressive",
      revealed_info: "Recall would cost $50M and take 6 months",
      priority: 1  // Higher priority triggers fire first
    },
    {
      id: "defensive_stance",
      condition: "student_sentiment:defensive",
      condition_type: "sentiment",
      response_behavior: "press_harder",
      revealed_info: null
    },
    {
      id: "time_gate",
      condition: "message_count > 10",
      condition_type: "message_count",
      response_behavior: "reveal_board_pressure",
      revealed_info: "The board is meeting tomorrow and expects a decision"
    }
  ],

  // ===== PHASE 4.3: COMPLEX BEHAVIOR CONFIGURATION =====

  /** Personality traits as sliders (0-1 scale) */
  personality_traits: {
    aggressive: 0.7,        // How confrontational (0 = passive, 1 = very aggressive)
    supportive: 0.3,        // How encouraging (0 = critical, 1 = very supportive)
    analytical: 0.8,        // Focus on data vs emotion (0 = emotional, 1 = analytical)
    risk_tolerance: 0.2,    // Comfort with uncertainty (0 = risk-averse, 1 = risk-seeking)
    patience: 0.4           // How quickly they escalate (0 = impatient, 1 = very patient)
  },

  /** Who this actor sides with and how strongly */
  loyalties: [
    {
      actor_name: "CFO",
      strength: 0.9,
      reason: "Both prioritize financial outcomes"
    },
    {
      actor_name: "Marketing Director",
      strength: 0.3,
      reason: "Sometimes conflicts over short-term vs long-term thinking"
    }
  ],

  /** What matters most to this actor (ordered by importance) */
  priorities: [
    "Shareholder value",
    "Legal compliance",
    "Company reputation",
    "Employee morale"
  ],

  /** Current emotional state (can change during simulation) */
  emotional_state: {
    current: "calm",  // 'calm', 'stressed', 'defensive', 'collaborative', 'frustrated', 'satisfied'
    intensity: 0.5,   // How intense (0-1)
    trigger_threshold: 0.6  // How easily emotion shifts (lower = more volatile)
  },

  /** Relationship dynamics with other actors */
  relationships: [
    {
      actor_name: "CEO",
      relationship_type: "supervisor",  // 'supervisor', 'peer', 'subordinate', 'adversary', 'ally'
      trust_level: 0.6,
      communication_style: "direct"  // 'direct', 'political', 'supportive', 'challenging'
    }
  ]
}
```

---

## Trigger System Design

### Trigger Condition Types

1. **keyword**: Student message contains specific word/phrase
   ```javascript
   {
     condition: "student_mentions:recall",
     condition_type: "keyword",
     keywords: ["recall", "product recall", "pull the product"]
   }
   ```

2. **sentiment**: Detects student's emotional tone
   ```javascript
   {
     condition: "student_sentiment:defensive",
     condition_type: "sentiment",
     target_sentiment: "defensive"  // AI analyzes tone
   }
   ```

3. **message_count**: Triggers after N messages
   ```javascript
   {
     condition: "message_count > 10",
     condition_type: "message_count",
     threshold: 10
   }
   ```

4. **time_elapsed**: Triggers after N minutes
   ```javascript
   {
     condition: "time_elapsed > 15",
     condition_type: "time_elapsed",
     minutes: 15
   }
   ```

5. **decision_made**: Student commits to a choice
   ```javascript
   {
     condition: "student_commits:pivot",
     condition_type: "decision",
     decision_keyword: "pivot"
   }
   ```

### Response Behaviors

- `become_more_aggressive`: Increase aggressive personality trait temporarily
- `become_more_supportive`: Increase supportive trait temporarily
- `reveal_hidden_info`: Share specific hidden information
- `press_harder`: Ask more challenging questions
- `back_off`: Give student more space
- `escalate_to_authority`: Bring in another actor
- `change_emotional_state`: Shift to different emotion

---

## Hidden Information Patterns (Phase 4.2)

### Pattern Types

1. **Asymmetric Knowledge**: Different actors know different things
   - Implemented via `hidden_info` array unique to each actor

2. **Gradual Revelation**: Information unlocked by asking right questions
   ```javascript
   {
     question_keywords: ["insurance", "coverage", "protection"],
     revealed_info: "Company has product liability insurance up to $100M"
   }
   ```

3. **Conditional Disclosure**: Only revealed under certain conditions
   - Implemented via triggers with `revealed_info` field

4. **Time-Gated**: Revealed after X messages or Y minutes
   ```javascript
   {
     condition_type: "time_elapsed",
     minutes: 20,
     revealed_info: "Breaking news: Competitor just announced recall"
   }
   ```

---

## UI Design for Actor Configuration

### Actor Editing Panel (in SimulationBuilder customize step)

```
┌─────────────────────────────────────────────────────────┐
│ Actor: Sarah Chen (Board Member)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Basic Info                                               │
│ ├─ Name: [Sarah Chen                    ]               │
│ ├─ Role: [Board Member                  ]               │
│ └─ [✓] Student Role                                      │
│                                                          │
│ ▼ Goals & Motivations                                   │
│ ├─ [Maximize shareholder value          ] [X]           │
│ ├─ [Minimize reputational risk          ] [X]           │
│ └─ [+ Add Goal]                                          │
│                                                          │
│ ▼ Hidden Information                                    │
│ ├─ [Has insurance up to $100M           ] [X]           │
│ ├─ [Board considering CEO replacement   ] [X]           │
│ └─ [+ Add Hidden Info]                                   │
│                                                          │
│ ▼ Triggers (2)                                          │
│ ├─ Trigger 1: "Recall Mention"                          │
│ │   When: [student mentions: recall     ]               │
│ │   Then: [become more aggressive       ]               │
│ │   Reveal: [Recall costs $50M          ]               │
│ │   [Edit] [Delete]                                      │
│ └─ [+ Add Trigger]                                       │
│                                                          │
│ ▼ Personality Traits                                    │
│ ├─ Aggressive:    [=====>-----] 0.7                      │
│ ├─ Supportive:    [===>-------] 0.3                      │
│ ├─ Analytical:    [=======>---] 0.8                      │
│ └─ Risk Tolerance:[=>---------] 0.2                      │
│                                                          │
│ ▼ Loyalties                                             │
│ ├─ CFO: [=======>--] 0.9 (Financial alignment)          │
│ └─ [+ Add Loyalty]                                       │
│                                                          │
│ ▼ Priorities (drag to reorder)                         │
│ ├─ ≡ 1. Shareholder value                               │
│ ├─ ≡ 2. Legal compliance                                │
│ ├─ ≡ 3. Company reputation                              │
│ └─ [+ Add Priority]                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Basic Schema Support (Immediate)
- ✅ Add optional fields to actor objects
- ✅ Store extended actor data in database (JSONB is flexible)
- ✅ Display in UI (read-only for now)

### Phase 2: Goals & Hidden Info UI (Next)
- Build simple list editors for goals and hidden_info
- Save to database
- Update SimulationEngine to include in system prompt

### Phase 3: Trigger System (Complex)
- Build trigger editor UI
- Implement trigger evaluation in SimulationEngine
- Add trigger logging for debugging

### Phase 4: Personality & Behavior (Advanced)
- Build slider UI for personality traits
- Integrate traits into AI prompt generation
- Implement dynamic trait adjustment via triggers

---

## Database Impact

**No schema changes needed!**

The `actors` column is already JSONB, which means we can add any fields we want:

```sql
-- Current schema (already supports this)
actors JSONB NOT NULL DEFAULT '[]'

-- Example data
actors = [
  {
    "name": "Sarah Chen",
    "role": "Board Member",
    "goals": ["Maximize shareholder value"],
    "hidden_info": ["Insurance up to $100M"],
    "triggers": [...],
    "personality_traits": {...}
  }
]
```

No migration needed! Just start saving the new fields.

---

## API Impact

**No API changes needed!**

- POST /api/professor/setup already accepts `actors` array
- PATCH /api/professor/edit already accepts `actors` array
- SimulationEngine already receives full actor objects

Just need to:
1. Update UI to collect extended actor data
2. Update SimulationEngine to use extended actor data in prompts

---

## Example: Complete Extended Actor

```javascript
{
  name: "Sarah Chen",
  role: "Board Member",
  is_student_role: false,
  personality_mode: "challenging",
  description: "Veteran board member focused on shareholder value",

  goals: [
    "Maximize shareholder value",
    "Minimize reputational risk"
  ],

  hidden_info: [
    "Company has product liability insurance up to $100M",
    "Board is considering CEO replacement"
  ],

  triggers: [
    {
      id: "recall_mention",
      condition_type: "keyword",
      keywords: ["recall", "pull the product"],
      response_behavior: "become_more_aggressive",
      revealed_info: "Recall would cost $50M and take 6 months"
    }
  ],

  personality_traits: {
    aggressive: 0.7,
    supportive: 0.3,
    analytical: 0.8,
    risk_tolerance: 0.2
  },

  loyalties: [
    {
      actor_name: "CFO",
      strength: 0.9
    }
  ],

  priorities: [
    "Shareholder value",
    "Legal compliance",
    "Company reputation"
  ],

  emotional_state: {
    current: "calm",
    intensity: 0.5
  }
}
```

---

## Next Steps

1. ✅ Document extended schema (this file)
2. Build goals/hidden info UI in SimulationBuilder
3. Update SimulationEngine to include goals/hidden_info in prompts
4. Build trigger editor UI
5. Implement trigger evaluation logic
6. Build personality traits UI
7. Implement dynamic behavior adjustment

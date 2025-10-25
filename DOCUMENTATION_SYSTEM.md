# Windo Documentation System Rules

**Version:** 1.0
**Last Updated:** October 2024
**Purpose:** Define how we organize, maintain, and evolve project documentation

---

## 📚 Three-Document Architecture

Windo uses a three-tier documentation system that separates strategic vision, current state, and tactical implementation:

```
┌─────────────────────────────────────────────────────┐
│  TECHNICAL_VISION_ROADMAP.md                        │
│  Strategic Vision (24 months)                       │
│  "Where are we going and why?"                      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  SYSTEM_ARCHITECTURE.md                             │
│  Current State                                      │
│  "What exists today?"                               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  CONSTRUCTION_PLAN_[Phase].md                       │
│  Tactical Implementation                            │
│  "What are we building right now and how?"          │
└─────────────────────────────────────────────────────┘
```

---

## 1. TECHNICAL_VISION_ROADMAP.md

### **Purpose**
Living strategic document that defines long-term technical vision and architectural direction.

### **Contains**
- 24-month technical roadmap
- Core architectural principles and design patterns
- Stage-by-stage feature progression
- Key technical concepts and philosophies
- Detailed implementation patterns (growing over time)
- Business metrics and investment timeline
- Risk mitigation strategies

### **Update Rules**
- ✅ **Keep forward-looking** - Document upcoming stages, not completed ones
- ✅ **Update current/next stages** with detail as you plan them
- ✅ **Remove/condense completed stages** - They belong in System Architecture now
- ✅ **Update when strategy evolves** based on learnings
- ✅ **Include WHY** behind architectural choices for future work
- ✅ **Grow detail in active stages** - Add implementation patterns as you approach them
- ❌ **Don't maintain historical record** - Vision is about future, not past
- ❌ **Don't include** day-to-day tactical details (use Construction Plan)
- ❌ **Don't keep old stages** once they're complete (archive or move to System Architecture)

### **Growth Strategy**
The vision doc should **grow detail in upcoming stages, prune completed stages**:
- **Before Stage N**: High-level outline ("What we'll build")
- **Approaching Stage N**: Detailed patterns, schemas, implementation approaches
- **During Stage N**: Refine based on actual implementation learnings
- **After Stage N Completes**: Condense or remove - it's now in System Architecture

**Key Principle**: Vision always shows the path FORWARD, not backward.

### **Versioning**
- Maintain version number at top
- Update "Last Updated" date with each change
- Note major architectural shifts in version history

### **Audience**
- Engineering team (technical direction)
- Stakeholders (strategic planning)
- Future team members (onboarding)
- Partners/investors (capability overview)

---

## 2. SYSTEM_ARCHITECTURE.md

### **Purpose**
Snapshot of current production system state. Documents what exists NOW, not what's planned.

### **Contains**
- Current technical specifications
- API endpoints and interfaces
- Database schema (actual tables, not planned)
- Code statistics (LOC, module breakdown)
- Deployment architecture
- Dependency versions
- Performance benchmarks

### **Update Rules**
- ✅ **Update immediately** after deploying changes
- ✅ **Reflect reality** - document what's actually running
- ✅ **Include metrics** - code size, performance stats
- ✅ **Mark transitions** - note when major refactors are in progress
- ❌ **Don't include** future plans (use Vision doc)
- ❌ **Don't include** work-in-progress (use Construction Plan)

### **Update Triggers**
Update this document when:
- Major feature ships to production
- Database schema changes
- API structure changes
- Architecture refactors complete
- New services/modules added
- Performance characteristics change

### **Format**
- Clear section headers for each major component
- Code examples showing actual implementation
- Diagrams reflecting current state
- Version numbers and timestamps

### **Audience**
- Developers (day-to-day reference)
- DevOps (deployment configuration)
- QA (testing reference)
- Support (understanding system capabilities)

---

## 3. CONSTRUCTION_PLAN_[Phase].md

### **Purpose**
Tactical implementation guide for current development phase. Gets replaced/archived when phase completes.

### **Naming Convention**
```
CONSTRUCTION_PLAN_MCP_REFACTOR.md
CONSTRUCTION_PLAN_MULTIPLAYER_V1.md
CONSTRUCTION_PLAN_ENTERPRISE_FEATURES.md
```

### **Contains**
- Near-term sprint/phase goals (2-8 weeks)
- Detailed technical specifications for current work
- Build order and dependencies
- Step-by-step implementation tasks
- Testing strategy for this phase
- Known blockers and mitigation
- Progress tracking checkboxes

### **Lifecycle**
```
1. CREATE    → At phase start, detailed planning
2. ACTIVE    → Update daily/weekly as work progresses
3. COMPLETE  → Mark complete when phase ships
4. ARCHIVE   → Move to /docs/archive/construction-plans/
```

### **Update Rules**
- ✅ **Update frequently** - daily during active development
- ✅ **Track progress** - checkboxes, completion %, blockers
- ✅ **Be specific** - exact file paths, function names, line counts
- ✅ **Include context** - why this approach, alternatives considered
- ✅ **Document decisions** - architectural choices made during build
- ❌ **Don't make perfect** - working doc, not polished
- ❌ **Don't keep forever** - archive when phase completes

### **Sections**
```markdown
1. Phase Overview
2. Success Criteria
3. Technical Approach
4. Build Order & Dependencies
5. Implementation Details
   - Component 1
   - Component 2
   - ...
6. Testing Strategy
7. Known Risks
8. Progress Tracking
9. Decisions Log
```

### **Audience**
- Active developers (implementation guide)
- Code reviewers (context for PRs)
- Project manager (progress tracking)
- Future developers (understanding past decisions)

---

## 📋 Documentation Workflow

### **Starting New Phase**
1. Review TECHNICAL_VISION_ROADMAP.md for strategic direction
2. Review SYSTEM_ARCHITECTURE.md for current baseline
3. Create new CONSTRUCTION_PLAN_[Phase].md
4. Break vision into concrete tasks
5. Begin implementation

### **During Development**
1. Update CONSTRUCTION_PLAN daily/weekly
2. Update SYSTEM_ARCHITECTURE when features ship
3. Update TECHNICAL_VISION if strategy changes
4. Keep all three documents in sync

### **Completing Phase**
1. Mark CONSTRUCTION_PLAN as complete
2. Archive construction plan to `/docs/archive/`
3. Update SYSTEM_ARCHITECTURE with new reality
4. **Condense/remove completed stage from TECHNICAL_VISION** (it's not vision anymore - it's reality)
5. Update TECHNICAL_VISION future stages with learnings
6. Celebrate! 🎉

---

## 🎯 Core Principles

### **1. Clean Break Over Compatibility**
When architecture fundamentally changes:
- Archive old code as reference, don't maintain it
- Build new system properly from first principles
- Use old code as specification/validation
- Faster iteration without compromise

**Example:**
```javascript
// DON'T build compatibility shims
if (USE_OLD_SYSTEM) { legacyHandler() }  // ❌

// DO build clean implementation
const agent = new MCPAgent(protocol);    // ✅
```

### **2. Growing Complexity**
Documentation should evolve with the product:
- Start simple and high-level
- Add detail as you build and learn
- Don't try to document everything upfront
- Let understanding emerge from implementation

### **3. Single Source of Truth**
Each document has one purpose:
- Vision = Future strategy
- Architecture = Current state
- Construction = Active work

Don't duplicate information across documents.

### **4. Living Documents**
These are **not** static specs:
- Update as you learn
- Refine as strategy evolves
- Add detail as complexity grows
- Archive what's obsolete

### **5. Technical Depth**
Don't shy away from detail in Vision doc:
- Include actual code patterns
- Show data structures
- Explain algorithms
- Document edge cases

The Vision doc should be **both strategic AND technical**.

---

## 🗂️ File Organization

```
windo/
├── TECHNICAL_VISION_ROADMAP.md         # Strategic vision (24 months)
├── SYSTEM_ARCHITECTURE.md              # Current state snapshot
├── DOCUMENTATION_SYSTEM.md             # This file
├── CONSTRUCTION_PLAN_[Phase].md        # Active build plan
├── docs/
│   ├── archive/
│   │   ├── construction-plans/
│   │   │   ├── CONSTRUCTION_PLAN_PHASE_0.md
│   │   │   └── CONSTRUCTION_PLAN_NSM_PROTOTYPE.md
│   │   └── old-architecture/
│   │       └── PRE_MCP_ARCHITECTURE.md
│   └── decisions/
│       ├── 001-clean-break-mcp.md
│       └── 002-goal-oriented-outlines.md
├── packages/
│   └── archive/                        # Old code kept as reference
│       ├── modules/
│       └── ...
```

---

## 🔄 Maintenance Schedule

### **Daily (During Active Development)**
- Update active CONSTRUCTION_PLAN with progress
- Note blockers and decisions

### **Weekly**
- Review alignment between Vision, Architecture, Construction
- Update metrics in Architecture doc if changed

### **Monthly**
- Add learnings to Vision doc
- Refine future stages based on current experience
- Archive completed construction plans

### **Quarterly**
- Major Vision doc review and update
- Update business metrics and timeline
- Refine long-term roadmap

---

## ✅ Documentation Checklist

### **Before Starting New Feature**
- [ ] Read relevant sections of Vision doc
- [ ] Check current state in Architecture doc
- [ ] Create Construction Plan
- [ ] Identify dependencies and blockers

### **During Development**
- [ ] Update Construction Plan with progress
- [ ] Document technical decisions as they're made
- [ ] Note deviations from original plan

### **After Shipping Feature**
- [ ] Update System Architecture with new reality
- [ ] Mark Construction Plan as complete
- [ ] Archive Construction Plan
- [ ] Update Vision doc with learnings
- [ ] Update code statistics

---

## 🚨 Anti-Patterns to Avoid

### **Don't:**
- ❌ Create documentation and never update it
- ❌ Copy/paste between Vision and Construction docs
- ❌ Document future plans in Architecture doc
- ❌ Keep outdated construction plans active
- ❌ Write perfect docs - write useful docs
- ❌ Document everything - document what matters
- ❌ Treat docs as unchangeable specs

### **Do:**
- ✅ Update docs as reality changes
- ✅ Keep each doc focused on its purpose
- ✅ Archive old plans when phase completes
- ✅ Add detail to Vision doc as you learn
- ✅ Make docs easily searchable
- ✅ Include code examples and patterns
- ✅ Treat docs as living, evolving artifacts

---

## 📖 Additional Documentation Types

Beyond the three core documents, maintain:

### **Decision Records** (`docs/decisions/`)
- Why we chose X over Y
- Architectural decisions and rationale
- One decision per file
- Never modify after creation (historical record)

### **API Documentation** (Generated)
- OpenAPI/Swagger specs
- Generated from code comments
- Versioned with releases

### **Runbooks** (`docs/operations/`)
- Deployment procedures
- Incident response
- Common troubleshooting

### **Onboarding** (`docs/onboarding/`)
- Getting started guides
- Development environment setup
- Code contribution guidelines

---

## 🎓 Document Evolution Example

**Week 1: Vision Doc (Planning Stage 1)**
```markdown
### Stage 1: Protocol Foundation
- Introduce MCP architecture
- Build SAG for goal generation
- Timeline: 4 weeks
```

**Week 3: Vision Doc (Approaching Stage 1, Adding Detail)**
```markdown
### Stage 1: Protocol Foundation

#### SAG 2.0: Goal-Oriented Outline Architecture

**Philosophy:**
SAG 2.0 generates flexible "goal-oriented outlines"...

**Output Structure:**
```javascript
{
  goals: [...],
  success_criteria: {...},
  progress_tracking: {...}
}
```

**Implementation:**
[150 lines of detailed implementation patterns]
```

**Month 2: Stage 1 Complete - Vision Doc (Cleaned Up)**
```markdown
### Stage 1: Protocol Foundation ✅ COMPLETE
Brief summary: MCP protocol with SAG 2.0 implemented
See SYSTEM_ARCHITECTURE.md for current implementation

### Stage 2: Individual Bots & Artifacts (NEXT)
[Detailed planning for Stage 2...]
```

**Month 3: Vision Doc (Stage 2 In Progress)**
```markdown
### Stage 2: Individual Bots & Artifacts (IN PROGRESS)
[Detailed current work...]

### Stage 3: Dynamic Structures (UPCOMING)
[High-level overview...]
```

**Key Insight:** Vision doc stays lean and forward-focused. Completed stages move to System Architecture.

---

## 🤝 Contributing to Documentation

### **When to Update Each Document**

| Trigger | Vision | Architecture | Construction |
|---------|--------|--------------|--------------|
| Starting new phase | Review future stages | Review | Create |
| Daily progress | - | - | Update |
| Feature ships | - | Update | Mark complete |
| Strategy changes | Update future | - | - |
| Architecture evolves | Update upcoming stages | Update | Update |
| Phase completes | Condense/remove stage | Update with reality | Archive |
| Planning next phase | Add detail to upcoming | - | - |

### **Writing Style**
- **Vision**: Strategic but technical, explain WHY
- **Architecture**: Factual and precise, show WHAT
- **Construction**: Tactical and detailed, describe HOW

### **Code Examples**
- Include real code patterns in all docs
- Show actual implementations, not pseudocode
- Keep examples up-to-date with codebase

---

## 🔐 Version Control

- All documentation in git
- Update docs in same PR as code changes
- Commit messages: `docs: update Architecture with MCP protocol layer`
- Review docs in PR reviews

---

**This documentation system ensures we maintain clarity about where we are, where we're going, and how we're getting there - all while allowing the documentation to grow and evolve with the product.**

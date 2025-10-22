# DEVELOPMENT ROADMAP: Multiplayer Team Simulation Platform

**Timeline:** 10 Days (December 2024)
**Goal:** Transform Windo from single-player to multiplayer team-based simulations
**Demo Deadline:** Tonight (Day 0) - Basic features
**Final Deadline:** Day 10 - Full multiplayer system

---

## End Vision (Day 10)

**The Complete System:**
- Students work together as a team on the same case
- Each student has a different role (CFO, Sales Head, Operations, etc.)
- Real-time collaboration and debate
- AI participates as stakeholders (CEO, Board, Customers)
- Structured phases (analysis → debate → decision)
- Professor dashboard with team & individual analytics
- Support for both synchronous (live) and asynchronous (over days) play

---

## Day 0: Tonight's Demo (Immediate)

**Priority: Core Enhancements for Single-Player Demo**

### Must Have (2-3 hours)
- [ ] **First Message Automation** (20 mins)
  - Auto-send scenario intro when simulation starts
  - Include role, context, objectives
  - Set the scene professionally

- [ ] **Time Horizon Setting** (15 mins)
  - Add to UI: immediate/quarterly/annual decision horizon
  - Helps AI contextualize responses

- [ ] **Feedback System** (30 mins)
  - Post-session rating/feedback form
  - Display under conversation in UI
  - Store in database

- [ ] **Scenario Arc Generator** (45 mins)
  - Generate phases based on objectives
  - Control scenario progression
  - Create natural climax/resolution

### Nice to Have (If Time)
- [ ] Character brief in first message
- [ ] Dynamic complexity ramping
- [ ] Session summary generator

---

## Days 1-2: Foundation - Auth & Data Model

**Goal: Multi-user infrastructure**

### Day 1: Authentication & User Management & Web Deployment (everything in project blueprint)
- [ ] Implement Google OAuth (using Supabase)
- [ ] Create user profiles table
- [ ] Add user_id to all existing tables
- [ ] Implement Row Level Security (RLS)
- [ ] Protected routes in frontend
- [ ] User session management

### Day 2: Team Data Model
- [ ] Design team/room database schema
- [ ] Create tables:
  - `teams` (id, name, simulation_id, created_by, settings)
  - `team_members` (team_id, user_id, role, joined_at)
  - `team_messages` (team_id, user_id, message, timestamp)
  - `team_decisions` (team_id, phase, decision, consensus_level)
- [ ] API endpoints for team CRUD operations
- [ ] Role assignment system

---

## Days 3-4: Real-Time Infrastructure

**Goal: Enable live collaboration**

### Day 3: WebSocket Setup
- [ ] Set up Socket.io server
- [ ] Implement connection management
- [ ] Create rooms for teams
- [ ] Handle reconnection logic
- [ ] Basic message broadcasting

### Day 4: Real-Time Features
- [ ] Live cursor/presence indicators
- [ ] Real-time message sync
- [ ] Typing indicators
- [ ] User online/offline status
- [ ] Notification system

---

## Days 5-6: Multiplayer Game Logic

**Goal: Core team simulation mechanics**

### Day 5: Role-Based System
- [ ] Role templates (CFO, CMO, COO, etc.)
- [ ] Role-specific information/constraints
- [ ] Role-specific AI responses
- [ ] Perspective management (what each role sees)
- [ ] Role-based permissions

### Day 6: Team Coordination
- [ ] Consensus mechanism (voting/agreement)
- [ ] Turn-based vs real-time modes
- [ ] Phase progression logic
- [ ] Decision compilation from team
- [ ] Conflict resolution system

---

## Days 7-8: AI Integration & Scenario Management

**Goal: Smart AI that handles multiple players**

### Day 7: Multi-Actor AI
- [ ] AI context aware of all team members
- [ ] AI plays multiple stakeholders
- [ ] AI responds differently to different roles
- [ ] AI creates productive tension
- [ ] AI facilitates team dynamics

### Day 8: Scenario Arc System
- [ ] Phase-based progression
  - Phase 1: Information gathering
  - Phase 2: Analysis & debate
  - Phase 3: Decision & consequences
- [ ] Dynamic scenario adaptation
- [ ] Time pressure mechanics
- [ ] Branching based on team decisions

---

## Days 9-10: Polish & Professor Tools

**Goal: Complete system with analytics**

### Day 9: Professor Dashboard
- [ ] Team performance overview
- [ ] Individual contribution metrics
- [ ] Discussion quality analysis
- [ ] Decision tracking
- [ ] Export capabilities for grading
- [ ] Real-time monitoring during sessions

### Day 10: Testing & Polish
- [ ] End-to-end multiplayer test
- [ ] Performance optimization
- [ ] Error handling
- [ ] Edge cases (dropped players, etc.)
- [ ] UI/UX polish
- [ ] Deployment preparation
- [ ] Documentation

---

## Technical Architecture

### Frontend Changes
```
/apps/web/src/
  /contexts/
    TeamContext.jsx        # Team state management
    SocketContext.jsx      # WebSocket connection
  /pages/
    TeamLobby.jsx         # Pre-simulation team gathering
    TeamSimulation.jsx    # Main multiplayer interface
    ProfessorDashboard.jsx # Monitoring view
  /components/
    /team/
      RoleSelector.jsx    # Choose team roles
      TeamChat.jsx        # Team discussion
      DecisionPanel.jsx   # Consensus building
      MemberList.jsx      # Active participants
```

### Backend Changes
```
/packages/api/
  /websocket/
    socketServer.js       # Socket.io setup
    roomManager.js        # Team room logic
    messageHandler.js     # Real-time events
  /routes/
    teams.js             # Team CRUD
    roles.js             # Role management
```

### Database Schema Additions
```sql
-- Core team tables
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  simulation_id UUID REFERENCES simulations(id),
  created_by UUID REFERENCES users(id),
  status VARCHAR(50), -- 'waiting', 'active', 'completed'
  settings JSONB,
  created_at TIMESTAMP
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(100),
  status VARCHAR(50), -- 'active', 'disconnected'
  joined_at TIMESTAMP
);

CREATE TABLE team_messages (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(100),
  message TEXT,
  type VARCHAR(50), -- 'discussion', 'decision', 'system'
  timestamp TIMESTAMP
);
```

---

## Risk Mitigation

### Potential Blockers
1. **WebSocket scaling** → Start with Socket.io, plan for Redis adapter
2. **Complex state sync** → Use operational transforms or CRDTs
3. **AI response time** → Implement queuing and caching
4. **Team coordination** → Build async-first, add sync features

### Fallback Plans
- If full real-time fails → Turn-based multiplayer
- If consensus too complex → Simple voting
- If AI struggles with multiple users → Scripted responses for demo

---

## Daily Goals Summary

**Day 0 (Tonight):** 4 core features for demo
**Days 1-2:** Auth & database
**Days 3-4:** Real-time infrastructure
**Days 5-6:** Multiplayer mechanics
**Days 7-8:** AI & scenarios
**Days 9-10:** Analytics & polish

---

## Success Metrics

### MVP Requirements (Must Have)
- [ ] 3+ users can join same simulation
- [ ] Role-based perspectives work
- [ ] Team can reach consensus
- [ ] AI responds intelligently
- [ ] Professor can monitor progress
- [ ] System handles disconnections

### Stretch Goals (Nice to Have)
- [ ] Voice/video integration
- [ ] Replay system
- [ ] AI-generated performance reports
- [ ] Mobile responsive team interface
- [ ] Branching scenario paths

---

## Implementation Order (Tonight First!)

### Tonight (Before Midnight)
1. First message automation (20 min)
2. Time horizon setting (15 min)
3. Feedback system (30 min)
4. Scenario arc generator (45 min)

### Then Tomorrow Onward
Follow the day-by-day plan above

---

## Notes

- Start with smallest viable multiplayer (2 players)
- Test with mock users before real ones
- Keep single-player mode working throughout
- Document API changes for your engineers
- Consider using feature flags for gradual rollout

---

## Questions to Resolve

1. Synchronous vs asynchronous priority?
2. How many roles minimum/maximum?
3. What happens if someone drops mid-simulation?
4. How to handle grading/evaluation?
5. Should AI have voting power?

---

## Update Log

_Track daily progress here_

**Day 0:** [Date] - Status update...
**Day 1:** [Date] - Status update...
(etc.)
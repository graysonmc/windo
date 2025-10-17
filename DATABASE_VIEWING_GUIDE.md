# Database Viewing Guide

## Quick Reference: How to View Your Database

### Method 1: Supabase Dashboard (Visual) 🖥️

**Best for:** Browsing and editing data visually

1. Go to: https://supabase.com/dashboard/project/hosjhxkfvnwbxgwkagjz
2. Click **"Table Editor"** → Select `simulations` or `simulation_sessions`
3. View, edit, delete rows directly

**Pro tip:** Click on any row to see full details, including JSONB fields expanded.

---

### Method 2: Command Line Scripts (Fast) ⚡

**Best for:** Quick checks during development

#### View All Data
```bash
node packages/api/view-database.js
```

Shows:
- All simulations with metadata
- All sessions per simulation
- Message counts
- Summary statistics

#### View Specific Conversation
```bash
# First, get the session ID from view-database.js
node packages/api/view-conversation.js <session-id>
```

Shows:
- Full scenario text
- Complete conversation history
- Timestamps for each message
- Session metadata

---

### Method 3: SQL Queries (Powerful) 🔍

**Best for:** Complex queries and analysis

In Supabase dashboard → **SQL Editor**:

#### View all simulations
```sql
SELECT
  id,
  name,
  created_at,
  jsonb_array_length(actors) as actor_count,
  jsonb_array_length(objectives) as objective_count,
  parameters->>'ai_mode' as ai_mode
FROM simulations
ORDER BY created_at DESC;
```

#### View all active sessions
```sql
SELECT
  s.id,
  sim.name as simulation_name,
  s.state,
  jsonb_array_length(s.conversation_history) as messages,
  s.started_at,
  s.last_activity_at
FROM simulation_sessions s
JOIN simulations sim ON s.simulation_id = sim.id
WHERE s.state = 'active'
ORDER BY s.last_activity_at DESC;
```

#### View conversation history for a session
```sql
SELECT
  sim.name as simulation,
  jsonb_array_elements(s.conversation_history) as message
FROM simulation_sessions s
JOIN simulations sim ON s.simulation_id = sim.id
WHERE s.id = 'your-session-id-here';
```

#### Get statistics
```sql
SELECT
  COUNT(DISTINCT sim.id) as total_simulations,
  COUNT(s.id) as total_sessions,
  SUM(jsonb_array_length(s.conversation_history)) as total_messages,
  AVG(jsonb_array_length(s.conversation_history)) as avg_messages_per_session
FROM simulations sim
LEFT JOIN simulation_sessions s ON s.simulation_id = sim.id;
```

---

### Method 4: API Endpoints (Programmatic) 🔌

**Best for:** Building features or integrations

Start the server:
```bash
npm run api
```

#### List all simulations
```bash
curl -s http://localhost:3000/api/simulations | jq .
```

#### Get specific simulation
```bash
curl -s "http://localhost:3000/api/simulation/state?simulationId=<id>" | jq .
```

#### Get simulation with session
```bash
curl -s "http://localhost:3000/api/simulation/state?simulationId=<sim-id>&sessionId=<session-id>" | jq .
```

#### Export session
```bash
# JSON format
curl -s "http://localhost:3000/api/simulation/export?sessionId=<id>" | jq .

# Text format
curl -s "http://localhost:3000/api/simulation/export?sessionId=<id>&format=text"
```

---

## Common Tasks

### Find a specific simulation by name
**Dashboard:** Table Editor → simulations → Search box

**SQL:**
```sql
SELECT * FROM simulations WHERE name ILIKE '%crisis%';
```

**CLI:**
```bash
node packages/api/view-database.js | grep -i "crisis"
```

### See recent activity
**SQL:**
```sql
SELECT
  sim.name,
  s.started_at,
  s.last_activity_at,
  s.state
FROM simulation_sessions s
JOIN simulations sim ON s.simulation_id = sim.id
ORDER BY s.last_activity_at DESC
LIMIT 10;
```

### Delete old test data
**Dashboard:** Table Editor → Select rows → Delete

**SQL:**
```sql
-- Delete specific simulation (cascades to sessions)
DELETE FROM simulations WHERE name = 'Test Simulation';

-- Delete old sessions
DELETE FROM simulation_sessions
WHERE state = 'abandoned'
  AND last_activity_at < NOW() - INTERVAL '7 days';
```

---

## Database Structure Quick Reference

### simulations table
- `id` - UUID
- `name` - Simulation title
- `scenario_text` - The scenario description
- `actors` - JSONB array of actor configs
- `objectives` - JSONB array of learning objectives
- `parameters` - JSONB object (ai_mode, duration, etc.)
- `created_at`, `updated_at` - Timestamps

### simulation_sessions table
- `id` - UUID
- `simulation_id` - Links to simulations(id)
- `conversation_history` - JSONB array of messages
- `state` - 'active', 'completed', or 'abandoned'
- `started_at`, `last_activity_at`, `completed_at` - Timestamps

---

## Troubleshooting

**Can't see any data?**
1. Make sure you've created some simulations (run `npm run api` and create one)
2. Check you're looking at the right Supabase project
3. Run `node packages/api/test-db-connection.js` to verify connection

**Want to reset everything?**
```sql
-- In Supabase SQL Editor (CAREFUL - deletes all data!)
TRUNCATE simulation_sessions CASCADE;
TRUNCATE simulations CASCADE;
```

**Export everything for backup?**
In Supabase dashboard → Database → Backups → Download

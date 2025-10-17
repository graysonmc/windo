# Database Migration Guide

## What Changed

We've migrated Windo from an in-memory single-simulation system to a full database-backed multi-simulation platform using PostgreSQL (Supabase).

## Key Changes

### 1. Architecture
- **Before:** Single `currentSimulation` instance stored in memory
- **After:** All simulations stored in PostgreSQL database

### 2. Data Models
- **simulations** table - Stores reusable simulation configurations
- **simulation_sessions** table - Tracks individual student conversations

### 3. API Changes

#### POST /api/professor/setup
**Before:**
- Created in-memory simulation
- Returned `simulationId` (timestamp-based)

**After:**
- Creates simulation in database
- Returns UUID `simulationId`
- Returns full simulation object

#### POST /api/student/respond
**Before:**
```json
{
  "studentInput": "message"
}
```

**After:**
```json
{
  "simulationId": "uuid",      // Required
  "sessionId": "uuid",          // Optional - creates new if omitted
  "studentInput": "message"
}
```

**Response includes:**
- `sessionId` - Use this for subsequent messages
- `simulationId` - Reference to simulation
- `messageCount` - Total messages in conversation

#### GET /api/simulation/state
**Before:**
- No parameters
- Returned single simulation state

**After:**
- Query params: `?simulationId=xxx&sessionId=yyy`
- Returns simulation config + session data

#### GET /api/simulation/export
**Before:**
- No parameters
- Exported current simulation

**After:**
- Query param: `?sessionId=xxx&format=json|text`
- Exports specific session

#### DELETE /api/simulation/clear
**Before:**
- Query params: `?conversation=true` or `?all=true`
- Cleared in-memory state

**After:**
- Query params: `?sessionId=xxx` or `?simulationId=yyy`
- Deletes from database

### 4. New Endpoints

#### GET /api/simulations
List all simulations (with optional filtering)
```bash
GET /api/simulations?is_template=true
```

### 5. SimulationEngine Changes

**Before:**
```javascript
const engine = new SimulationEngine(scenario, instructions);
const result = await engine.processStudentInput(message);
```

**After:**
```javascript
const engine = new SimulationEngine();
const aiResponse = await engine.processMessage(
  simulation,           // From database
  conversationHistory,  // From database
  studentMessage
);
```

Engine is now stateless - all state management handled by database.

## Migration Checklist for Frontend/CLI

- [ ] Update simulation creation to store returned `simulationId`
- [ ] Update student interactions to pass `simulationId` and `sessionId`
- [ ] Store `sessionId` after first message for conversation continuity
- [ ] Update state retrieval to include query parameters
- [ ] Update export to use `sessionId` instead of assuming single simulation
- [ ] Handle multiple simulations (list, select, switch between)

## Benefits

✅ **Persistence** - Simulations survive server restarts
✅ **Multi-user** - Multiple simulations and sessions can run concurrently
✅ **Scalability** - Database can handle thousands of simulations
✅ **Analytics** - Query conversation history for insights
✅ **Templates** - Mark simulations as templates for reuse

## Testing

Run the comprehensive test suite:
```bash
npm run api  # Start server
./packages/api/test-api.sh  # Run tests
```

## Database Schema

See `packages/api/database/schema.sql` for complete schema.

Key tables:
- `simulations` - Simulation configurations
- `simulation_sessions` - Student conversation sessions

## Backward Compatibility

The API maintains backward compatibility for the legacy `instructions` field by storing it in `parameters.instructions`. This allows old code to continue working while new code can use the structured `actors`, `objectives`, and `parameters` fields.

# Director Prototype Setup Guide

## Quick Start

### 1. Add Environment Variable
Add this line to your `.env` file:
```bash
DIRECTOR_PROTOTYPE_ENABLED=true
```

### 2. Run Database Migration
Execute the SQL migration in Supabase:

**Option A: Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `migrations/001_director_logs.sql`
5. Click "Run"

**Option B: Command Line (if you have psql)**
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" -f migrations/001_director_logs.sql
```

**Option C: Using the helper script**
```bash
node packages/api/run-migration.js
```

### 3. Verify Migration
Check that the table was created:
```sql
SELECT * FROM director_logs LIMIT 1;
```

### 4. Start the Server
```bash
npm run api
```

### 5. Test with a Session
Run any simulation session and check the console for Director logs:
```
[Director] Analyzing session abc-123, message #3
[Director] Phase: exploration, State: engaged, Confidence: 0.85
[Director] Suggestion: Continue current approach
[Director] Cost: $0.002, Latency: 450ms
[Director] Analysis saved successfully
```

### 6. View Director Logs
Query the database to see what Director suggested:
```sql
SELECT
  message_number,
  analysis->>'current_phase' as phase,
  analysis->>'student_state' as state,
  analysis->>'suggestion' as suggestion,
  analysis->>'confidence' as confidence,
  analysis->>'reasoning' as reasoning,
  created_at
FROM director_logs
WHERE session_id = 'your-session-id'
ORDER BY message_number;
```

---

## What It Does

The Director Prototype:
- ✅ Observes every student message
- ✅ Analyzes conversation state asynchronously
- ✅ Logs what it *would* do (doesn't intervene)
- ✅ Records cost and latency metrics
- ✅ Never blocks or slows down student responses

---

## Files Added

- `packages/core/director-prototype.js` - Director AI logic
- `packages/api/server.js` - Integration (analyzeWithDirector function)
- `migrations/001_director_logs.sql` - Database schema
- `.env.director` - Environment variable example
- `DIRECTOR_PROTOTYPE_SPRINT.md` - Full sprint plan
- `DIRECTOR_PROTOTYPE_SETUP.md` - This file

---

## Disable Director

Set in `.env`:
```bash
DIRECTOR_PROTOTYPE_ENABLED=false
```

Or remove the variable entirely.

---

## Next Steps

1. Run 5-10 test sessions
2. Review Director suggestions in database
3. Evaluate: Would suggestions improve sessions?
4. Measure: Cost and latency acceptable?
5. Decide: Proceed to full NSM or iterate simpler?

See `DIRECTOR_PROTOTYPE_SPRINT.md` for full validation plan.

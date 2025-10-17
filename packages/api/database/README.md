# Windo Database Setup

This directory contains database configuration and schema files for the Windo platform.

## Quick Start: Setting Up Supabase

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose:
   - **Name**: windo-dev (or whatever you prefer)
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is perfect for development

### 2. Run Schema Migration

Once your project is created:

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `schema.sql` from this directory
4. Paste into the SQL editor
5. Click "Run" to execute
6. You should see success messages and the tables created

### 3. Get Your Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Find these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 4. Add to Environment Variables

Add these to your `.env` file in the project root:

```bash
# Existing variables
OPENAI_API_KEY=sk-...
PORT=3000
NODE_ENV=development

# Add these new Supabase credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### 5. Verify Connection

Test the connection by starting the API server:

```bash
npm run api
```

You should see the server start without errors about missing Supabase credentials.

## Database Schema Overview

### Tables

**simulations**
- Stores reusable simulation configurations created by professors
- Contains scenario text, actors, objectives, and parameters
- Can be marked as templates for reuse

**simulation_sessions**
- Individual student conversation sessions
- Links to a simulation configuration
- Tracks conversation history and session state

### Key Features

- **UUID primary keys** for scalability
- **JSONB columns** for flexible configuration storage
- **Automatic timestamps** via triggers
- **Foreign key constraints** for data integrity
- **Indexes** on commonly queried fields

## Database Helper Functions

The `supabase.js` file exports a `db` object with helper functions:

```javascript
import { db } from './database/supabase.js';

// Create a simulation
const sim = await db.createSimulation({
  name: "Crisis Management",
  scenario_text: "...",
  actors: [...],
  objectives: [...],
  parameters: {...}
});

// Create a session for a student
const session = await db.createSession(sim.id);

// Add messages to session
await db.addMessageToSession(session.id, {
  role: 'student',
  content: 'What should I do?',
  timestamp: new Date()
});
```

## Troubleshooting

**Error: SUPABASE_URL is required**
- Make sure you've added the credentials to `.env`
- Check that `.env` is in the project root (not in packages/api)

**Error: relation "simulations" does not exist**
- You need to run the schema.sql file in Supabase SQL Editor
- Make sure it completed successfully with no errors

**Connection timeout**
- Check your internet connection
- Verify the Supabase project URL is correct
- Confirm the project is active in Supabase dashboard

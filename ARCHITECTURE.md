# Windo Architecture - How Everything Works Together

## 🏗️ Current Working Architecture

### Frontend (apps/web/)
**Purpose**: Modern React UI for users to interact with simulations

- **src/App.jsx** - Main app entry, renders HomePage
- **src/pages/HomePage.jsx** - Main UI with tabs, simulation cards (mockup data)
- **src/components/SimulationBuilder.jsx** - REAL working component that connects to backend API
- **src/main.jsx** - React app bootstrap
- **Config files**: vite.config.js, tailwind.config.js, postcss.config.js

### Backend API (packages/api/)
**Purpose**: REST API server that handles simulation logic

- **server.js** - Express server with endpoints:
  - POST `/api/professor/setup` - Create new simulation
  - POST `/api/student/respond` - Send student message, get AI response
  - PATCH `/api/professor/edit` - Edit simulation
  - GET `/api/simulation/state` - Get current state
  - GET `/api/simulation/export` - Export conversation
  - DELETE `/api/simulation/clear` - Clear simulation

### Core Engine (packages/core/)
**Purpose**: Business logic for AI simulations

- **simulation-engine.js** - SimulationEngine class that:
  - Manages conversation state
  - Interfaces with OpenAI API
  - Applies Socratic method constraints
  - Tracks history and metadata

### CLI Interface (packages/cli/)
**Purpose**: Terminal interface (original MVP)

- **index.js** - Interactive CLI with menus for:
  - Professor setup
  - Student chat
  - Export/edit features

## 🔄 How They Work Together

```
User → React UI (apps/web)
         ↓
    SimulationBuilder component
         ↓
    HTTP Request (axios)
         ↓
    API Server (packages/api)
         ↓
    SimulationEngine (packages/core)
         ↓
    OpenAI API
         ↓
    Socratic Response
         ↓
    Back to UI
```

## 📦 Files We Can Delete/Clean Up

### Can Delete:
1. **ui mockup** - Original mockup file (now in apps/web)
2. **ui-mockup.html** - Standalone version (now proper React app)
3. **test-cli.js** - Test file (if exists)
4. **apps/api/** - Empty directory structure (we use packages/api)

### Should Keep:
1. **packages/** - All working backend code
2. **apps/web/** - New React frontend
3. **CLAUDE.md** - AI assistant instructions
4. **PROJECT_STRUCTURE.md** - Planning doc
5. **.env** - API keys
6. **README.md** - Project documentation

## 🎯 Current State

### Working Features:
- ✅ Create simulations with custom scenarios
- ✅ Chat with Socratic AI advisor
- ✅ Real-time response streaming
- ✅ Beautiful React UI
- ✅ Terminal CLI alternative
- ✅ Export conversations

### Mockup/Not Connected:
- ❌ Simulation cards on homepage (static data)
- ❌ Social features (likes, comments)
- ❌ User accounts
- ❌ Database persistence
- ❌ Multiple concurrent simulations
- ❌ Search functionality

## 🚀 Next Steps for Production

1. **Add Database** (PostgreSQL/MongoDB)
   - Store simulations permanently
   - User accounts and authentication
   - Multiple simulations per user

2. **Connect Homepage Cards**
   - Replace mockup data with real simulations
   - Implement browse/discover features

3. **User System**
   - Authentication (Auth0, Clerk)
   - Profiles
   - Following system

4. **Enhanced Features**
   - Real-time updates (WebSockets)
   - Rich text editing
   - File uploads for context
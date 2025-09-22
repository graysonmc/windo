# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Windo is an AI-powered educational simulation platform that transforms static business case studies into dynamic, AI-driven learning experiences. It uses the Socratic method where AI advisors challenge students' thinking without providing solutions, teaching critical thinking through exploration rather than memorization.

The MVP is a terminal-based proof-of-concept built as a Node.js monorepo using npm workspaces with three main packages: Core simulation engine, REST API server, and CLI interface.

## Architecture

### Monorepo Structure
```
windo/
├── packages/
│   ├── api/          # Express REST API server with OpenAI GPT-4 integration
│   ├── cli/          # Terminal interface for professors and students
│   └── core/         # SimulationEngine class - manages AI conversations and state
└── package.json      # Root workspace configuration
```

### Package Dependencies
- **api**: Express 5.x, OpenAI SDK (GPT-4 API), CORS support
- **cli**: Axios for API calls, Chalk for terminal styling, Inquirer for interactive prompts
- **core**: OpenAI SDK, simulation state management

## Development Commands

### Running the Application
```bash
# Start both API server and CLI concurrently
npm run dev

# Start only the API server with nodemon (auto-reload)
npm run api

# Start only the CLI interface
npm run cli

# Production API server
npm start
```

### Package-Specific Development
```bash
# Work within a specific package
cd packages/api   # or packages/cli or packages/core

# Install dependencies for a specific package
npm install <package-name> --workspace=packages/api
```

### Environment Configuration
The project uses dotenv for environment variables. Ensure `.env` file exists in the root directory with necessary API keys (likely OpenAI API key based on dependencies).

## Key Technical Details

- **Node.js Workspaces**: The project uses npm workspaces defined in root `package.json`
- **Concurrency**: Uses `concurrently` package to run multiple processes in development
- **Hot Reload**: API server uses `nodemon` for automatic reloading during development
- **OpenAI Integration**: Both `core` and `api` packages have OpenAI SDK as dependency
- **API Communication**: CLI uses Axios to communicate with the API server

## MVP Features to Implement

### Core Functionality
1. **SimulationEngine** (`packages/core/simulation-engine.js`):
   - Manage conversation state and history
   - Interface with OpenAI GPT-4 API
   - Apply Socratic method constraints (challenge without giving answers)
   - Handle professor's AI behavior instructions

2. **API Server** (`packages/api/server.js`):
   - POST `/scenario` - Create new scenario with professor's input
   - POST `/conversation` - Handle student messages
   - PUT `/scenario/:id/instructions` - Edit AI behavior mid-simulation
   - GET `/conversation/:id/export` - Export conversation history

3. **CLI Interface** (`packages/cli/index.js`):
   - Professor mode: Input scenario and AI behavior instructions
   - Student mode: Interactive conversation with AI advisor
   - Edit mode: Modify AI behavior during simulation
   - Export functionality for conversation analysis

### Design Principles
- **Maximum flexibility**: No hardcoded pedagogy - let professors experiment
- **Socratic method**: AI challenges but never gives answers
- **Real-time iteration**: Edit and test different approaches instantly
- **Simple architecture**: Prove the concept before adding complexity

## Current State

The project is in early development with empty main implementation files. The foundation (package structure, dependencies) is set up and ready for core feature implementation.

## Testing

Currently no test framework is configured. All packages have placeholder test scripts that exit with error.
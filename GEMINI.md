# Windo - AI-Powered Educational Simulation Platform

## Project Overview

Windo is an AI-powered educational simulation platform that transforms static business case studies into dynamic, interactive learning experiences. The goal is to create a tool for students to practice critical thinking and decision-making in ambiguous situations.

The platform is a Node.js-based monorepo with three main packages:

*   `packages/api`: An Express-based REST API that will handle the core logic and communication with the OpenAI API.
*   `packages/cli`: A command-line interface for users to interact with the simulation.
*   `packages/core`: A package intended to house the core simulation engine logic.

The current development goal is to build a terminal-based MVP to validate the core concept of an AI-driven Socratic learning experience.

## Building and Running

The project uses `npm` workspaces. To get started, run `npm install` in the root directory to install all dependencies.

The following scripts are available in the root `package.json`:

*   `npm run dev`: Starts both the API and CLI in development mode. This is the recommended way to run the project.
*   `npm run api`: Starts the API server using `nodemon` for automatic restarts.
*   `npm run cli`: Starts the CLI.
*   `npm start`: Starts the API server.

**TODO:** Add instructions for running tests once a testing framework is set up.

## Development Conventions

**TODO:** Define and document coding style, testing practices, and contribution guidelines.

## File Structure

```
windo/
├── packages/
│   ├── api/           # Express REST API
│   │   ├── server.js  # (empty) API server entry point
│   │   └── package.json
│   ├── cli/           # Terminal interface
│   │   ├── index.js   # (empty) CLI entry point
│   │   └── package.json
│   └── core/          # SimulationEngine class
│       ├── simulation-engine.js # (empty) Core simulation logic
│       └── package.json
├── .gitignore
├── GEMINI.md
├── package.json
└── README.md
```

### Package Overview

*   **`packages/api`**: This package will contain the Express server that exposes a REST API for the `cli` to consume. It will be responsible for managing the simulation state and interacting with the OpenAI API.
*   **`packages/cli`**: This package will provide the user interface for interacting with the simulation. It will use a library like `inquirer` to create an interactive command-line experience.
*   **`packages/core`**: This package is intended to contain the core logic of the simulation engine. This could include managing the conversation history, and handling the interaction with the AI model.

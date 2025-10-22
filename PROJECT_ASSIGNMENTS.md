# PROJECT ASSIGNMENTS: Windo Parallel Development Tracks

**Status:** Active
**Version:** 1.0
**Created:** December 2024

---

## Project Overview

This document outlines two independent development tracks for the Windo platform. These projects are designed to enhance the user experience while being developed in parallel with the core platform. Both projects should be built directly into the existing codebase.

**Timeline:** 2-3 weeks total
**Priority:** Landing page (High), Setup Wizard (Medium)

---

## Local Development Setup

### Prerequisites

- **Node.js** (v18 or later recommended)
- **npm** (v8 or later, typically comes with Node.js)
- **Git**
- **Code editor** (VS Code recommended)

### Initial Setup

1. **Clone the Repository:**
```bash
git clone https://github.com/graysonmc/windo.git
cd windo
```

2. **Create Your Branch:**
```bash
git checkout -b feature/your-name-assignments
```

3. **Install Dependencies:**
This project uses npm workspaces. Install all dependencies from the root directory:
```bash
npm install
```

4. **Configure Environment:**
Create a `.env` file in the root directory with the following:
```env
# OpenAI API Key (will be provided)
OPENAI_API_KEY="your_api_key_here"

# Supabase Credentials (will be provided)
SUPABASE_URL="your_supabase_url"
SUPABASE_ANON_KEY="your_anon_key"
```

### Running the Application

To start both the backend API and frontend web app concurrently:

```bash
npm run dev
```

- The API server will be available at `http://localhost:3000`
- The web application will be available at `http://localhost:5173`

### Understanding the Codebase

**Key Directories:**
- `/apps/web` - React frontend application
- `/packages/api` - Express backend server
- `/packages/core` - Core simulation engine
- `/apps/web/src/components/SimulationBuilder.jsx` - Current simulation setup system (reference this!)

---

# Project 1: Landing Page

## Overview

Create a minimal, clean landing page that will eventually serve as the entry point for new users. This page will be built directly into the existing web application.

### Timeline
- **Duration:** 1-2 days
- **Priority:** High
- **Complexity:** Low

### Technical Requirements

#### File Structure

Create the following files in the existing web app:

```
/apps/web/src/
  /pages/
    HomePage.jsx         (existing - don't modify)
    LandingPage.jsx     (create this)
  /components/
    /landing/           (create this folder)
      HeroSection.jsx   (optional - can all be in LandingPage.jsx)
```

#### Implementation

**LandingPage.jsx Structure:**
```jsx
import React from 'react';
import { User } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              WINDO
            </div>
            <div className="text-sm text-gray-500">
              Early Access
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Transform Cases Into Simulations
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
          AI-powered business simulations that adapt to every student
        </p>

        {/* Auth Buttons */}
        <div className="flex gap-4 justify-center">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>

          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Account
          </button>
        </div>

        {/* Beta Badge */}
        <div className="mt-12">
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            🚀 Currently in Beta
          </span>
        </div>
      </div>
    </div>
  );
}
```

#### Integration Instructions

1. **Add to HomePage.jsx temporarily for testing:**
Add a simple link or button to access the landing page. At the top of the existing HomePage component, add:

```jsx
// Temporary: Remove this after testing
const [showLanding, setShowLanding] = useState(false);

if (showLanding) {
  return <LandingPage />;
}

// In the render, add a toggle button:
<button
  onClick={() => setShowLanding(true)}
  className="fixed bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
>
  View Landing Page
</button>
```

### Requirements

- **Minimal Design:** Keep it mostly blank/clean as requested
- **Essential Elements Only:**
  - Windo branding/logo
  - One-line value proposition
  - Google Sign In button (visual only, no functionality)
  - Create Account button (visual only, no functionality)
  - Beta/Early Access badge
- **Styling:** Use existing Tailwind classes to match the current app's design system
- **Dark Mode:** Include dark mode classes (already in the example above)
- **Responsive:** Should look good on mobile and desktop

### Deliverables

- [ ] LandingPage.jsx component
- [ ] Integration with temporary access from HomePage
- [ ] Screenshot of completed page
- [ ] Brief explanation of any design decisions

---

# Project 2: AI Setup Wizard

## Overview

Build an intelligent conversational interface that interviews professors to understand their teaching goals and automatically generates optimal simulation configurations. This should feel like having a knowledgeable colleague help you set up your simulation.

### Timeline
- **Duration:** 2-3 weeks
- **Priority:** Medium
- **Complexity:** High

### Core Concept

Instead of professors manually configuring 15+ settings, they have a natural conversation with an AI that asks smart questions and builds the perfect simulation setup. The system should be efficient - gathering the minimum information needed for a good experience without sacrificing quality.

### Technical Requirements

#### File Structure

```
/apps/web/src/
  /components/
    /SetupWizard/              (create this folder)
      SetupWizard.jsx          (main component)
      ChatInterface.jsx        (conversation UI)
      ConfigGenerator.jsx      (converts chat to config)
      WizardContext.jsx        (state management)
    /SimulationBuilder.jsx     (existing - study this for reference!)
```

#### Key Features to Implement

1. **Intelligent Conversation Flow**
   - Natural language understanding using OpenAI API
   - Adaptive questioning based on responses
   - Smart defaults to minimize questions
   - Context awareness from uploaded documents

2. **Document Integration**
   - Accept document uploads during conversation
   - Extract context to reduce questions needed
   - Use existing parser in SimulationBuilder.jsx as starting point
   - Improve or replace parsing logic as needed

3. **Configuration Mapping**
   - Access to ALL simulation settings
   - Discretion over which to configure vs use defaults
   - Output same config format as manual setup
   - Validate configuration before finalizing

#### Existing Resources to Leverage

**Study these existing files:**

1. **SimulationBuilder.jsx** - Contains:
   - Current setup form structure
   - Document upload and parsing logic
   - Configuration object format
   - Validation logic

2. **Example Configuration Output:**
```javascript
{
  name: "Simulation Name",
  scenario_text: "Full scenario description...",
  objectives: ["Critical Thinking", "Strategic Planning"],
  parameters: {
    duration: 45,
    complexity: "adaptive",
    ai_mode: "socratic_guide",
    time_pressure: "moderate",
    document_context: "uploaded_file_content..."
  }
}
```

3. **Existing Parser Example** (from SimulationBuilder.jsx):
```javascript
// The current system has a basic parser - you can improve this
const parseScenarioText = (text) => {
  // Extracts company, situation, objectives
  // You can enhance or replace this
};
```

### Implementation Guidelines

#### Design Philosophy

**Efficiency First:**
- Don't ask questions if the answer can be inferred
- Use document content to skip redundant questions
- Quick setup path for experienced users (3-4 questions)
- Detailed path for users who need guidance

**Example Efficient Flow:**
```
AI: "What's the main skill you want students to practice?"
Prof: "Negotiation" [uploads merger case document]

AI: [Reads document, extracts: 45-min duration, M&A context, two parties]
"I see this is a merger negotiation. Should students represent the buyer or seller?"
Prof: "Buyer"

AI: "Perfect! I've configured a 45-minute merger negotiation from the buyer's perspective. Ready to launch?"
[Already inferred all other settings from context]
```

#### Creative Freedom Areas

You have complete freedom to design:

1. **Conversation Style**
   - Formal vs friendly tone
   - Linear vs branching dialogue
   - Number and depth of questions

2. **UI/UX Design**
   - Chat bubble style vs form wizard
   - Progress indicators
   - Real-time config preview or reveal at end

3. **Intelligence Features**
   - When to ask follow-ups
   - How to handle ambiguous responses
   - Confidence scoring for generated configs
   - Learning from user corrections

4. **Technical Approach**
   - State management solution
   - API interaction patterns
   - Error handling strategy

### Minimum Requirements

1. **Functional Conversation:** Natural dialogue that feels intelligent
2. **Document Support:** Can upload and extract context from files
3. **Valid Output:** Generates proper simulation configuration
4. **Efficiency:** Minimizes questions while maintaining quality
5. **Error Handling:** Gracefully handles unclear inputs

### Deliverables

1. **Working Prototype**
   - Integrated into existing app
   - Accessible from SimulationBuilder
   - Fully functional conversation flow

2. **Documentation**
   - Flow chart of conversation logic
   - Explanation of design decisions
   - List of all settings it can configure

3. **Demo Materials**
   - Video showing 2-3 different user journeys
   - Examples of efficient vs detailed setups
   - How it handles edge cases

### Integration Points

The wizard should integrate with the existing system:

```jsx
// In SimulationBuilder.jsx, add option to use wizard
<button onClick={() => setShowWizard(true)}>
  Use AI Setup Assistant
</button>

{showWizard && (
  <SetupWizard
    onComplete={(config) => {
      // Receives same config object as manual setup
      setSimulationConfig(config);
      setShowWizard(false);
    }}
    onCancel={() => setShowWizard(false)}
  />
)}
```

### Evaluation Criteria

We're looking to see:
- How you approach conversation design
- User experience considerations
- Handling of edge cases and ambiguity
- Code quality and architecture decisions
- Creative problem-solving
- Balance between efficiency and thoroughness

---

## Development Workflow

### Git Workflow

1. **Create feature branch:**
```bash
git checkout -b feature/your-name-assignments
```

2. **Commit regularly:**
```bash
git add .
git commit -m "feat: add landing page hero section"
```

3. **Push your branch:**
```bash
git push origin feature/your-name-assignments
```

### Code Standards

- Use existing ESLint and Prettier configs
- Follow the pattern of existing components
- Include comments for complex logic
- Use TypeScript if comfortable (optional)

### Testing Your Work

1. **Landing Page:**
   - Test on different screen sizes
   - Verify dark mode works
   - Check all text is readable

2. **Setup Wizard:**
   - Test with various user inputs
   - Try uploading different documents
   - Verify configuration output is valid
   - Test edge cases (unclear responses, no document, etc.)

### Communication

- Daily progress updates (even if just "working on X")
- Ask questions early if anything is unclear
- Share work-in-progress for feedback
- Document any assumptions made

---

## Timeline & Milestones

### Week 1
**Days 1-2:** Landing page complete
**Days 3-5:** Setup wizard UI and basic flow
**Days 6-7:** Document integration

### Week 2
**Days 8-10:** AI conversation intelligence
**Days 11-12:** Configuration mapping and validation
**Days 13-14:** Testing and refinement

### Week 3 (if needed)
**Days 15-17:** Polish and edge cases
**Days 18-20:** Documentation and demo prep
**Day 21:** Final delivery

---

## Questions?

If anything is unclear:
1. Check existing code first (especially SimulationBuilder.jsx)
2. Make reasonable assumptions and document them
3. Ask for clarification on critical decisions
4. Share progress early for feedback

Remember: We value creative problem-solving and thoughtful UX decisions. Show us how you think about building great products!

---

## Bonus Points

If you finish early or want to go above and beyond:

- Add animations/transitions for better UX
- Include a "confidence score" for generated configs
- Create preset templates for common courses
- Add ability to save/load conversation templates
- Write unit tests for critical logic
- Add analytics to track which flows work best

Good luck! We're excited to see what you build.
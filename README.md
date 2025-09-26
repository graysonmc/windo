# Windo - AI-Powered Educational Simulation Platform

## Product Vision
Windo is an AI-powered platform that empowers educators and trainers to create their own dynamic, interactive simulations from any text-based scenario. Users can input a case study, a real-world event, or a custom-written problem, and Windo's engine generates an AI 'thinking partner' for learners to engage with. This approach moves beyond rigid, multiple-choice questions, instead fostering real-world critical thinking as students navigate ambiguous problems through Socratic dialogue.

## Core Problem
Traditional education simulations are rigid and fail to teach critical thinking. Students need to learn how to navigate ambiguous, complex problems where each decision affects future outcomes - just like the real world.

## The Solution
An AI simulation platform where:
- **Professors** create custom scenarios from any case study
- **Students** make real decisions with no predetermined "right" answer  
- **AI advisors** challenge thinking without providing solutions
- **Learning** happens through exploration, not memorization

## MVP Architecture (Terminal-Based)

### Current Implementation Goal
A simple terminal-based proof-of-concept with:
1. **Professor inputs** scenario text (case study + any AI behavior instructions)
2. **Student interacts** via text conversation with AI advisor
3. **Professor can edit** instructions mid-simulation to experiment
4. **Single user** for now (no concurrent sessions)

### Technical Structure
windo/
├── packages/
│   ├── core/          # SimulationEngine class
│   ├── api/           # Express REST API
│   └── cli/           # Terminal interface

### Core Features for MVP
- **Flexible scenario input**: Professor provides full context in one text field
- **AI conversation**: Powered by OpenAI GPT-4 API
- **State management**: Track conversation history
- **Edit mode**: Modify AI behavior mid-conversation
- **Export**: Save conversations for analysis

### Design Principles
1. **Maximum flexibility**: No hardcoded pedagogy - let professors experiment
2. **Socratic method**: AI challenges but never gives answers
3. **Real-time iteration**: Edit and test different approaches instantly
4. **Simple architecture**: Prove the concept before adding complexity

## Example Use Case: The Zara "Pink Scarf" Case

**Professor inputs:**
You are the CEO of Zara. A pink scarf worn by a celebrity has gone viral.
Social media projects 500,000 units of demand, but you have zero inventory.
Decision required: How many units to produce?
AI behavior: Act as a skeptical COO. Challenge assumptions about trend longevity.
Focus on inventory risk. Never suggest what to do, only raise concerns.

**Student experience:**
Student: "Let's produce 300,000 units to capture most demand"
AI: "Interesting. What data points suggest this trend will last the 3 weeks
needed for production and distribution? Fashion trends can die overnight."
Student: "We should move fast though..."
AI: "Fast, yes. But what's our exposure if we're left with 300,000 unsold
scarves? Have you modeled that scenario?"

## Development Status
Building MVP to validate core concept:
- Terminal interface (no web UI yet)
- Single scenario at a time
- Focus on AI interaction quality
- Gather feedback on what teaching styles work best

## Future Vision
- Web dashboard for professors
- Multiple concurrent student sessions
- Analytics on student thinking patterns
- Marketplace for sharing scenarios
- Integration with university LMS systems

## Why This Matters
Windo isn't just digitizing case studies - it's fundamentally changing how students learn to think. By removing predetermined answers and adding intelligent opposition, we're preparing students for the ambiguous, complex decisions they'll face in the real world.
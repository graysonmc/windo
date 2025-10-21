
# PROJECT BLUEPRINT: Windo

**Status:** Active
**Version:** 1.0

---

## 1. Project Overview

Windo is an AI-powered educational simulation platform that transforms static business case studies into dynamic, interactive learning experiences. The goal is to create a tool for students and professionals to practice critical thinking and decision-making in ambiguous situations.

### 1.1. Architecture

The project is a Node.js-based monorepo with several key packages:

*   `/apps/web`: The main web application built with React. This is the primary interface for creating, managing, and participating in simulations.
*   `/packages/api`: The backend REST API server built with Express. It handles business logic, database interactions, and communication with the OpenAI API.
*   `/packages/core`: The core simulation engine containing the main AI logic.
*   `/packages/cli`: A command-line interface for interacting with the simulation.

---

## 2. Local Development Setup

This guide provides instructions for setting up the project on a local development machine.

### 2.1. Prerequisites

*   **Node.js** (v18 or later recommended)
*   **npm** (v8 or later, typically comes with Node.js)
*   **Git**

### 2.2. Initial Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd windo
    ```

2.  **Install Dependencies:** This project uses `npm` workspaces. Install all dependencies from the root directory.
    ```bash
    npm install
    ```

3.  **Configure Environment:** Create a new file named `.env` in the root of the project. You will be provided with the values for these keys.
    ```env
    # OpenAI API Key
    OPENAI_API_KEY="<Your_OpenAI_API_Key>"

    # Supabase Credentials for Local Dev
    SUPABASE_URL="<Your_Supabase_Project_URL>"
    SUPABASE_ANON_KEY="<Your_Supabase_Anon_Key>"
    ```

### 2.3. Running the Application

To start the backend API and the frontend web app concurrently, run the following command from the root directory:

```bash
npm run dev
```
*   The API server will be available at `http://localhost:3000`.
*   The web application will be available at `http://localhost:5173`.

---

## 3. Product Requirements: Multi-User Platform Launch

This section defines the requirements for the initial public launch of the Windo platform.

### 3.1. User Stories

*   **As a Logged-Out User:** I want to visit a public landing page to understand the product and must log in via Google to access the application.
*   **As a Logged-In User:** I want to be taken directly to the main application after logging in, have all my work permanently saved to my private account, and be able to log out securely.

### 3.2. Key Features

*   **Authentication:** Users sign up and log in exclusively via Google OAuth.
*   **Routing:** The application will have a public landing page and a protected area for authenticated users.
*   **Data Isolation:** All user-generated content is private and accessible only to the user who created it.
*   **Performance:** The system will support ~5 concurrent users without significant degradation.

---

## 4. Technical Implementation Plan

This is the detailed, phased checklist for building the multi-user platform.

### Phase 1: Database & Authentication Setup

*   **Task 1.1 (Supabase):** In the Supabase dashboard, enable the **Google** authentication provider.
*   **Task 1.2 (SQL):** Create and run a migration to add a `user_id` foreign key (`UUID REFERENCES auth.users(id)`) to the `simulations`, `documents`, and `sessions` tables.
*   **Task 1.3 (SQL):** Create and run a migration to enable Row-Level Security (RLS) on these tables and add policies that restrict access to the data owner (e.g., `USING (auth.uid() = user_id)`).

### Phase 2: Backend Implementation (API)

*   **Task 2.1 (Middleware):** Create an authentication middleware (`middleware/auth.js`) that validates the JWT from the `Authorization` header using Supabase.
*   **Task 2.2 (Routes):** Apply the auth middleware to all protected routes in `server.js`.
*   **Task 2.3 (CORS):** Update the `cors` configuration in `server.js` to use a `CORS_ORIGIN` environment variable.

### Phase 3: Frontend Implementation (Web App)

*   **Task 3.1 (Dependency):** Install `@supabase/supabase-js` in `apps/web`.
*   **Task 3.2 (Refactor):** Replace the hardcoded API URL with `import.meta.env.VITE_API_BASE_URL`.
*   **Task 3.3 (Auth):** Create a global `AuthProvider` (React Context) to manage user sessions.
*   **Task 3.4 (Routing):** Implement a `<ProtectedRoute>` component to manage access to authenticated routes.
*   **Task 3.5 (UI):** Build the `LandingPage.jsx` and `UserMenu.jsx` (with sign-out) components.

---

## 5. Production Deployment Plan

This section provides the steps to deploy the completed application to a live production environment.

### 5.1. Prerequisites

*   **Accounts:** Access to Vercel, Render, and a production Supabase project.
*   **Secrets:** Production keys for OpenAI and Supabase.
*   **Domain:** A custom domain name (optional).

### 5.2. Step 1: Deploy Backend API to Render

1.  In Render, create a new **Web Service** and connect the GitHub repository.
2.  **Configuration:**
    *   **Name:** `windo-api`
    *   **Environment:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node packages/api/server.js`
    *   **Instance Type:** **Starter** (or higher)
3.  **Environment Variables:** Add the production secrets (`OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) and `CORS_ORIGIN` (set to your Vercel domain).
4.  Deploy the service.

### 5.3. Step 2: Deploy Frontend App to Vercel

1.  In Vercel, create a new **Project** and connect the GitHub repository.
2.  **Configuration:**
    *   **Framework Preset:** `Vite`
    *   **Root Directory:** `apps/web`
3.  **Environment Variables:** Add `VITE_API_BASE_URL` and set its value to the live URL of your Render API.
4.  Deploy the project.

### 5.4. Step 3: Final Testing

*   Perform end-to-end testing on the live application as per the checklist in the `TECHNICAL_DESIGN.md`.
*   If using a custom domain, configure DNS records in Vercel, Render, and your domain registrar.
*   Ensure the `CORS_ORIGIN` variable in Render is updated to the final custom domain.

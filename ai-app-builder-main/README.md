# MetaBuilder

MetaBuilder is a self-hosted AI app builder for creating, iterating, sharing, exporting, and deploying React apps from natural-language prompts.

It combines a React frontend with a FastAPI backend, OpenAI-powered code generation, email/password authentication, project history, GitHub export, and deployment hooks for Vercel and Netlify.

## Highlights

- Prompt-to-app workflow for generating and refining project files
- Project dashboard with saved apps, templates, and builder sessions
- Email/password authentication for local and self-hosted usage
- Shareable project links
- GitHub export flow
- Deployment settings and deployment endpoints for Vercel and Netlify
- MongoDB support with automatic local JSON fallback when Mongo is unavailable
- No Emergent runtime dependency

## Tech Stack

- Frontend: React, React Router, CRACO, Tailwind CSS, Radix UI, Axios
- Backend: FastAPI, OpenAI SDK, Motor/PyMongo, bcrypt
- Auth: Cookie-based sessions plus bearer-token support in the client
- Storage: MongoDB or `backend/data/<db_name>.json` fallback

## Project Structure

```text
backend/   FastAPI API, auth, generation, export, deployment logic
frontend/  React app, dashboard, builder, settings, share pages
```

## Features

### App Builder

- Create a project from the dashboard
- Generate code from a prompt
- Iterate on the same project with saved messages and files
- Browse templates as starting points

### Authentication

- Sign up and log in with email/password
- Local development works without cross-site auth providers
- Session tokens are returned by the backend and persisted by the frontend

### Collaboration and Delivery

- Generate share links for projects
- Export generated apps to GitHub
- Configure Vercel and Netlify tokens
- Trigger deployment flows from the app

## Routes

- `/` landing page
- `/login` authentication
- `/dashboard` project overview
- `/builder/:projectId` builder workspace
- `/templates` starter templates
- `/settings` GitHub and deployment settings
- `/share/:slug` shared project view

## Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB optional for local development
- An OpenAI API key for code generation

## Environment Variables

### Backend

Create `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
PROJECT_URL=https://github.com/IDListcreativ/ai-app-builder
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URI=http://127.0.0.1:3000/github/callback
```

Notes:

- `OPENAI_API_KEY` is required for `/api/generate`
- If MongoDB is not reachable, the backend falls back to `backend/data/test_database.json`
- GitHub OAuth values are only required if you want to use the GitHub connect/export flow

### Frontend

Create `frontend/.env.development.local`:

```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8001
```

## Running Locally

### 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Backend docs:

```text
http://127.0.0.1:8001/docs
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm start
```

Frontend app:

```text
http://127.0.0.1:3000
```

## Storage Behavior

By default, the app will try to connect to MongoDB using `MONGO_URL`. If that connection fails, it automatically switches to a local JSON datastore so signup, login, and project flows still work during local development.

Fallback data location:

```text
backend/data/test_database.json
```

## Authentication Notes

- OAuth session exchange is disabled in self-hosted mode
- The app uses email/password auth locally
- The frontend stores the returned session token and sends it back as authorization on protected requests
- Local cookies are configured to work over HTTP during development

## API Overview

Main backend areas:

- `/api/auth/*` authentication and session endpoints
- `/api/projects/*` project CRUD, messages, files, share flows
- `/api/generate` OpenAI-backed file generation
- `/api/github/*` GitHub auth, status, export, repo listing
- `/api/deployment/*` deployment token management and deploy actions

## Repository Details

- Repository URL: `https://github.com/IDListcreativ/ai-app-builder`
- Suggested GitHub About:
  `AI-powered full-stack app builder for creating, iterating, sharing, exporting, and deploying React apps from natural-language prompts.`
- Suggested topics:
  `ai`, `app-builder`, `react`, `fastapi`, `openai`, `code-generation`, `full-stack`, `mongodb`

## Current Status

This project is configured for local self-hosted development and no longer relies on Emergent runtime services.

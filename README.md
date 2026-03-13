# ai-app-builder-main

Self-hosted AI app builder for creating, iterating, sharing, exporting, and deploying React apps from natural-language prompts.

## Repository Layout

The application source lives in:

```text
ai-app-builder-main/
```

That nested folder contains the frontend, backend, auth flow, local storage fallback, and deployment integrations.

## Quick Start

```bash
cd ai-app-builder-main
```

From there:

- Frontend app code is in `frontend/`
- Backend API code is in `backend/`
- Main app documentation is in `ai-app-builder-main/README.md`

## Local Run

Backend:

```bash
cd ai-app-builder-main/backend
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Frontend:

```bash
cd ai-app-builder-main/frontend
npm install
npm start
```

## Notes

- Local auth uses email/password
- OpenAI powers code generation
- MongoDB is supported, with local JSON fallback for development
- The generated app documentation is in `ai-app-builder-main/README.md`

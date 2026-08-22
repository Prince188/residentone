# ResidentOne

Multi-society residential management platform.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB, Mongoose
- **Auth:** JWT (access + refresh tokens)

## Prerequisites

- Node.js >= 18
- MongoDB running locally or a connection URI
- npm >= 9

## Setup

1. Install dependencies:
   ```bash
   # Root (for dev scripts)
   npm install

   # Backend
   cd backend && npm install

   # Frontend
   cd frontend && npm install
   ```

2. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` with your MongoDB URI and JWT secrets.

3. Start development servers:
   ```bash
   npm run dev
   ```

   This starts both the API (port 5000) and web (port 5173) concurrently.

## Project Structure

```
ResidentOne/
├── backend/          # Express API server
│   └── src/
│       ├── config/       # env, logger, database
│       ├── modules/      # feature modules (auth, user, society, health)
│       ├── middlewares/   # auth, validation, error handling
│       ├── shared/       # types, plugins (tenantPlugin)
│       ├── socket/       # Socket.IO scaffold
│       ├── app.ts
│       └── server.ts
├── frontend/         # React SPA (Vite)
│   └── src/
│       ├── features/     # feature-specific pages & components
│       ├── components/   # shared UI components
│       ├── providers/    # context providers
│       ├── stores/       # Zustand state stores
│       └── lib/          # API client, types, utils
├── package.json      # Root scripts (runs both projects)
└── README.md
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API + Web dev servers |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web dev server only |
| `npm run build` | Build both API and Web |
| `npm run typecheck` | Typecheck both projects |

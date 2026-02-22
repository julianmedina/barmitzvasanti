---
description: How to run the Pacman multiplayer backend server
---

## Run Pacman Backend

// turbo-all

1. Install backend dependencies:

```bash
cd c:\trabajos\BarMitzva\backend && npm install
```

2. Ensure `.env` file exists in `backend/` with these variables (see `.env.example`):

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # Full JSON of service-account.json
CORS_ORIGIN=http://localhost:8081
PORT=3000
```

3. Start the server in development mode (auto-reload):

```bash
cd c:\trabajos\BarMitzva\backend && npm run dev
```

4. Or start in production mode:

```bash
cd c:\trabajos\BarMitzva\backend && npm start
```

## Verify
- Health check: `GET http://localhost:3000/api/health`
- Game status: `GET http://localhost:3000/api/game/status`

## Notes
- The backend requires `service-account.json` for Firebase Admin SDK
- Socket.IO runs on the same port as the HTTP server
- CORS must match the Expo app URL (default `http://localhost:8081`)
- The frontend socket URL is configured in `services/pacmanSocket.ts`

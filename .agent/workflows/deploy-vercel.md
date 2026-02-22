---
description: How to deploy the Expo web frontend to Vercel
---

## Deploy Frontend to Vercel

### Prerequisites
- Vercel account at https://vercel.com
- Vercel CLI: `npm i -g vercel`

### Steps

1. Export the Expo web build:

```bash
cd c:\trabajos\BarMitzva && npx expo export --platform web
```

This creates a `dist/` directory with the static site.

2. Deploy to Vercel (first time — will create project):

```bash
cd c:\trabajos\BarMitzva && vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your Vercel account
- **Link to existing project?** → No (first time) / Yes (subsequent)
- **Project name?** → `barmitzva` (or your preference)
- **Directory?** → `./dist`
- **Override settings?** → No

3. For subsequent deploys:

```bash
cd c:\trabajos\BarMitzva && npx expo export --platform web && vercel --prod
```

### Configuration
The `vercel.json` in the project root handles SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Notes
- The Expo web output is a static site — no server needed
- Firebase config is embedded in the frontend code (`services/firebaseConfig.ts`)
- The Pacman backend must be deployed separately (Railway, Render, etc.)
- Update `services/pacmanSocket.ts` production URL after deploying backend

### Environment
No environment variables needed on Vercel — Firebase config is hardcoded in the client.
The backend URL for Pacman Socket.io is in `services/pacmanSocket.ts` (line 6).

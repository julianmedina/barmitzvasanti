# BarMitzva Project — Overview

## What Is This
"El Bar de Medina" is an interactive Bar Mitzva party app for Santi Medina. Guests access it via their phones to play games, take selfies, write social messages, and watch video tributes ("homenajes"). A projector dashboard shows the leaderboard, news feed, and social wall in real time.

## Tech Stack
- **Frontend**: Expo / React Native (SDK 54), TypeScript, React 19
- **Routing**: expo-router (file-based)
- **Fonts**: Montserrat (300, 400, 700) via `@expo-google-fonts`
- **Icons**: FontAwesome via `@expo/vector-icons`
- **Backend (Pacman)**: Node.js + Express + Socket.IO
- **Database**: Firebase Firestore (`barmitzvamedina` named DB)
- **Storage**: Firebase Storage
- **Auth**: Firebase Anonymous Auth
- **Cloud Functions**: Firebase Functions v2 (Google Drive sync, Push notifications)
- **Game Engine**: Custom Canvas/RN rendering (Pacman uses pure React Native Views, not Phaser)

## Directory Structure
```
BarMitzva/
├── app/                    # Expo Router screens
│   ├── index.tsx           # Landing / Login screen
│   ├── _layout.tsx         # Root layout (auth, fonts, navigation)
│   ├── modal.tsx           # Modal screen
│   ├── (tabs)/             # Tab navigator
│   │   ├── _layout.tsx     # Tab bar config
│   │   ├── index.tsx       # Home screen (menu grid)
│   │   ├── games.tsx       # Games listing
│   │   └── explore.tsx     # ⚠️ Expo boilerplate (unused)
│   ├── games/              # Game screens
│   │   ├── pacman-lobby.tsx
│   │   ├── pacman.tsx
│   │   ├── roulette.tsx
│   │   ├── soccer.tsx
│   │   ├── trivia.tsx
│   │   └── camera.tsx      # In-game camera
│   ├── social/
│   │   ├── santi-no-es-santi.tsx  # Social wall
│   │   └── homenajes.tsx          # Video tributes
│   ├── selfie/index.tsx    # Selfie camera
│   ├── profile/index.tsx   # User profile editor
│   ├── admin/index.tsx     # Admin panel (PIN protected)
│   └── dashboard/index.tsx # Projector dashboard
├── backend/                # Pacman multiplayer server
│   ├── server.js           # Express + Socket.IO entry
│   ├── gameState.js        # In-memory game state
│   ├── socketHandlers.js   # Socket event handlers
│   ├── gameLoop.js         # 20 TPS game loop
│   ├── mazeGenerator.js    # Procedural maze
│   ├── spatialGrid.js      # Spatial partitioning
│   ├── memoryManager.js    # Memory cleanup
│   ├── firebaseSyncManager.js  # Score sync to Firebase
│   ├── circularBuffer.js   # Lag compensation
│   └── config.js           # Game configuration
├── components/             # Shared components
├── constants/theme.ts      # Color palettes + fonts
├── hooks/                  # React hooks
├── services/               # Data layer
│   ├── firebaseConfig.ts   # Firebase init
│   ├── database.ts         # All Firestore CRUD
│   ├── pacmanSocket.ts     # Socket.IO client
│   ├── notifications.ts    # Push notification registration
│   └── storage.ts          # Storage helpers
├── functions/              # Firebase Cloud Functions
│   └── index.js            # syncToDrive, notifications
├── types/pacman.ts         # TypeScript types
├── firebase.json           # Firebase config
├── firestore.rules         # Firestore security rules
└── storage.rules           # Storage security rules
```

## Color Palette
- **Elegant Dark**: `#121212` background, `#D4AF37` gold accent
- **River**: `#E4002B` red
- **Macabi**: `#4DA8DA` blue

## Firebase Project
- Project ID: `barmedina-fa97f`
- Firestore DB: `barmitzvamedina`
- Auth: Anonymous

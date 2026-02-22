# BarMitzva Architecture

## Frontend Architecture

### App Flow
1. **Landing** (`app/index.tsx`) → User enters nickname → Anonymous Firebase Auth → Navigate to Tabs
2. **Tabs** (`app/(tabs)/`) → Home grid with all features
3. **Games** → Each game is a standalone screen under `app/games/`
4. **Social** → Message wall + Homenajes videos
5. **Admin** → PIN-protected panel for managing content
6. **Dashboard** → Full-screen projector view with leaderboard, news ticker, social feed

### Services Layer (`services/`)
- `firebaseConfig.ts` — Initializes Firebase app, exports `auth`, `db`, `storage`
- `database.ts` — All Firestore operations organized in 9 sections:
  1. Leaderboard / Scores (cumulative)
  2. Social Messages ("Santi no es Santi")
  3. Homenajes Management
  4. News Feed
  5. User Profiles
  6. Media Metadata
  7. Global Configs
  8. Storage Helpers (file upload)
  9. Push Notifications (token save)
- `pacmanSocket.ts` — Socket.IO client singleton class
- `notifications.ts` — Expo push notification registration
- `storage.ts` — Storage helper utilities

### Key Patterns
- **Anonymous Auth**: All users sign in anonymously. Firebase UID = user identity.
- **Real-time subscriptions**: All data uses `onSnapshot` for live updates.
- **Config-driven UI**: Branding text, prompts, and titles loaded from Firestore `configs` collection.
- **Score system**: Cumulative points across all games. Each game calls `updatePlayerScore(points)`.

## Backend Architecture (Pacman)

### Server Stack
- Express HTTP server + Socket.IO on same port (default 3000)
- Firebase Admin SDK for Firestore access
- In-memory game state (no DB for game sessions)

### Game Loop (20 TPS)
- `gameLoop.js` — Runs every 50ms, broadcasts state snapshots at 10/sec
- `gameState.js` — Single game session, player management, dot/pellet tracking
- `socketHandlers.js` — Handles join, move, eat, capture, respawn events
- `spatialGrid.js` — Spatial partitioning for viewport-based state delivery
- `memoryManager.js` — Auto-cleanup of disconnected players every 30s
- `firebaseSyncManager.js` — Syncs scores to Firestore every 60s
- `circularBuffer.js` — Position history for lag compensation

### Socket Events
| Client → Server | Description |
|---|---|
| `join_game` | Join with uid, role, name |
| `move_input` | Send movement input |
| `eat_dot` | Claim dot collection |
| `eat_power_pellet` | Claim power pellet |
| `capture_attempt` | Ghost tries to capture pacman |
| `request_respawn` | Pacman requests respawn after watching video |
| `request_viewport` | Request viewport-optimized state |

| Server → Client | Description |
|---|---|
| `game_state` | Full state on join |
| `game_snapshot` | Periodic state update |
| `player_captured` | Notification of capture |
| `respawn_granted` | Respawn approved |
| `game_started` | New session started |
| `game_reset` | Game reset |

## Firebase Collections
| Collection | Doc ID | Purpose |
|---|---|---|
| `scores` | Firebase UID | Player leaderboard scores |
| `profiles` | Firebase UID | User profile (name, avatar, etc.) |
| `messages` | Auto ID | Social wall messages |
| `news` | Auto ID | News feed / announcements |
| `homenajes` | Auto ID | Video homenaje entries |
| `media` | Auto ID | Uploaded media metadata |
| `configs` | Config key | App configuration values |
| `tokens` | Auto ID | Push notification tokens |

## Cloud Functions (Firebase Functions v2)
1. **`syncToDrive`** — On `media` create → downloads image → uploads to Google Drive folder
2. **`notifyNewHomenaje`** — On `homenajes` create → pushes notification if unlocked
3. **`notifyUnlockedHomenaje`** — On `homenajes` update → pushes notification when unlocked

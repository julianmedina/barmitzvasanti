# BarMitzva Games Guide

## 1. Pacman Gigante (Multiplayer)
**Status**: ✅ Complete — Production-ready

### How It Works
- Players join via lobby, choose role: **Pacman** or **Ghost**
- Multiplayer via Socket.IO with Node.js backend
- Procedurally generated maze with dots and power pellets
- Pacman collects dots for points; Ghosts chase and capture
- Power pellets make ghosts vulnerable for 10 seconds
- Captured pacmans must watch a video to respawn
- Joystick controls (mobile) + keyboard (web)

### Files
| File | Description |
|---|---|
| `app/games/pacman-lobby.tsx` | Lobby screen (join game, see player count) |
| `app/games/pacman.tsx` | Main game screen (822 lines) |
| `services/pacmanSocket.ts` | Socket.IO client service |
| `components/Joystick.tsx` | Touch joystick component |
| `types/pacman.ts` | TypeScript type definitions |
| `backend/server.js` | Express + Socket.IO entry |
| `backend/gameState.js` | In-memory game state |
| `backend/socketHandlers.js` | Socket event handlers |
| `backend/gameLoop.js` | 20 TPS game loop |
| `backend/mazeGenerator.js` | Maze generation algorithm |
| `backend/spatialGrid.js` | Viewport optimization |
| `backend/config.js` | Game config (speeds, scores, timers) |

### Scoring
- Dot: 1 pt | Power Pellet: 10 pts | Ghost eaten: 200 pts | Capture bonus: 50 pts

---

## 2. Trivia Medina
**Status**: ✅ Complete

### How It Works
- 5 multiple-choice questions about Santi
- 10 second timer per question
- Correct answers score points, saved to Firebase
- End screen shows final score

### Files
| File | Description |
|---|---|
| `app/games/trivia.tsx` | Full game (321 lines) |

### What Could Be Improved
- Questions are hardcoded — could load from Firebase/admin
- Only 5 questions — could add many more
- No difficulty levels

---

## 3. La Ruleta (Roulette)
**Status**: ✅ Complete

### How It Works
- Animated spinning wheel with "prendas" (dares)
- Random selection using Animated API
- After spin, shows the selected dare
- Camera button to take a photo of the dare being done

### Files
| File | Description |
|---|---|
| `app/games/roulette.tsx` | Full game (248 lines) |
| `app/games/camera.tsx` | Camera screen for photo evidence |

### What Could Be Improved
- 6 hardcoded prendas — could load from Firebase/admin
- No points awarded for completing dares

---

## 4. Hacele un Caño (Soccer)
**Status**: 🟡 Mostly Complete

### How It Works
- Player controls a footballer moving left/right
- Defenders move back and forth blocking
- Player shoots ball toward goal
- Collision detection with defenders
- Score saved to Firebase

### Files
| File | Description |
|---|---|
| `app/games/soccer.tsx` | Full game (396 lines) |

### What Could Be Improved
- Game over condition could be more polished
- No progressive difficulty
- Phaser is installed as a dependency but not used by this game
- Could benefit from better animations

---

## Camera System
**Status**: ✅ Complete

### Files
| File | Description |
|---|---|
| `app/games/camera.tsx` | In-game camera (for roulette dares) |
| `app/selfie/index.tsx` | Standalone selfie camera |

Both cameras:
- Take photo → Preview → Upload to Firebase Storage → Save metadata to Firestore
- Cloud Function automatically syncs to Google Drive

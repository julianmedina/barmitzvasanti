# 🎉 El Bar de Medina — App Interactiva para Bar Mitzva

App interactiva para la fiesta de Bar Mitzva de **Santi Medina**. Los invitados acceden desde el celular para jugar, sacar selfies, escribir mensajes y ver homenajes en video. Se proyecta un dashboard en pantalla gigante con ranking, noticias y muro social en tiempo real.

## 📱 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Expo / React Native (SDK 54), TypeScript, React 19 |
| Routing | expo-router (file-based) |
| Backend Pacman | Node.js + Express + Socket.IO |
| Base de Datos | Firebase Firestore (`barmitzvamedina`) |
| Storage | Firebase Storage |
| Auth | Firebase Anonymous Auth |
| Cloud Functions | Firebase Functions v2 |
| Fonts | Montserrat (Google Fonts) |
| Icons | FontAwesome |

## 🎮 Juegos

| Juego | Descripción | Estado |
|---|---|---|
| **Pacman Gigante** | Multijugador en tiempo real. Elegís Pacman o Fantasma. Socket.IO | ✅ Completo |
| **Trivia Medina** | 5 preguntas sobre Santi con timer | ✅ Completo |
| **La Ruleta** | Girá la ruleta, te toca una prenda | ✅ Completo |
| **Hacele un Caño** | Juego de fútbol, esquivá defensores y metela | ✅ Funcional |

## 📂 Estructura del Proyecto

```
app/                     → Pantallas (expo-router)
  index.tsx              → Landing / Login
  (tabs)/                → Tab navigator (Inicio, Juegos)
  games/                 → Pacman, Ruleta, Soccer, Trivia
  social/                → Muro Social, Homenajes
  selfie/                → Cámara selfie
  profile/               → Perfil del usuario
  admin/                 → Panel de admin (con PIN)
  dashboard/             → Dashboard para proyector
backend/                 → Servidor Pacman multiplayer
services/                → Firebase + Socket.IO
components/              → Componentes compartidos
constants/               → Tema (colores, fonts)
functions/               → Cloud Functions (Drive sync, notificaciones)
```

## 🚀 Cómo Correrlo

### Frontend (Expo)
```bash
npm install
npx expo start --web        # Browser
npx expo start              # Todas las plataformas
```

### Backend Pacman
```bash
cd backend
npm install
npm run dev                  # Desarrollo con auto-reload
```
Requiere el archivo `.env` con `FIREBASE_SERVICE_ACCOUNT`, `CORS_ORIGIN`, `PORT`.

### Deploy Web (Vercel)
```bash
npx expo export --platform web
vercel --prod
```

### Deploy Firebase
```bash
firebase deploy              # Todo
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## 🔧 Configuración

### Firebase
- Project ID: `barmedina-fa97f`
- Firestore DB: `barmitzvamedina` (named database)
- Auth: Anonymous sign-in automático

### Backend Pacman (`.env`)
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
CORS_ORIGIN=http://localhost:8081
PORT=3000
```

### URLs de Producción
- Frontend: Configurar en Vercel
- Backend Pacman: Configurar en Railway/Render (actualizar URL en `services/pacmanSocket.ts`)

## 🗃️ Colecciones Firebase

| Colección | Uso |
|---|---|
| `scores` | Ranking de puntos |
| `profiles` | Perfiles de usuarios |
| `messages` | Muro social |
| `news` | Feed de noticias |
| `homenajes` | Videos homenaje |
| `media` | Metadata de fotos/selfies |
| `configs` | Configuración de la app |
| `tokens` | Tokens push notifications |

## 📖 Documentación Completa

Toda la documentación del proyecto está en `.agent/`:
- **Workflows**: `.agent/workflows/` — Cómo correr y deployar
- **Rules**: `.agent/rules/` — Arquitectura, juegos, overview
- **Skills**: `.agent/skills/barmitzva-dev/` — Convenciones de desarrollo
- **Cursor**: `.cursorrules` — Reglas para Cursor AI

## 👨‍💻 Desarrollo

Para agregar un nuevo juego:
1. Crear `app/games/mi-juego.tsx`
2. Usar `Colors` y `Fonts` de `@/constants/theme`
3. Usar `updatePlayerScore(puntos)` de `@/services/database`
4. Agregar card en `app/(tabs)/games.tsx`
5. Agregar ícono en `app/(tabs)/index.tsx`

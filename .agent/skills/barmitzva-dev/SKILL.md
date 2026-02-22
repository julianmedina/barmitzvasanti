---
name: barmitzva-dev
description: Development patterns and conventions for the BarMitzva project
---

# BarMitzva Development Skill

## Project Context
This is a Bar Mitzva party app for "Santi Medina". Built with Expo/React Native targeting web + mobile. Read the rules in `.agent/rules/` for full architecture details.

## Development Conventions

### File Structure
- Screens go in `app/` following expo-router file-based routing
- Shared components go in `components/`
- All Firebase/data operations go through `services/database.ts`
- Socket operations go through `services/pacmanSocket.ts`
- Theme colors and fonts are in `constants/theme.ts`

### Styling
- Use `StyleSheet.create()` for all styles
- Always use colors from `Colors.elegant.*`, `Colors.river.*`, or `Colors.macabi.*`
- Always use fonts from `Fonts.sans`, `Fonts.bold`, or `Fonts.light`
- Dark theme by default (background: `#121212`, text: white, accent: gold `#D4AF37`)

### Firebase Patterns
- Auth: Anonymous sign-in on app load (`_layout.tsx`)
- Documents keyed by Firebase UID for user data (`scores`, `profiles`)
- Auto-generated IDs for content (`messages`, `news`, `homenajes`, `media`)
- Always use `sanitize()` from `database.ts` before writing to Firestore
- Use `onSnapshot` for real-time subscriptions, return unsubscribe function

### Navigation
- Use `useRouter()` from `expo-router`
- Push for new screens: `router.push('/games/soccer')`
- Replace for auth flow: `router.replace('/(tabs)')`
- Back: `router.back()`

### Error Handling
- Wrap Firebase calls in try/catch
- Show `Alert.alert()` for user-facing errors
- Console.error for debugging

### Score System
- Call `updatePlayerScore(points)` to add points to current user
- Points are cumulative across all games
- Leaderboard subscribes via `subscribeToLeaderboard()`

### Adding a New Game
1. Create `app/games/my-game.tsx`
2. Import `Colors`, `Fonts` from `@/constants/theme`
3. Import `updatePlayerScore` from `@/services/database`
4. Add navigation card in `app/(tabs)/games.tsx`
5. Add icon in home grid `app/(tabs)/index.tsx`
6. Use `Stack.Screen options={{ headerShown: false }}` for full-screen games

### Admin Panel
- PIN protected (check `configs` collection in Firestore)
- Manages: News, Homenajes, Messages, Media, Configs, Leaderboard
- Access via direct URL: `/admin`

## Running Locally
See `.agent/workflows/run-frontend.md` and `.agent/workflows/run-backend.md`

## Deploying
See `.agent/workflows/deploy-vercel.md` and `.agent/workflows/deploy-firebase.md`

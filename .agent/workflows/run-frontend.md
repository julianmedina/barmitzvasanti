---
description: How to run the Expo frontend (web, iOS, Android)
---

## Run Frontend

// turbo-all

1. Install dependencies from the project root:

```bash
cd c:\trabajos\BarMitzva && npm install
```

2. Start the Expo dev server for **web**:

```bash
cd c:\trabajos\BarMitzva && npx expo start --web
```

3. Or start for **all platforms** (interactive picker):

```bash
cd c:\trabajos\BarMitzva && npx expo start
```

Then press:
- `w` → Web browser
- `a` → Android emulator
- `i` → iOS simulator
- Scan QR with **Expo Go** app on your phone

## Notes
- The app runs on port `8081` by default
- Firebase Auth uses anonymous sign-in automatically
- Web output mode is `static` (configured in `app.json`)
- For mobile, you need Expo Go or a development build

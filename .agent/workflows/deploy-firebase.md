---
description: How to deploy Firebase Functions, Firestore rules, and Storage rules
---

## Deploy Firebase Services

### Prerequisites
- Firebase CLI: `npm i -g firebase-tools`
- Login: `firebase login`
- Project: `barmedina-fa97f`

### Deploy Everything

```bash
cd c:\trabajos\BarMitzva && firebase deploy
```

### Deploy Individual Services

1. **Firestore Rules only:**
```bash
cd c:\trabajos\BarMitzva && firebase deploy --only firestore:rules
```

2. **Storage Rules only:**
```bash
cd c:\trabajos\BarMitzva && firebase deploy --only storage
```

3. **Cloud Functions only:**
```bash
cd c:\trabajos\BarMitzva && firebase deploy --only functions
```

### Install Functions Dependencies (before deploying functions)
```bash
cd c:\trabajos\BarMitzva\functions && npm install
```

### Cloud Functions Overview
- `syncToDrive` — Syncs uploaded media to Google Drive on Firestore `media` create
- `notifyNewHomenaje` — Sends push notifications on new homenaje creation
- `notifyUnlockedHomenaje` — Sends push notifications when homenaje is unlocked

### Notes
- Firestore database name is `barmitzvamedina` (not `(default)`)
- Functions require `service-account.json` in `functions/` directory
- Google Drive target folder: `1MOfze1ttd74aF7sWaRcDwPDy_wtONRGx`
- Push notifications use Expo Push API

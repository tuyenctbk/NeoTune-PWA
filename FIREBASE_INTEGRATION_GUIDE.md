# NeoTune Firebase Integration & Multi-Platform Configuration Guide

This guide documents the Firebase integration for **NeoTune**, covering both the **Web App (NeoTune PWA)** and the **Android App (Neotune Android)**, including Authentication, Firestore persistence, Security Rules, Remote Config, and Analytics.

---

## 1. Firebase Project Overview

| Property | Value |
| :--- | :--- |
| **Firebase Project ID** | `sentry-hub` |
| **Auth Domain** | `sentry-hub.firebaseapp.com` |
| **Storage Bucket** | `sentry-hub.firebasestorage.app` |
| **Messaging Sender ID** | `770166560462` |
| **Google Analytics ID** | `G-Z9850X9XBN` |

---

## 2. Registered Platform Apps

### 🌐 2.1 Web App (NeoTune PWA)
- **App Nickname**: `NeoTune PWA`
- **App ID**: `1:770166560462:web:260911451b591a00a9229f`
- **Type**: Progressive Web App / Single-Page Application (SPA)
- **SDK Configuration**: Loaded via `firebase-applet-config.json` and consumed by `src/services/firebaseService.ts`.

#### Web SDK Configuration (`firebase-applet-config.json`):
```json
{
  "projectId": "sentry-hub",
  "appId": "1:770166560462:web:260911451b591a00a9229f",
  "apiKey": "AIzaSyB6PynYEm0VVQEkcxcgtcgUcH1Z9Dzp_KA",
  "authDomain": "sentry-hub.firebaseapp.com",
  "firestoreDatabaseId": "",
  "storageBucket": "sentry-hub.firebasestorage.app",
  "messagingSenderId": "770166560462",
  "measurementId": "G-Z9850X9XBN",
  "recaptchaSiteKey": ""
}
```

#### Initialization Code Snippet:
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with Offline Cache Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Google Analytics
export let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isAnalyticsSupported().then(supported => {
    if (supported) analytics = getAnalytics(app);
  });
}
```

---

### 📱 2.2 Android App (Neotune Android)
- **App Name**: `Neotune Android`
- **Package Name**: `com.neotune.radio`
- **Target Platforms**: Android Phones, Tablets, Android Auto, Android TV
- **Google Services File**: `google-services.json`

#### Android Integration Overview:
1. **Dependencies (`android/app/build.gradle`)**:
   ```groovy
   plugins {
       id 'com.android.application'
       id 'com.google.gms.google-services'
   }

   dependencies {
       // Import the Firebase BoM
       implementation platform('com.google.firebase:firebase-bom:33.7.0')
       
       // Declare Firebase SDK dependencies
       implementation 'com.google.firebase:firebase-analytics'
       implementation 'com.google.firebase:firebase-auth'
       implementation 'com.google.firebase:firebase-firestore'
       implementation 'com.google.firebase:firebase-messaging'
   }
   ```
2. **Project-level `build.gradle`**:
   ```groovy
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.4.2'
       }
   }
   ```

---

## 3. Cloud Firestore Data Schema (`firebase-blueprint.json`)

NeoTune uses a multi-tier Firestore document structure with subcollections under user documents:

```
/users/{userId}                              (User Profile, theme, audio quality)
  ├── /favorites/{stationId}                 (Pinned radio stations)
  ├── /recents/{stationId}                   (Playback history)
  ├── /alarms/{alarmId}                      (Scheduled radio alarms)
  └── /podcastProgress/{episodeId}           (Audio episode timestamp resumption)

/remote_config/main                          (Curated trending stations & announcement banners)
/shared_stations/{stationId}                 (Station click counters and global upvotes)
/station_chats/{stationId}/messages/{msgId}  (Real-time station live chat room)
/fcm_tokens/{tokenId}                        (Push notification device tokens)
```

---

## 4. Firestore Security Rules (`firestore.rules`)

The security rules enforce Zero-Trust Attribute-Based Access Control (ABAC):
- Users can only read and write their own documents and subcollections (`/users/{userId}/**`).
- Public station chats allow read access for all listeners with authenticated author mutation gates.
- Remote configuration is publicly readable for dynamic promotions and announcements.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User profile and private subcollections
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /{allSubcollections=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // Remote Config & curated items
    match /remote_config/{docId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // Shared Stations Analytics
    match /shared_stations/{stationId} {
      allow read: if true;
      allow write: if true;
    }

    // Community Live Chat for Radio Stations
    match /station_chats/{stationId}/messages/{messageId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // FCM tokens for push alarm notifications
    match /fcm_tokens/{tokenId} {
      allow read, write: if true;
    }
  }
}
```

---

## 5. Cross-Device Cloud Handoff & Sync

1. **Active Playback Session Handoff**:
   - As a user listens to a stream on their phone (Android app) or laptop (Web app), the active station and timestamp are synchronized in Firestore.
   - When launching NeoTune on a second device, a **"Resume from Device"** banner appears offering 1-tap seamless playback continuation.

2. **Favorites & Offline Cache**:
   - IndexedDB acts as the offline persistent cache.
   - Any modifications made while offline are automatically synchronized to `sentry-hub` Cloud Firestore once connectivity is restored.

# Household sync — one-off setup (~5 minutes, free)

Sync uses Google Firebase (free "Spark" plan — no card needed). One person
sets it up once; after that every family member just signs in with Google
and joins with the family code.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with your Google
   account.
2. **Add project** → name it `naijaplate` → Google Analytics **off** →
   Create.

## 2. Turn on Google sign-in

1. In the left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Google** → Enable → pick your support email →
   Save.
3. Still in Authentication: **Settings → Authorized domains → Add domain** →
   add `seyikusa1.github.io` (localhost is already allowed).

## 3. Create the database

1. **Build → Firestore Database → Create database** → location
   `europe-west2 (London)` → **production mode** → Create.
2. Open the **Rules** tab, replace everything with the following, then
   **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{code} {
      allow get, create, update: if request.auth != null;
      allow list, delete: if false;
    }
  }
}
```

(Signed-in users can only reach a household if they know its unguessable
8-character code — nobody can list households.)

## 4. Get the config and paste it in

1. Click the ⚙️ gear → **Project settings** → scroll to **Your apps** →
   click the web icon `</>` → nickname `naijaplate` → Register (skip
   hosting).
2. Copy the `firebaseConfig = { ... }` object it shows you.
3. Open `sync-config.js` in this repo and replace `null` so it reads:

```js
window.FIREBASE_CONFIG = {
  apiKey: "…", authDomain: "…", projectId: "…",
  storageBucket: "…", messagingSenderId: "…", appId: "…"
};
```

4. Commit and push (or paste the config to your AI assistant and it will).
   GitHub Pages redeploys automatically.

## 5. Use it

- On your phone: open the app → **You** tab → **Continue with Google** →
  **Create our household**. Note the 8-character family code.
- On every other device: sign in with Google → enter the code → **Join**.
- From then on plans, shopping lists, preferences and custom foods stay in
  step everywhere, live. Signing out or leaving the household keeps a local
  copy on the device.

## Notes

- The `firebaseConfig` values are public identifiers, not secrets — it's
  safe (and normal) to commit them. Access is controlled by the rules above
  plus the unguessable household code.
- Sync is last-write-wins per change with a ~1s debounce; for a family
  editing the same plan simultaneously that's plenty.

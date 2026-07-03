/* Firebase project config for household sync.
   null = sync disabled (app works fully offline/local as before).
   Follow SYNC-SETUP.md, then replace null with your config object:

   window.FIREBASE_CONFIG = {
     apiKey: "...", authDomain: "...", projectId: "...",
     storageBucket: "...", messagingSenderId: "...", appId: "..."
   };

   Note: this config is PUBLIC by design (it identifies the project,
   it does not grant access) — committing it to the repo is fine.
   Access control happens in Firestore security rules. */
window.FIREBASE_CONFIG = null;

function getAmaraFirebaseSetup() {
  const firebaseSetup = window.AMARA_FIREBASE_CONFIG;

  if (!firebaseSetup || !firebaseSetup.enabled || !window.firebase) {
    throw new Error("Firebase is not enabled. Update public/firebase-config.js first.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseSetup.config);
  }

  return firebaseSetup;
}

function getAmaraAuth() {
  getAmaraFirebaseSetup();

  if (!firebase.auth) {
    throw new Error("Firebase Auth is not loaded. Check the Firebase scripts on this page.");
  }

  return firebase.auth();
}

function getAmaraAdminEmails() {
  const firebaseSetup = getAmaraFirebaseSetup();

  return (firebaseSetup.adminEmails || [])
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
}

function isAmaraAdmin(user) {
  if (!user || !user.email) {
    return false;
  }

  return getAmaraAdminEmails().includes(user.email.toLowerCase());
}

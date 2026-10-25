import admin from 'firebase-admin';
import env from './env.js';
import logger from '../utils/logger.js';

let messaging = null;

export const isFirebaseConfigured = Boolean(
  env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
);

export function initFirebase() {
  if (!isFirebaseConfigured || messaging) return messaging;
  try {
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
    messaging = admin.messaging(app);
    logger.info('Firebase Admin initialised (FCM enabled)');
  } catch (err) {
    logger.error(`Firebase initialisation failed: ${err.message}`);
    messaging = null;
  }
  return messaging;
}

export function getMessaging() {
  return messaging || initFirebase();
}

export default getMessaging;

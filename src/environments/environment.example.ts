// Example environment configuration
// Copy this file to environment.ts and environment.prod.ts
// Add your actual API keys and never commit the real environment files

export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID'
  },
  geminiApiKey: 'YOUR_GEMINI_API_KEY'
};

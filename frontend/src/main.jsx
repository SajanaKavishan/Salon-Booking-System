import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {GoogleOAuthProvider} from '@react-oauth/google';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { installUnauthorizedInterceptor } from './utils/auth';
import { storage } from './utils/storage';

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleOAuthConfigured = Boolean(googleClientId);

if (!isGoogleOAuthConfigured && import.meta.env.PROD) {
  console.error('CRITICAL: Missing VITE_GOOGLE_CLIENT_ID. Google OAuth login has been disabled.');
} else if (!isGoogleOAuthConfigured && import.meta.env.DEV) {
  console.warn('Missing VITE_GOOGLE_CLIENT_ID. Google OAuth login will be unavailable until it is configured.');
}

const getStoredTheme = () => {
  try {
    return storage.get('theme');
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to read theme from localStorage. Falling back to system theme.', error);
    }

    return null;
  }
};

installUnauthorizedInterceptor();

const savedTheme = getStoredTheme();
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  document.documentElement.classList.toggle('dark', prefersDark);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isGoogleOAuthConfigured ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {GoogleOAuthProvider} from '@react-oauth/google';
import { installUnauthorizedInterceptor } from './utils/auth';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!googleClientId && import.meta.env.DEV) {
  console.warn('Missing VITE_GOOGLE_CLIENT_ID. Google OAuth login will be unavailable until it is configured.');
}

const getStoredTheme = () => {
  try {
    return window.localStorage.getItem('theme');
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
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)

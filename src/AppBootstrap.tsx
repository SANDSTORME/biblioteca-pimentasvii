import React, { useEffect, useState } from 'react';
import App from './App';
import SplashScreen from './components/shared/SplashScreen';

const SPLASH_DURATION_MS = 1650;
const SPLASH_EXIT_MS = 420;

const isAutomationMode = () =>
  typeof document !== 'undefined' &&
  (document.documentElement.dataset.automation === 'true' ||
    (typeof navigator !== 'undefined' && navigator.webdriver));

const removeBootSplash = () => {
  const bootSplash = document.getElementById('boot-splash');
  if (bootSplash) {
    bootSplash.remove();
  }

  document.body.classList.remove('splash-active');
};

// Controla a exibição única da abertura visual antes da aplicação ficar interativa.
const AppBootstrap: React.FC = () => {
  const [showSplash, setShowSplash] = useState(() => !isAutomationMode());
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isAutomationMode()) {
      removeBootSplash();
      setShowSplash(false);
      setIsExiting(false);
      return;
    }

    const startExitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, SPLASH_DURATION_MS);

    const hideSplashTimer = window.setTimeout(() => {
      setShowSplash(false);
      removeBootSplash();
    }, SPLASH_DURATION_MS + SPLASH_EXIT_MS);

    return () => {
      window.clearTimeout(startExitTimer);
      window.clearTimeout(hideSplashTimer);
    };
  }, []);

  return (
    <>
      <App />
      <SplashScreen visible={showSplash} exiting={isExiting} />
    </>
  );
};

export default AppBootstrap;

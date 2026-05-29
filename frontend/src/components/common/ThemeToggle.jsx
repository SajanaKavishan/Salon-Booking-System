import React, { useEffect, useState } from 'react';

function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // When the component mounts or when isDarkMode changes, update the HTML class and localStorage with the current theme. This ensures that the theme is applied immediately and persists across page reloads.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // This effect listens for a custom 'themeChange' event, which allows other components to synchronize their theme state when the theme is toggled. When the event is triggered, it checks the current theme in localStorage and updates the isDarkMode state accordingly. This way, if the theme is changed in one component, all components that listen for this event will update their theme state to match.
  useEffect(() => {
    const syncTheme = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', syncTheme);
    
    // Clean up the event listener when the component unmounts to prevent memory leaks and unintended behavior.
    return () => window.removeEventListener('themeChange', syncTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    // After toggling the theme, we dispatch a custom 'themeChange' event to notify other components that the theme has changed. This allows for synchronization of the theme state across different components that may also be listening for this event, ensuring a consistent user experience throughout the app when the theme is toggled.
    window.dispatchEvent(new Event('themeChange'));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`relative flex items-center w-[130px] h-9 rounded-full p-1 transition-colors duration-500 focus:outline-none shadow-inner ${
        isDarkMode ? 'bg-black border border-slate-800' : 'bg-gray-200 border border-gray-300'
      }`}
    >
      <span
        className={`absolute text-[10px] font-extrabold tracking-wider transition-opacity duration-300 w-full text-center ${
          isDarkMode ? 'pr-8 text-white' : 'pl-8 text-black'
        }`}
      >
        {isDarkMode ? 'NIGHT MODE' : 'DAY MODE'}
      </span>
      <div
        className={`absolute flex items-center justify-center w-7 h-7 bg-white rounded-full shadow-md transform transition-transform duration-500 ease-in-out z-10 ${
          isDarkMode ? 'translate-x-[94px]' : 'translate-x-0'
        }`}
      >
        {isDarkMode ? (
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        )}
      </div>
    </button>
  );
}

export default ThemeToggle;
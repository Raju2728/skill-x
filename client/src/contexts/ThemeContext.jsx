import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('skillx_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    // Default to 'light' per user preference
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skillx_theme', theme);

    // Dynamically update favicon and icons to match theme
    const iconUrl = theme === 'dark' ? '/Skill_X_Dark.png' : '/Skill_X_Light.png';
    const favicons = document.querySelectorAll("link[rel*='icon']");
    favicons.forEach(fav => {
      fav.href = iconUrl;
    });
    const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (appleTouchIcon) {
      appleTouchIcon.href = iconUrl;
    }
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0c0e14' : '#ffffff');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

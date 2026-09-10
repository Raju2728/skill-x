import { useTheme } from '../../contexts/ThemeContext';
import './Logo.css';

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
  imgClassName = '',
  textClassName = '',
}) {
  let theme = 'light';
  try {
    const themeCtx = useTheme();
    if (themeCtx?.theme) theme = themeCtx.theme;
  } catch (e) {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme === 'dark' || docTheme === 'light') theme = docTheme;
    }
  }

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/Skill_X_Dark.png' : '/Skill_X_Light.png';

  return (
    <div className={`skillx-logo-wrapper skillx-logo-${size} ${isDark ? 'skillx-logo-dark-theme' : 'skillx-logo-light-theme'} ${className}`}>
      <img
        src={logoSrc}
        alt="Skill X Logo"
        className={`skillx-logo-img ${isDark ? 'skillx-logo-dark' : 'skillx-logo-light'} ${imgClassName}`}
        loading="eager"
      />
      {showText && (
        <span className={`skillx-logo-text ${textClassName}`}>Skill X</span>
      )}
    </div>
  );
}

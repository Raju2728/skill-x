import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle({ className = '', compact = false }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${compact ? 'is-compact' : ''} ${className}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-icon icon-sun">
          <Sun size={13} />
        </span>
        <span className="theme-toggle-icon icon-moon">
          <Moon size={13} />
        </span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}

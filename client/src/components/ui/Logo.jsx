import './Logo.css';

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
  imgClassName = '',
  textClassName = '',
}) {
  return (
    <div className={`skillx-logo-wrapper skillx-logo-${size} ${className}`}>
      <img
        src="/Skill_X%20Logo.png"
        alt="Skill X Logo"
        className={`skillx-logo-img ${imgClassName}`}
        loading="eager"
      />
      {showText && (
        <span className={`skillx-logo-text ${textClassName}`}>Skill X</span>
      )}
    </div>
  );
}

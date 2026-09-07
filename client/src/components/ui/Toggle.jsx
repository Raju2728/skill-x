import './Toggle.css';

export default function Toggle({ checked, onChange, label, disabled = false, size = 'md', id }) {
  return (
    <label className={`toggle-wrapper ${disabled ? 'toggle-disabled' : ''}`} htmlFor={id}>
      <div className={`toggle toggle-${size} ${checked ? 'toggle-checked' : ''}`}>
        <input
          id={id}
          type="checkbox"
          className="toggle-input"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-slider" />
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}

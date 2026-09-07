import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import './Select.css';

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  multiple = false,
  error,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = multiple
    ? options.filter(opt => (value || []).includes(opt.value))
    : options.find(opt => opt.value === value);

  const displayValue = multiple
    ? selectedOption.map(o => o.label).join(', ') || placeholder
    : selectedOption?.label || placeholder;

  const handleSelect = (optValue) => {
    if (multiple) {
      const current = value || [];
      const next = current.includes(optValue)
        ? current.filter(v => v !== optValue)
        : [...current, optValue];
      onChange(next);
    } else {
      onChange(optValue);
      setIsOpen(false);
    }
    setSearch('');
  };

  const isSelected = (optValue) =>
    multiple ? (value || []).includes(optValue) : value === optValue;

  return (
    <div className={`select-group ${error ? 'select-error' : ''} ${className}`} ref={ref}>
      {label && <label className="select-label">{label}</label>}
      <button
        type="button"
        className={`select-trigger ${isOpen ? 'select-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`select-value ${!selectedOption || (multiple && !selectedOption.length) ? 'select-placeholder' : ''}`}>
          {displayValue}
        </span>
        <ChevronDown size={16} className={`select-chevron ${isOpen ? 'select-chevron-open' : ''}`} />
      </button>
      {isOpen && (
        <div className="select-dropdown animate-scale-in">
          {searchable && (
            <div className="select-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="select-options">
            {filtered.length === 0 ? (
              <div className="select-empty">No options found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`select-option ${isSelected(opt.value) ? 'select-option-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected(opt.value) && <Check size={14} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <span className="select-error-text">{error}</span>}
    </div>
  );
}

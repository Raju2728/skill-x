import { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export default function Dropdown({ trigger, children, align = 'left', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className={`dropdown-menu dropdown-${align} animate-scale-in`}>
          {typeof children === 'function' ? children(() => setIsOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, icon: Icon, danger, onClick, ...props }) {
  return (
    <button
      className={`dropdown-item ${danger ? 'dropdown-item-danger' : ''}`}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="dropdown-divider" />;
}

import { useState, useEffect } from 'react';
import './Avatar.css';

const gradients = [
  'linear-gradient(135deg, #4f6ef7 0%, #2563eb 100%)', // Vibrant Blue
  'linear-gradient(135deg, #7c5cbf 0%, #9333ea 100%)', // Royal Purple
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // Golden Amber
  'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', // Crimson Rose
  'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', // Cyan Ocean
  'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', // Deep Indigo
  'linear-gradient(135deg, #c026d3 0%, #db2777 100%)', // Fuchsia Pink
];

export default function Avatar({
  src,
  name = '',
  size = 'md',
  online,
  className = '',
}) {
  const [imageError, setImageError] = useState(false);

  // Reset error when src prop updates
  useEffect(() => {
    setImageError(false);
  }, [src]);

  // Clean and normalize src
  const trimmedSrc = typeof src === 'string' ? src.trim() : '';
  const validSrc = trimmedSrc.length > 0 && trimmedSrc !== 'null' && trimmedSrc !== 'undefined' ? trimmedSrc : null;

  const normalizedSrc = validSrc
    ? validSrc.startsWith('http://') || validSrc.startsWith('https://') || validSrc.startsWith('data:') || validSrc.startsWith('blob:')
      ? validSrc
      : validSrc.startsWith('/')
        ? validSrc
        : `/${validSrc}`
    : null;

  const showImage = Boolean(normalizedSrc && !imageError);

  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || (name ? name.slice(0, 2).toUpperCase() : '?');

  const charCodeSum = (name || 'user').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = gradients[charCodeSum % gradients.length];

  return (
    <div className={`avatar-container avatar-${size} ${className}`} aria-label={name}>
      <div className="avatar-circle">
        {showImage ? (
          <img
            src={normalizedSrc}
            alt={name || 'Avatar'}
            className="avatar-img"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="avatar-initials" style={{ background: gradient }}>
            <span>{initials}</span>
          </div>
        )}
      </div>

      {online !== undefined && (
        <span
          className={`avatar-status-badge ${online ? 'is-online' : 'is-offline'}`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}


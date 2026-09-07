import './Avatar.css';

export default function Avatar({
  src,
  name = '',
  size = 'md',
  online,
  className = '',
}) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    '#4f6ef7', '#7c5cbf', '#34c759', '#f5a623',
    '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899',
  ];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="avatar-img" />
      ) : (
        <div className="avatar-initials" style={{ backgroundColor: colors[colorIndex] }}>
          {initials || '?'}
        </div>
      )}
      {online !== undefined && (
        <span className={`avatar-status ${online ? 'avatar-online' : 'avatar-offline'}`} />
      )}
    </div>
  );
}

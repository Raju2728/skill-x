import './Skeleton.css';

export default function Skeleton({ width, height, radius = 'md', className = '' }) {
  return (
    <div
      className={`skeleton skeleton-r-${radius} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-r-sm"
          style={{ width: i === lines - 1 ? '60%' : '100%', height: '14px' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton width="100%" height="160px" radius="lg" />
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Skeleton width="70%" height="20px" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

import './Spinner.css';

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div className={`spinner spinner-${size} ${className}`} role="status" aria-label="Loading">
      <svg viewBox="0 0 24 24" fill="none" className="spinner-svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          className="spinner-track" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="28" strokeDashoffset="28" className="spinner-head" />
      </svg>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner size="lg" />
    </div>
  );
}

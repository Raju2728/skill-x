import './Spinner.css';

/**
 * Skill X Signature Spinner
 * Inline lightweight dual-orbital loader
 */
export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div className={`skillx-spinner skillx-spinner-${size} ${className}`} role="status" aria-label="Loading">
      <div className="skillx-spinner-orbit-outer" />
      <div className="skillx-spinner-orbit-inner" />
      <div className="skillx-spinner-core-x">
        <span className="x-line x-line-1" />
        <span className="x-line x-line-2" />
      </div>
    </div>
  );
}

/**
 * Skill X Signature Full-Page Orbital Loader
 * Futuristic concentric orbits + luminous central 'X' emblem
 */
export function PageLoader({ text = 'Connecting Learning Nodes...' }) {
  return (
    <div className="skillx-page-loader animate-fade-in" role="status" aria-label="Loading page">
      <div className="skillx-loader-container">
        {/* Luminous Glow Halo */}
        <div className="skillx-loader-halo" />

        {/* Outer Orbital Ring */}
        <div className="skillx-orbital-ring ring-outer">
          <span className="orbital-node node-1" />
          <span className="orbital-node node-2" />
        </div>

        {/* Inner Counter-Orbital Ring */}
        <div className="skillx-orbital-ring ring-inner">
          <span className="orbital-node node-3" />
        </div>

        {/* Central Luminous 'X' Emblem */}
        <div className="skillx-central-x">
          <svg viewBox="0 0 48 48" className="skillx-x-svg" fill="none">
            <defs>
              <linearGradient id="loaderGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f6ef7" />
                <stop offset="100%" stopColor="#7c5cbf" />
              </linearGradient>
              <linearGradient id="loaderGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff6b35" />
                <stop offset="100%" stopColor="#4f6ef7" />
              </linearGradient>
            </defs>
            <path
              d="M12 12L36 36"
              stroke="url(#loaderGrad1)"
              strokeWidth="5.5"
              strokeLinecap="round"
              className="x-path x-path-1"
            />
            <path
              d="M36 12L12 36"
              stroke="url(#loaderGrad2)"
              strokeWidth="5.5"
              strokeLinecap="round"
              className="x-path x-path-2"
            />
          </svg>
        </div>
      </div>

      {/* Typography with letter-spacing pulse */}
      <div className="skillx-loader-text-wrap">
        <span className="skillx-loader-status">{text}</span>
      </div>
    </div>
  );
}

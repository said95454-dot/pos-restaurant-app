import React from 'react';

/**
 * Futuristic flame logo — SVG with copper→orange→cyan gradient and animated core.
 * Used as the app hero mark on the Login/Register pages.
 */
const FuturisticFlame = ({ size = 44, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`futuristic-flame ${className}`}
    aria-hidden="true"
    data-testid="futuristic-flame-logo"
  >
    <defs>
      {/* Outer flame gradient: cobre → naranja → amber → cyan tip */}
      <linearGradient id="flame-outer" x1="0.5" y1="1" x2="0.5" y2="0">
        <stop offset="0%"   stopColor="#C08A5C" />
        <stop offset="35%"  stopColor="#FF6A2C" />
        <stop offset="70%"  stopColor="#FFB84D" />
        <stop offset="100%" stopColor="#00E5FF" />
      </linearGradient>
      {/* Inner core: caliente blanco→cyan */}
      <linearGradient id="flame-core" x1="0.5" y1="1" x2="0.5" y2="0">
        <stop offset="0%"   stopColor="#FFFFFF" />
        <stop offset="55%"  stopColor="#B7F9FF" />
        <stop offset="100%" stopColor="#00E5FF" />
      </linearGradient>
      <radialGradient id="flame-glow" cx="0.5" cy="0.55" r="0.65">
        <stop offset="0%"  stopColor="#FF6A2C" stopOpacity="0.55" />
        <stop offset="60%" stopColor="#FF6A2C" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#FF6A2C" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Soft glow disk behind */}
    <circle cx="32" cy="44" r="30" fill="url(#flame-glow)" className="flame-glow-disk" />

    {/* Outer flame silhouette */}
    <path
      d="M32 4
         C 40 18, 52 22, 50 38
         C 49 46, 42 48, 42 56
         C 42 62, 47 66, 47 72
         C 47 78, 40 80, 32 80
         C 24 80, 17 78, 17 72
         C 17 66, 22 62, 22 56
         C 22 48, 15 46, 14 38
         C 12 22, 24 18, 32 4 Z"
      fill="url(#flame-outer)"
      className="flame-outer"
    />

    {/* Inner hotter core */}
    <path
      d="M32 22
         C 36 30, 42 34, 40 44
         C 39 50, 35 52, 35 58
         C 35 63, 38 66, 38 70
         C 38 74, 35 76, 32 76
         C 29 76, 26 74, 26 70
         C 26 66, 29 63, 29 58
         C 29 52, 25 50, 24 44
         C 22 34, 28 30, 32 22 Z"
      fill="url(#flame-core)"
      className="flame-core"
      opacity="0.95"
    />

    {/* Tiny spark points */}
    <circle cx="52" cy="14" r="1.2" fill="#00E5FF" className="flame-spark spark-1" />
    <circle cx="12" cy="20" r="1"   fill="#FFB84D" className="flame-spark spark-2" />
    <circle cx="54" cy="34" r="1.5" fill="#FF6A2C" className="flame-spark spark-3" />
  </svg>
);

export default FuturisticFlame;

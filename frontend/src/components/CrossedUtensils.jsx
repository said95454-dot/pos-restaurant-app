import React from 'react';

/**
 * Crossed knife + fork in neon copper/cyan, with pulsing ring.
 * "Chef digital" vibe — professional restaurant identity.
 */
const CrossedUtensils = ({ size = 44, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="4 2 64 68"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`crossed-utensils ${className}`}
    aria-hidden="true"
    data-testid="crossed-utensils-logo"
  >
    <defs>
      <linearGradient id="cu-knife" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#00E5FF" />
        <stop offset="100%" stopColor="#7EEFFF" />
      </linearGradient>
      <linearGradient id="cu-fork" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#E8A76A" />
        <stop offset="100%" stopColor="#C08A5C" />
      </linearGradient>
      <radialGradient id="cu-glow" cx="0.5" cy="0.5" r="0.55">
        <stop offset="0%"  stopColor="#00E5FF" stopOpacity="0.35" />
        <stop offset="55%" stopColor="#C08A5C" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#C08A5C" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Ambient glow */}
    <circle cx="36" cy="36" r="30" fill="url(#cu-glow)" className="cu-halo" />

    {/* Fork — orange copper, tilted to the left */}
    <g transform="rotate(-30 36 36)" className="cu-item cu-item-fork">
      {/* tines */}
      <path d="M27 10 L27 22 M31.5 10 L31.5 22 M36 10 L36 22 M40.5 10 L40.5 22 M45 10 L45 22"
            stroke="url(#cu-fork)" strokeWidth="2.4" strokeLinecap="round" />
      {/* neck plate */}
      <path d="M27 22 Q36 26 45 22 L44 30 Q36 33 28 30 Z"
            fill="url(#cu-fork)" opacity="0.85" />
      {/* handle */}
      <rect x="34.6" y="30" width="2.8" height="30" rx="1.4" fill="url(#cu-fork)" />
      {/* handle tip */}
      <circle cx="36" cy="62" r="1.6" fill="url(#cu-fork)" />
    </g>

    {/* Knife — cyan neon, tilted to the right */}
    <g transform="rotate(30 36 36)" className="cu-item cu-item-knife">
      {/* blade */}
      <path d="M34 8
               L38 8
               L40 34
               L36 38
               L32 34 Z"
            fill="url(#cu-knife)" />
      {/* blade tip highlight */}
      <path d="M36 8 L36 38"
            stroke="#EAFDFF" strokeWidth="0.6" strokeOpacity="0.65" strokeLinecap="round" />
      {/* handle */}
      <rect x="34.6" y="38" width="2.8" height="22" rx="1.4" fill="url(#cu-knife)" opacity="0.85" />
      {/* rivets */}
      <circle cx="36" cy="44" r="0.9" fill="#00171C" />
      <circle cx="36" cy="52" r="0.9" fill="#00171C" />
    </g>
  </svg>
);

export default CrossedUtensils;

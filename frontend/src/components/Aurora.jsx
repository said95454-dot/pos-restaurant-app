import React from 'react';

/**
 * Futuristic cyber background:
 * - Deep space gradient
 * - Perspective grid floor (Tron-style)
 * - Neon horizon line
 * - Floating orbs (warm + cool)
 * - Drifting particles + twinkling stars
 * - Subtle scanlines + vignette
 */
export const Aurora = ({ className = '', variant = 'full' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <div className="cyber-bg" />
    {variant === 'full' && <div className="cyber-grid" />}
    {variant === 'full' && <div className="cyber-horizon" />}
    <div className="cyber-orb" />
    <div className="cyber-orb-2" />
    <div className="cyber-particles" />
    <div className="cyber-twinkle" />
    <div className="scanlines" />
    <div className="cyber-vignette" />
    <div className="grain" />
  </div>
);

export default Aurora;

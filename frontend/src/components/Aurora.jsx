import React from 'react';

/**
 * "Deli Futurista Premium" background — v2.9
 * Layers (back → front):
 *  1. Deep carbon base (#0A0A0D)
 *  2. Slow-moving copper + cyan orbs (very subtle)
 *  3. Fine dot grid (fintech-tech vibe)
 *  4. Corner watermark glyphs (fork, knife, glass) as line-art
 *  5. Scanner line that sweeps every 15s
 *  6. Radial copper glow from top-center (warmth)
 *  7. Vignette + film grain (Apple/Rolls Royce premium feel)
 */
export const Aurora = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} data-testid="aurora-premium">
    {/* Base carbon */}
    <div className="deli-base" />

    {/* Radial copper warmth from top-center */}
    <div className="deli-warmth" />

    {/* Subtle dot grid (fintech tech texture) */}
    <div className="deli-grid" />

    {/* Slow copper + cyan orbs */}
    <div className="deli-orb deli-orb-copper" />
    <div className="deli-orb deli-orb-cyan" />

    {/* Watermark gastronomy line-art glyphs (very tenuous) */}
    <svg className="deli-glyph deli-glyph-tl" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {/* Chef's knife */}
      <path d="M20 150 L80 90 L170 45 L180 55 L95 105 L35 165 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M25 155 L45 175" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>

    <svg className="deli-glyph deli-glyph-br" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {/* Wine glass */}
      <path d="M60 30 L140 30 L130 90 Q100 120 70 90 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M100 120 L100 170" stroke="currentColor" strokeWidth="1.2" />
      <path d="M70 170 L130 170" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>

    <svg className="deli-glyph deli-glyph-tr" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {/* Fork */}
      <path d="M85 20 L85 65 M100 20 L100 65 M115 20 L115 65" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M75 65 L125 65 L120 90 L80 90 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M100 90 L100 180" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>

    <svg className="deli-glyph deli-glyph-bl" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {/* Serving dome/cloche */}
      <path d="M35 140 Q100 40 165 140" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M25 145 L175 145" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="100" cy="55" r="4" stroke="currentColor" strokeWidth="1.2" />
    </svg>

    {/* Slow horizontal scanner */}
    <div className="deli-scanner" />

    {/* Vignette to focus attention */}
    <div className="deli-vignette" />

    {/* Fine grain (film texture) */}
    <div className="grain" />
  </div>
);

export default Aurora;

import React from 'react';
import {
  UtensilsCrossed, ChefHat, Coffee, Pizza, Wine, Soup, Sandwich,
  Cookie, IceCream, Croissant, CupSoda, CakeSlice, Salad, Beef, Fish,
  Beer, Martini, Hamburger,
} from 'lucide-react';

/**
 * FUTURISTIC RESTAURANT BACKGROUND
 * Neon food icons floating like in a cybernetic kitchen, warm ambient
 * glow like a high-end restaurant at night, ember particles rising.
 */
const FLOATING_ICONS = [
  { Icon: ChefHat,         top: '6%',   left: '4%',   size: 78, tone: 'warm',  delay: '0s' },
  { Icon: UtensilsCrossed, top: '20%',  right: '6%',  size: 90, tone: 'red',   delay: '-4s' },
  { Icon: Pizza,           top: '68%',  right: '4%',  size: 110, tone: 'red',  delay: '-8s' },
  { Icon: Wine,            top: '28%',  left: '8%',   size: 86, tone: 'cool',  delay: '-5s' },
  { Icon: Soup,            bottom: '8%',  left: '6%',  size: 78, tone: 'warm', delay: '-1s' },
  { Icon: Coffee,          top: '50%',  right: '26%', size: 66, tone: 'warm',  delay: '-2s' },
  { Icon: Sandwich,        top: '55%',  left: '24%',  size: 72, tone: 'warm',  delay: '-6s' },
  { Icon: IceCream,        top: '15%',  left: '48%',  size: 64, tone: 'cool',  delay: '-7s' },
  { Icon: Croissant,       bottom: '32%', left: '52%', size: 70, tone: 'warm', delay: '-9s' },
  { Icon: CakeSlice,       top: '38%',  left: '68%',  size: 68, tone: 'red',   delay: '-6s' },
  { Icon: Salad,           bottom: '22%', left: '36%', size: 72, tone: 'cool', delay: '-2s' },
  { Icon: Beef,            bottom: '45%', right: '42%', size: 68, tone: 'red', delay: '-5s' },
  { Icon: Fish,            top: '12%',  right: '38%', size: 64, tone: 'cool',  delay: '-8s' },
  { Icon: Cookie,          bottom: '6%',  right: '32%', size: 58, tone: 'warm', delay: '-3s' },
  { Icon: CupSoda,         top: '78%',  left: '72%',  size: 60, tone: 'cool',  delay: '-4s' },
  { Icon: Beer,            top: '40%',  left: '38%',  size: 70, tone: 'warm',  delay: '-3.5s' },
  { Icon: Martini,         bottom: '15%', right: '18%', size: 68, tone: 'cool', delay: '-6.5s' },
  { Icon: Hamburger,       top: '82%',  left: '18%',  size: 74, tone: 'warm',  delay: '-1.5s' },
];

export const Aurora = ({ className = '' }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
    <div className="resto-bg" />
    <div className="resto-tiles" />

    {/* Floating neon food icons — the restaurant identity */}
    {FLOATING_ICONS.map(({ Icon, tone, size, delay, ...pos }, i) => (
      <div
        key={i}
        className={`resto-icon-float ${tone}`}
        style={{ ...pos, animationDelay: delay }}
      >
        <Icon size={size} strokeWidth={1.3} />
      </div>
    ))}

    <div className="resto-orb-amber" />
    <div className="resto-orb-cool" />
    <div className="resto-flame" />
    <div className="resto-steam" />
    <div className="resto-vignette" />
    <div className="grain" />
  </div>
);

export default Aurora;

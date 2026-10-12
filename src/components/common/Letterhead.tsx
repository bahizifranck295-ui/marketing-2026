import React from 'react';
import { LETTERHEAD_TEXT } from '../../utils/letterhead';
import { LETTERHEAD_LOGO } from '../../assets/letterheadLogo';

// En-tête officiel PREMIDIS SARL pour les documents affichés à l'écran.
// Même géométrie que l'en-tête des PDF (maquette 1080 × 360 px).
export const Letterhead: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="28 90 1024 190"
    className={`w-full h-auto ${className}`}
    role="img"
    aria-label={`${LETTERHEAD_TEXT.title} – ${LETTERHEAD_TEXT.commune}`}
  >
    <rect x="28" y="90" width="1024" height="190" fill="#ffffff" />
    <image href={LETTERHEAD_LOGO} x="109" y="90" width="98" height="80" />
    <image href={LETTERHEAD_LOGO} x="873" y="90" width="98" height="80" />
    <text
      x="542" y="160" textAnchor="middle" textLength="628" lengthAdjust="spacingAndGlyphs"
      fill="#1028BE" fontFamily="'Times New Roman', Times, serif" fontWeight="bold" fontSize="92"
    >
      {LETTERHEAD_TEXT.title}
    </text>
    <rect x="28" y="174" width="1024" height="106" fill="#013AC6" />
    <text
      x="543" y="203" textAnchor="middle" textLength="592" lengthAdjust="spacingAndGlyphs"
      fill="#ffffff" fontFamily="'Times New Roman', Times, serif" fontWeight="bold" fontSize="27"
    >
      {LETTERHEAD_TEXT.commune}
    </text>
    <rect x="138" y="212" width="803" height="10" rx="5" fill="#6AE8FF" />
    <text
      x="540" y="248" textAnchor="middle" textLength="762" lengthAdjust="spacingAndGlyphs"
      fill="#ffffff" fontFamily="Helvetica, Arial, sans-serif" fontSize="17"
    >
      {LETTERHEAD_TEXT.address}
    </text>
    <text
      x="539" y="269" textAnchor="middle" textLength="390" lengthAdjust="spacingAndGlyphs"
      fill="#ffffff" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" xmlSpace="preserve"
    >
      {LETTERHEAD_TEXT.rccm}
    </text>
  </svg>
);

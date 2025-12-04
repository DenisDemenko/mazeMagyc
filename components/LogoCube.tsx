
import React from 'react';

export const LogoCube: React.FC = () => {
  return (
    <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="gradRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#db2777" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="gradTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5f5f5" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e5e5e5" stopOpacity="0.95" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter="url(#glow)">
        {/* LEFT FACE */}
        <path d="M100 230 L6 176 L6 68 L100 122 Z" fill="url(#gradLeft)" stroke="#fff" strokeWidth="2" />
        {/* Maze Lines Left */}
        <path d="M6 80 L50 105 M6 100 L30 114 M50 130 L80 113" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" />
        <path d="M30 150 L70 173 L70 140" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" />

        {/* RIGHT FACE */}
        <path d="M100 230 L194 176 L194 68 L100 122 Z" fill="url(#gradRight)" stroke="#fff" strokeWidth="2" />
        {/* Maze Lines Right */}
        <path d="M194 80 L150 105 M194 120 L160 140 L160 170" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" />
        <path d="M130 110 L130 140 L100 157" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" />

        {/* TOP FACE */}
        <path d="M6 68 L100 14 L194 68 L100 122 Z" fill="url(#gradTop)" stroke="#fff" strokeWidth="2" />
        
        {/* LABEL ON TOP */}
        <g transform="translate(100, 68)">
             {/* Transform to match isometric plane */}
             <text 
                x="0" y="-5" 
                textAnchor="middle" 
                fontSize="18" 
                fontWeight="bold" 
                fontFamily="Impact, sans-serif" 
                fill="#1c1917"
                transform="scale(1, 0.58)"
             >
                AMAZING
             </text>
             <text 
                x="0" y="15" 
                textAnchor="middle" 
                fontSize="18" 
                fontWeight="bold" 
                fontFamily="Impact, sans-serif" 
                fill="#1c1917"
                transform="scale(1, 0.58)"
             >
                MAZES
             </text>
        </g>
      </g>
      
      {/* Shine/Highlight */}
      <path d="M6 68 L100 122 L100 230 L6 176 Z" fill="url(#gradLeft)" opacity="0.1" style={{mixBlendMode: 'overlay'}} />
    </svg>
  );
};

import React from 'react';

export interface VerdectLogoProps {
  variant?: 'full' | 'horizontal' | 'icon' | 'crest';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showTagline?: boolean;
  useImage?: boolean;
  lightText?: boolean;
}

export const VerdectLogo: React.FC<VerdectLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
  useImage = false,
  lightText = false
}) => {
  // If user requests direct image rendering of the official logo artwork
  if (useImage) {
    const imgSizeMap = {
      xs: 'h-8',
      sm: 'h-10',
      md: 'h-14',
      lg: 'h-24',
      xl: 'h-36',
      hero: 'h-52'
    };

    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <img
          src="/verdect-logo.jpg"
          alt="VERDECT - Analyze • Verify • Decide"
          className={`${imgSizeMap[size]} object-contain drop-shadow-md rounded-lg`}
        />
      </div>
    );
  }

  // Vector Icon Crest
  const iconSizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    hero: 'w-36 h-36'
  };

  const textSizeMap = {
    xs: { title: 'text-sm font-black', tagline: 'text-[8px] font-semibold' },
    sm: { title: 'text-base font-black', tagline: 'text-[9px] font-semibold' },
    md: { title: 'text-xl font-black', tagline: 'text-[10px] font-bold' },
    lg: { title: 'text-3xl font-black', tagline: 'text-xs font-bold' },
    xl: { title: 'text-4xl font-black', tagline: 'text-sm font-bold' },
    hero: { title: 'text-5xl font-black', tagline: 'text-base font-extrabold' }
  };

  const ShieldIcon = (
    <div className={`relative flex items-center justify-center shrink-0 ${iconSizeMap[size]}`}>
      <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <defs>
          <linearGradient id="vLogoNavy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B1E36" />
            <stop offset="100%" stopColor="#05101E" />
          </linearGradient>
          <linearGradient id="vLogoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="60%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="vLogoShieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A2540" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>

        {/* Outer Shield with gradient border */}
        <path
          d="M100 12 L176 44 C176 130 148 180 100 208 C52 180 24 130 24 44 Z"
          stroke="url(#vLogoShieldBorder)"
          strokeWidth="8"
          strokeLinejoin="round"
          fill="url(#vLogoNavy)"
          className="transition-all"
        />

        {/* Shield Right Half subtle highlight */}
        <path d="M100 16 L170 46 C170 126 144 174 100 202 Z" fill="#0284C7" opacity="0.12" />

        {/* Left Side: Scales of Justice (Navy / Silver) */}
        <g stroke="#93C5FD" strokeWidth="4.5" strokeLinecap="round" opacity="0.95">
          {/* Pillar */}
          <line x1="100" y1="36" x2="100" y2="120" stroke="#E2E8F0" strokeWidth="5" />
          <circle cx="100" cy="28" r="4" fill="#38BDF8" />

          {/* Scale Crossbar Beam */}
          <path d="M50 64 C70 52 90 48 100 48 C110 48 130 52 150 64" stroke="#E2E8F0" strokeWidth="5" fill="none" />

          {/* Left Pan Chains & Pan */}
          <line x1="50" y1="64" x2="34" y2="96" stroke="#93C5FD" strokeWidth="2.5" />
          <line x1="50" y1="64" x2="66" y2="96" stroke="#93C5FD" strokeWidth="2.5" />
          <path d="M30 96 C30 110 70 110 70 96 Z" fill="#38BDF8" opacity="0.85" />
        </g>

        {/* Right Side: Cyber Digital Inspection Grid */}
        <g opacity="0.35" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round">
          <line x1="100" y1="72" x2="158" y2="72" />
          <line x1="100" y1="90" x2="166" y2="90" />
          <line x1="100" y1="108" x2="160" y2="108" />
          <line x1="100" y1="126" x2="148" y2="126" />
          <line x1="118" y1="56" x2="118" y2="140" strokeDasharray="2 3" />
          <line x1="138" y1="64" x2="138" y2="134" strokeDasharray="2 3" />
        </g>

        {/* Dynamic Glowing Cyan Checkmark / "V" glyph */}
        <path
          d="M74 104 L96 138 L170 42 C146 76 112 136 96 156 L68 114 Z"
          fill="url(#vLogoCyan)"
          className="drop-shadow-md"
        />

        {/* Tech Speed Horizontal Streamers */}
        <line x1="122" y1="84" x2="174" y2="84" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <line x1="134" y1="100" x2="182" y2="100" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <line x1="120" y1="116" x2="164" y2="116" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  );

  if (variant === 'icon' || variant === 'crest') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{ShieldIcon}</div>;
  }

  const textColor = lightText ? 'text-white' : 'text-slate-900 dark:text-white';
  const taglineColor = lightText ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400';

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <div className="mb-3 transform hover:scale-105 transition-transform duration-300">
          {ShieldIcon}
        </div>
        <h1 className={`${textSizeMap[size].title} ${textColor} tracking-tight leading-none`}>
          VERDECT
        </h1>
        {showTagline && (
          <p className={`${textSizeMap[size].tagline} ${taglineColor} tracking-[0.25em] uppercase mt-1.5 font-bold`}>
            ANALYZE • VERIFY • DECIDE
          </p>
        )}
      </div>
    );
  }

  // Default: Horizontal lockup
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {ShieldIcon}
      <div className="flex flex-col">
        <span className={`${textSizeMap[size].title} ${textColor} tracking-tight leading-none`}>
          VERDECT
        </span>
        {showTagline && (
          <span className={`${textSizeMap[size].tagline} ${taglineColor} tracking-[0.2em] uppercase font-extrabold mt-0.5`}>
            ANALYZE • VERIFY • DECIDE
          </span>
        )}
      </div>
    </div>
  );
};

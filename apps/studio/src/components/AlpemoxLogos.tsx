import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/** Main Alpemox Brand Monogram — original faceted "A" aperture prism */
export function AlpemoxBrandLogo({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="alp-brand-a" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#4E7BFB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="alp-brand-b" x1="22" y1="24" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="#0B0E17" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <path
        d="M32 10L51 50H40.5L36.2 40.5H27.8L23.5 50H13L32 10Z"
        fill="url(#alp-brand-a)"
      />
      <path d="M32 22.5L26.2 35.5H37.8L32 22.5Z" fill="#0B0E17" />
      <path d="M22 44.5L32 31L42 44.5H22Z" fill="url(#alp-brand-b)" fillOpacity="0.9" />
      <circle cx="32" cy="14" r="2.2" fill="#E0F2FE" />
    </svg>
  );
}

/** Alpemox Studio — Flagship Hybrid 2D+3D+AI Icon */
export function AppIconStudio({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-studio-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="55%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="ico-studio-facet" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-studio-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <path d="M16 23L32 14L48 23V41L32 50L16 41V23Z" fill="#0B1120" fillOpacity="0.35" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M32 15L47 45H37.8L34.5 37.5H29.5L26.2 45H17L32 15Z" fill="url(#ico-studio-facet)" />
      <path d="M32 25.5L28.5 34H35.5L32 25.5Z" fill="#1D4ED8" />
      <circle cx="48" cy="17" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}

/** Alpemox Photo — Raster & Pixel Aperture Icon */
export function AppIconPhoto({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-photo-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-photo-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <rect x="13" y="16" width="38" height="32" rx="6" fill="#0B1221" fillOpacity="0.45" stroke="#E0F2FE" strokeWidth="2" />
      <circle cx="32" cy="32" r="9.5" stroke="#FFFFFF" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="4.2" fill="#38BDF8" />
      <circle cx="43.5" cy="22.5" r="2.2" fill="#FDE047" />
    </svg>
  );
}

/** Alpemox Vector — Bezier Nib & Anchor Curve Icon */
export function AppIconVector({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-vec-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="55%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-vec-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <path d="M15 47C18 25 32 17 49 17" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M32 14L44 36L35 45L29 45L20 36L32 14Z" fill="#FFFFFF" />
      <path d="M32 14V31" stroke="#7E22CE" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="32.5" r="2.8" fill="#7E22CE" />
      <rect x="12.5" y="44.5" width="5" height="5" rx="1" fill="#FDE047" stroke="#FFFFFF" strokeWidth="1.2" />
      <rect x="46.5" y="14.5" width="5" height="5" rx="1" fill="#FDE047" stroke="#FFFFFF" strokeWidth="1.2" />
    </svg>
  );
}

/** Alpemox Film — Cinema Frame & Timeline Play Icon */
export function AppIconFilm({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-film-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="55%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-film-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <rect x="12" y="15" width="40" height="26" rx="5" fill="#064E3B" fillOpacity="0.65" stroke="#ECFDF5" strokeWidth="2" />
      <path d="M28 22.5L39 28L28 33.5V22.5Z" fill="#FFFFFF" />
      <rect x="12" y="45.5" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.28)" />
      <rect x="12" y="45.5" width="23" height="5" rx="2.5" fill="#A7F3D0" />
      <circle cx="35" cy="48" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

/** Alpemox 3D Stage — Isometric Mesh & Depth Ring Icon */
export function AppIconStage3D({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-3d-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-3d-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <path d="M32 13L49 22.5V41.5L32 51L15 41.5V22.5L32 13Z" fill="#FFFBEB" fillOpacity="0.22" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M32 13L49 22.5L32 32L15 22.5L32 13Z" fill="#FFFFFF" fillOpacity="0.92" />
      <path d="M32 32V51L49 41.5V22.5L32 32Z" fill="#FEF3C7" fillOpacity="0.55" />
      <path d="M32 32V51" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}

/** Alpemox Nodes & MCP — Node Graph + Agent Link Icon */
export function AppIconNodes({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-nodes-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9F1239" />
          <stop offset="55%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-nodes-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <path d="M20 21C28 21 28 32 36 32M20 43C28 43 28 32 36 32H45" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="21" r="5.5" fill="#FFFFFF" />
      <circle cx="18" cy="43" r="5.5" fill="#FECDD3" />
      <circle cx="45" cy="32" r="6.5" fill="#FFFFFF" stroke="#FDA4AF" strokeWidth="2" />
      <circle cx="45" cy="32" r="2.5" fill="#E11D48" />
    </svg>
  );
}

/** Alpemox Moodboard — Spatial Pinboard & Color Swatches Icon */
export function AppIconMoodboard({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ico-mb-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="55%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ico-mb-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="14.25" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <rect x="13" y="14" width="18" height="22" rx="4" fill="#FFFFFF" fillOpacity="0.92" />
      <rect x="34" y="14" width="17" height="14" rx="4" fill="#FDE047" />
      <rect x="13" y="39" width="18" height="11" rx="3.5" fill="#38BDF8" />
      <rect x="34" y="31" width="17" height="19" rx="4" fill="#FFFFFF" fillOpacity="0.82" />
      <circle cx="22" cy="17" r="2.2" fill="#E11D48" />
      <circle cx="42" cy="17" r="2.2" fill="#7E22CE" />
    </svg>
  );
}

/** Render custom logo component by Suite App ID */
export function AlpemoxAppLogo({ appId, size = 44, className = '' }: { appId: string; size?: number; className?: string }) {
  switch (appId) {
    case 'alpemox-photo':
      return <AppIconPhoto size={size} className={className} />;
    case 'alpemox-vector':
      return <AppIconVector size={size} className={className} />;
    case 'alpemox-film':
      return <AppIconFilm size={size} className={className} />;
    case 'alpemox-stage3d':
      return <AppIconStage3D size={size} className={className} />;
    case 'alpemox-moodboard':
      return <AppIconMoodboard size={size} className={className} />;
    case 'alpemox-nodes':
      return <AppIconNodes size={size} className={className} />;
    case 'alpemox-studio':
    default:
      return <AppIconStudio size={size} className={className} />;
  }
}

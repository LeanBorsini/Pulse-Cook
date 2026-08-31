export function RemyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`inline-block select-none shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Background Badge Gradient */}
        <radialGradient id="remyBadgeGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="65%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#172554" />
        </radialGradient>
        {/* Hat Gradient */}
        <linearGradient id="remyHatGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        {/* Pot Gradient */}
        <linearGradient id="remyPotGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        {/* Spoon Wood Gradient */}
        <linearGradient id="remySpoonGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        {/* Soup Gradient */}
        <linearGradient id="remySoupGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Blue Circular Badge */}
      <circle cx="60" cy="60" r="57" fill="url(#remyBadgeGrad)" stroke="#1E3A8A" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="54" stroke="#60A5FA" strokeWidth="1" opacity="0.4" />

      {/* Small White Base Platform */}
      <ellipse cx="60" cy="98" rx="28" ry="7" fill="#EFF6FF" opacity="0.9" />

      {/* Rat Tail */}
      <path
        d="M68 88 C76 86, 88 80, 88 68 C88 56, 80 54, 78 56"
        stroke="#F472B6"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Rat Body (Grey) */}
      <ellipse cx="58" cy="74" rx="17" ry="18" fill="#94A3B8" />
      <ellipse cx="58" cy="75" rx="12" ry="14" fill="#CBD5E1" />

      {/* Feet */}
      <ellipse cx="50" cy="92" rx="4" ry="2.5" fill="#F472B6" />
      <ellipse cx="66" cy="92" rx="4" ry="2.5" fill="#F472B6" />

      {/* Rat Ears */}
      {/* Left Ear */}
      <circle cx="43" cy="38" r="9.5" fill="#94A3B8" />
      <circle cx="43" cy="38" r="6.5" fill="#F472B6" />
      {/* Right Ear */}
      <circle cx="77" cy="40" r="11" fill="#94A3B8" />
      <circle cx="77" cy="40" r="8" fill="#F472B6" />

      {/* Rat Head */}
      <ellipse cx="59" cy="46" rx="14" ry="12" fill="#94A3B8" />
      {/* Cheeks / Snout */}
      <path d="M52 46 Q47 52 54 55 Q62 57 66 52 Q69 46 59 46 Z" fill="#CBD5E1" />

      {/* Big Cheerful Eyes */}
      <ellipse cx="53" cy="43" rx="2.5" ry="3.5" fill="#1E293B" />
      <circle cx="54" cy="42" r="1.2" fill="#FFFFFF" />
      <ellipse cx="63" cy="43" rx="2.8" ry="3.8" fill="#1E293B" />
      <circle cx="64" cy="42" r="1.3" fill="#FFFFFF" />

      {/* Cute Pink Nose */}
      <ellipse cx="48" cy="48" rx="3" ry="2.5" fill="#FB7185" />
      <ellipse cx="48.5" cy="47.5" rx="1" ry="0.6" fill="#FFE4E6" />

      {/* Happy Smile */}
      <path d="M52 52 Q56 56 62 52" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Whiskers */}
      <path d="M46 51 L38 50 M46 53 L39 55" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M64 51 L71 49 M64 53 L72 54" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />

      {/* Chef Neckerchief (Scarf with food speckles) */}
      <path d="M48 57 C53 60, 65 60, 70 56 C67 63, 52 64, 48 57 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
      {/* Neckerchief Knot */}
      <circle cx="58" cy="60" r="2.5" fill="#F8FAFC" />
      {/* Spots */}
      <circle cx="54" cy="58" r="0.8" fill="#EA580C" />
      <circle cx="63" cy="58" r="0.7" fill="#16A34A" />

      {/* Chef Hat (Toque with red stripes band) */}
      <path
        d="M48 34 C42 27, 45 14, 55 14 C59 10, 68 11, 71 16 C77 15, 80 25, 74 34 Z"
        fill="url(#remyHatGrad)"
        stroke="#E2E8F0"
        strokeWidth="1"
      />
      {/* Hat Folds */}
      <path d="M54 16 Q55 26 56 34" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
      <path d="M64 14 Q63 25 64 34" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
      {/* Hat Band */}
      <rect x="49" y="32" width="24" height="5" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Red Stripes on Band */}
      <line x1="53" y1="32" x2="53" y2="37" stroke="#DC2626" strokeWidth="1.2" />
      <line x1="57" y1="32" x2="57" y2="37" stroke="#DC2626" strokeWidth="1.2" />
      <line x1="61" y1="32" x2="61" y2="37" stroke="#DC2626" strokeWidth="1.2" />
      <line x1="65" y1="32" x2="65" y2="37" stroke="#DC2626" strokeWidth="1.2" />
      <line x1="69" y1="32" x2="69" y2="37" stroke="#DC2626" strokeWidth="1.2" />

      {/* Left Arm & Wooden Spoon */}
      {/* Spoon */}
      <g transform="rotate(-15 42 62)">
        <rect x="40" y="52" width="3" height="20" rx="1.2" fill="url(#remySpoonGrad)" />
        <ellipse cx="41.5" cy="52" rx="4.5" ry="6" fill="url(#remySpoonGrad)" />
      </g>
      {/* Arm */}
      <path d="M48 64 Q42 65 44 70" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="44" cy="70" r="2" fill="#F472B6" />

      {/* Right Arm & Whisk */}
      <path d="M68 64 Q74 68 70 74" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="70" cy="74" r="2" fill="#F472B6" />
      {/* Whisk Handle & Wire */}
      <line x1="70" y1="74" x2="64" y2="82" stroke="#475569" strokeWidth="1.5" />
      <ellipse cx="62" cy="84" rx="3.5" ry="4.5" stroke="#64748B" strokeWidth="0.8" fill="none" />

      {/* Cooking Pot */}
      <rect x="46" y="80" width="28" height="15" rx="3" fill="url(#remyPotGrad)" stroke="#475569" strokeWidth="1" />
      {/* Pot Rim & Soup */}
      <ellipse cx="60" cy="80" rx="14" ry="3.5" fill="#475569" />
      <ellipse cx="60" cy="80" rx="12" ry="2.5" fill="url(#remySoupGrad)" />
      {/* Pot Handles */}
      <path d="M46 83 C42 83, 42 87, 46 87" stroke="#475569" strokeWidth="1.5" fill="none" />
      <path d="M74 83 C78 83, 78 87, 74 87" stroke="#475569" strokeWidth="1.5" fill="none" />

      {/* Steam Wisps & Magic Cooking Sparkles */}
      <path
        d="M52 76 C50 72, 54 68, 51 64"
        stroke="#E0E7FF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
        fill="none"
      />
      <path
        d="M58 75 C60 70, 56 66, 59 62"
        stroke="#E0E7FF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
        fill="none"
      />
      {/* Sparkles */}
      <path d="M43 72 L44 74 L46 75 L44 76 L43 78 L42 76 L40 75 L42 74 Z" fill="#FDE047" opacity="0.9" />
      <path d="M76 68 L77 69.5 L78.5 70 L77 70.5 L76 72 L75 70.5 L73.5 70 L75 69.5 Z" fill="#FDE047" opacity="0.9" />
    </svg>
  );
}

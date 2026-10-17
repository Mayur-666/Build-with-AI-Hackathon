// Hand-drawn (inline SVG) pieces of the one fixed storybook room.
// Purely visual — every clickable thing is wrapped by <Hotspot> in RoomScene.

export function ArchedWindow() {
  return (
    <svg viewBox="0 0 100 150" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0f2e" />
          <stop offset="1" stopColor="#25205a" />
        </linearGradient>
        <radialGradient id="moonGlow">
          <stop offset="0" stopColor="#fff4cc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff4cc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M8 150 V50 A42 42 0 0 1 92 50 V150 Z" fill="#4a3a6e" />
      <path d="M15 146 V52 A35 35 0 0 1 85 52 V146 Z" fill="url(#sky)" />
      <circle cx="62" cy="48" r="22" fill="url(#moonGlow)" />
      <circle cx="62" cy="48" r="10" fill="#fff1c2" />
      <circle cx="58" cy="45" r="2" fill="#e9d9a0" />
      <circle cx="65" cy="52" r="1.4" fill="#e9d9a0" />
      {[
        [28, 40],
        [40, 70],
        [30, 100],
        [72, 92],
        [50, 30],
        [76, 120],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 0.9 : 1.3} fill="#ffe8a8" opacity="0.85" />
      ))}
      <path d="M50 17 V146 M15 98 H85" stroke="#4a3a6e" strokeWidth="4" />
      <rect x="2" y="144" width="96" height="6" rx="2" fill="#5b4a7a" />
    </svg>
  );
}

export function HangingLamp() {
  return (
    <svg viewBox="0 0 40 100" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="flame">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.5" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="20" y1="0" x2="20" y2="52" stroke="#8a6a3a" strokeWidth="1.2" strokeDasharray="3 1.5" />
      <path d="M10 56 L30 56 L26 52 L14 52 Z" fill="#c79a42" />
      <path d="M11 57 L29 57 L27 80 L13 80 Z" fill="rgba(255,220,140,0.25)" stroke="#c79a42" strokeWidth="1.5" />
      <circle cx="20" cy="69" r="11" fill="url(#flame)" className="lamp-flame" />
      <path d="M12 81 L28 81 L24 86 L16 86 Z" fill="#c79a42" />
    </svg>
  );
}

export function Shelf() {
  return (
    <svg viewBox="0 0 100 20" className="h-full w-full" aria-hidden preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="6" rx="1" fill="#6b4428" />
      <rect x="0" y="5" width="100" height="2" fill="#3e2616" />
      <path d="M12 7 L12 20 L22 7 Z M78 7 L88 7 L88 20 Z" fill="#4a2e1a" />
    </svg>
  );
}

export function Pedestal() {
  return (
    <svg viewBox="0 0 60 70" className="h-full w-full" aria-hidden>
      <rect x="4" y="0" width="52" height="8" rx="2" fill="#8c7aa8" />
      <rect x="2" y="7" width="56" height="3" fill="#6d5c8a" />
      <rect x="12" y="10" width="36" height="50" fill="#7a68a0" />
      <path d="M20 10 V60 M30 10 V60 M40 10 V60" stroke="#5f4f85" strokeWidth="2" />
      <rect x="6" y="60" width="48" height="10" rx="2" fill="#5b4a7a" />
    </svg>
  );
}

export function SideTable() {
  return (
    <svg viewBox="0 0 60 70" className="h-full w-full" aria-hidden>
      <ellipse cx="30" cy="6" rx="28" ry="6" fill="#7a4f30" />
      <ellipse cx="30" cy="4" rx="28" ry="5" fill="#94643e" />
      <path d="M30 10 V62" stroke="#5a3a24" strokeWidth="6" />
      <path d="M14 70 Q30 56 46 70" fill="none" stroke="#5a3a24" strokeWidth="5" />
    </svg>
  );
}

export function Door({ open = false, unlocked = false }: { open?: boolean; unlocked?: boolean }) {
  return (
    <div className={`door ${open ? "open" : ""} ${unlocked ? "unlocked" : ""}`}>
      <svg viewBox="0 0 100 170" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="beyond" cx="0.5" cy="0.65">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset="0.6" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#f2c14e" />
          </radialGradient>
        </defs>
        {/* stone arch */}
        <path d="M2 170 V52 A48 48 0 0 1 98 52 V170 Z" fill="#4d4170" />
        <path d="M2 170 V52 A48 48 0 0 1 98 52" fill="none" stroke="#6d5f94" strokeWidth="3" strokeDasharray="10 3" />
        {/* the world beyond: dark until the door opens */}
        <path d="M12 170 V56 A38 38 0 0 1 88 56 V170 Z" fill={open ? "url(#beyond)" : "#120c22"} className="door-beyond" />
        {open && (
          <g className="door-stars">
            <circle cx="40" cy="60" r="1.6" fill="#fff" />
            <circle cx="62" cy="48" r="1.2" fill="#fff" />
            <circle cx="55" cy="84" r="1" fill="#fff" />
          </g>
        )}
      </svg>
      {/* the leaf swings open in 3D */}
      <div className="door-leaf" aria-hidden>
        <svg viewBox="12 18 76 152" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4a2c18" />
              <stop offset="0.5" stopColor="#6b4226" />
              <stop offset="1" stopColor="#4a2c18" />
            </linearGradient>
          </defs>
          <path d="M12 170 V56 A38 38 0 0 1 88 56 V170 Z" fill="url(#wood)" />
          <path d="M31 22 V170 M50 18 V170 M69 22 V170" stroke="#3a2212" strokeWidth="1.6" />
          <rect x="12" y="70" width="76" height="6" fill="#2d2236" />
          <rect x="12" y="130" width="76" height="6" fill="#2d2236" />
          <circle cx="76" cy="104" r="4.5" fill="#c79a42" />
          <path d="M74.5 109 h3 l1 7 h-5 z" fill="#1a1020" />
          <circle cx="76" cy="104" r="1.6" fill="#1a1020" />
        </svg>
      </div>
    </div>
  );
}

export function Machine({ solved = false }: { solved?: boolean }) {
  return (
    <svg viewBox="0 0 120 200" className={`h-full w-full ${solved ? "machine-solved" : ""}`} aria-hidden>
      <defs>
        <linearGradient id="brassBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9c86e" />
          <stop offset="0.5" stopColor="#b8873a" />
          <stop offset="1" stopColor="#7a5520" />
        </linearGradient>
        <radialGradient id="bulb">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.6" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#c47a1a" />
        </radialGradient>
      </defs>
      {/* pipes */}
      <path d="M18 40 V10 H40" fill="none" stroke="#8a6424" strokeWidth="6" strokeLinecap="round" />
      <path d="M102 50 V20 H86" fill="none" stroke="#8a6424" strokeWidth="6" strokeLinecap="round" />
      {/* gears behind */}
      <g className="gear">
        <circle cx="30" cy="48" r="16" fill="#a77a30" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="27" y="28" width="6" height="8" fill="#a77a30" transform={`rotate(${i * 45} 30 48)`} />
        ))}
        <circle cx="30" cy="48" r="5" fill="#5a3e14" />
      </g>
      <g className="gear reverse">
        <circle cx="92" cy="60" r="12" fill="#c4943e" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x="89.5" y="44" width="5" height="7" fill="#c4943e" transform={`rotate(${i * 60} 92 60)`} />
        ))}
        <circle cx="92" cy="60" r="4" fill="#5a3e14" />
      </g>
      {/* cabinet */}
      <rect x="14" y="62" width="92" height="120" rx="10" fill="url(#brassBody)" stroke="#5a3e14" strokeWidth="2" />
      <rect x="22" y="72" width="76" height="40" rx="6" fill="#2a1d3d" stroke="#5a3e14" strokeWidth="2" />
      {/* three dials */}
      {[38, 60, 82].map((x) => (
        <g key={x}>
          <circle cx={x} cy="92" r="9" fill="#f3e6c8" stroke="#5a3e14" strokeWidth="2" />
          <line x1={x} y1="92" x2={x} y2="85" stroke="#5a3e14" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {/* bulbs */}
      {[34, 60, 86].map((x, i) => (
        <circle key={x} cx={x} cy="126" r="6" fill="url(#bulb)" className="bulb" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* grille + feet */}
      <path d="M30 146 H90 M30 154 H90 M30 162 H90" stroke="#6b4a1a" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="182" width="16" height="12" rx="3" fill="#6b4a1a" />
      <rect x="84" y="182" width="16" height="12" rx="3" fill="#6b4a1a" />
    </svg>
  );
}

export function VelvetBox({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 100 80" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a2f5a" />
          <stop offset="1" stopColor="#4e1636" />
        </linearGradient>
      </defs>
      {/* glow from inside when open */}
      {open && <ellipse cx="50" cy="40" rx="40" ry="10" fill="#ffe8a8" opacity="0.55" />}
      {/* base */}
      <rect x="8" y="38" width="84" height="38" rx="5" fill="url(#velvet)" stroke="#2e0c1f" strokeWidth="2" />
      <rect x="8" y="38" width="84" height="5" fill="#c79a42" />
      {!open && <circle cx="50" cy="52" r="4" fill="#d9d9e6" stroke="#6b6b80" strokeWidth="1" />}
      {!open && <rect x="49" y="54" width="2" height="5" fill="#2e0c1f" />}
      {/* lid */}
      <g className={`lid ${open ? "open" : ""}`}>
        <path d="M8 40 Q8 18 50 16 Q92 18 92 40 Z" fill="url(#velvet)" stroke="#2e0c1f" strokeWidth="2" />
        <path d="M8 40 H92" stroke="#c79a42" strokeWidth="3" />
      </g>
    </svg>
  );
}

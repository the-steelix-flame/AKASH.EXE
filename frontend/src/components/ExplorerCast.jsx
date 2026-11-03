import { memo } from "react";

// Original cartoon cast for the "adventure" rounds (Round 2 and Round 3 of Level 1). Inspired by the style of a
// children's exploration show (bright primary colours, thick outlines, a friendly talking map in a backpack),
// but they are our own characters: Explorer Akash (safari hat, green headset, purple backpack) and the Trail Map.

const INK = "#3b1d0a";

export const ExplorerAkash = memo(function ExplorerAkash({ size = 110, className = "", testId = "explorer-akash", wave = true }) {
  return (
    <svg viewBox="0 0 120 150" width={size} height={size * 1.25} className={className} role="img" aria-label="Explorer Akash" data-testid={testId}>
      {/* backpack */}
      <rect x="20" y="68" width="80" height="58" rx="17" fill="#7c3aed" stroke="#312e81" strokeWidth="3.5" />
      <rect x="40" y="100" width="40" height="19" rx="7" fill="#a78bfa" stroke="#312e81" strokeWidth="3" />
      {/* legs + boots */}
      <rect x="42" y="112" width="15" height="24" rx="6" fill="#1d4ed8" stroke="#172554" strokeWidth="3" />
      <rect x="63" y="112" width="15" height="24" rx="6" fill="#1d4ed8" stroke="#172554" strokeWidth="3" />
      <rect x="37" y="132" width="23" height="12" rx="6" fill="#b45309" stroke={INK} strokeWidth="3" />
      <rect x="60" y="132" width="23" height="12" rx="6" fill="#b45309" stroke={INK} strokeWidth="3" />
      {/* shirt + straps */}
      <rect x="35" y="72" width="50" height="45" rx="17" fill="#fb923c" stroke="#7c2d12" strokeWidth="3.5" />
      <path d="M46 75 V110 M74 75 V110" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />
      {/* left arm, holding a rolled map */}
      <path d="M38 84 Q22 92 26 110" stroke="#7c2d12" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M38 84 Q22 92 26 110" stroke="#fb923c" strokeWidth="7" strokeLinecap="round" fill="none" />
      <g transform="rotate(-18 24 114)">
        <rect x="14" y="104" width="22" height="16" rx="5" fill="#fde68a" stroke="#78350f" strokeWidth="3" />
        <path d="M18 112 q4 -4 8 0 t8 0" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="2 2" />
      </g>
      <circle cx="26" cy="112" r="6" fill="#f6cfa3" stroke="#7c2d12" strokeWidth="3" />
      {/* right arm, waving */}
      <g className={wave ? "explorer-wave" : undefined} style={{ transformOrigin: "84px 84px" }}>
        <path d="M84 84 Q104 80 106 58" stroke="#7c2d12" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M84 84 Q104 80 106 58" stroke="#fb923c" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="106" cy="54" r="7" fill="#f6cfa3" stroke="#7c2d12" strokeWidth="3" />
      </g>
      {/* head */}
      <circle cx="60" cy="50" r="26" fill="#f6cfa3" stroke="#7c2d12" strokeWidth="3.5" />
      <path d="M35 46 Q36 28 60 28 Q84 28 85 46 Q74 38 60 38 Q46 38 35 46Z" fill="#1f2937" />
      {/* headset */}
      <circle cx="34" cy="54" r="8" fill="#22c55e" stroke="#14532d" strokeWidth="3" />
      <circle cx="86" cy="54" r="8" fill="#22c55e" stroke="#14532d" strokeWidth="3" />
      <path d="M34 62 Q38 74 56 73" stroke="#14532d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="73" r="4" fill="#22c55e" stroke="#14532d" strokeWidth="2.5" />
      {/* safari hat */}
      <ellipse cx="60" cy="30" rx="40" ry="9" fill="#facc15" stroke="#854d0e" strokeWidth="3.5" />
      <path d="M37 30 Q37 6 60 6 Q83 6 83 30Z" fill="#fde047" stroke="#854d0e" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="38" y="21" width="44" height="7" fill="#b45309" />
      {/* face */}
      <ellipse cx="50" cy="52" rx="5.5" ry="7" fill="#fff" stroke={INK} strokeWidth="2" />
      <ellipse cx="70" cy="52" rx="5.5" ry="7" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="51" cy="53" r="3" fill="#111827" /><circle cx="71" cy="53" r="3" fill="#111827" />
      <circle cx="52" cy="51.5" r="1" fill="#fff" /><circle cx="72" cy="51.5" r="1" fill="#fff" />
      <path d="M49 63 Q60 75 71 63Z" fill="#7f1d1d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M54 68 Q60 72 66 68" fill="#fb7185" />
      <circle cx="42" cy="62" r="4" fill="#fb7185" opacity="0.55" /><circle cx="78" cy="62" r="4" fill="#fb7185" opacity="0.55" />
    </svg>
  );
});

export const TrailMap = memo(function TrailMap({ size = 96, className = "", testId = "trail-map" }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label="The talking trail map" data-testid={testId}>
      <rect x="16" y="20" width="88" height="82" rx="6" fill="#fde68a" stroke="#78350f" strokeWidth="3.5" />
      <rect x="8" y="12" width="104" height="15" rx="7.5" fill="#f59e0b" stroke="#78350f" strokeWidth="3.5" />
      <rect x="8" y="95" width="104" height="15" rx="7.5" fill="#f59e0b" stroke="#78350f" strokeWidth="3.5" />
      <circle cx="46" cy="52" r="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="76" cy="52" r="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <circle cx="48" cy="54" r="4.5" fill="#111827" /><circle cx="78" cy="54" r="4.5" fill="#111827" />
      <circle cx="49.5" cy="52" r="1.4" fill="#fff" /><circle cx="79.5" cy="52" r="1.4" fill="#fff" />
      <path d="M45 70 Q61 86 77 70Z" fill="#7f1d1d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M26 88 Q42 72 54 84 T86 78" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M88 70 l10 10 M98 70 l-10 10" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
});

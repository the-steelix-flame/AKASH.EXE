import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CHEAT_SHEET, TYPES, TYPE_META, cap, typeRelations } from "@/data/pokemonData";

function Chip({ type, strong = false, ring = false }) {
  const m = TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${strong ? "bg-slate-900" : "bg-slate-950"} ${ring ? "ring-2 ring-white/70" : ""}`}
      style={{ borderColor: `${m.color}99`, color: m.color }}
    >
      <span aria-hidden="true">{m.emoji}</span>
      {type.toUpperCase()}
    </span>
  );
}

function Row({ label, tone, types, emptyText = "none" }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`w-28 shrink-0 text-[9px] font-bold tracking-[0.18em] ${tone}`}>{label}</span>
      {types.length ? types.map((t) => <Chip key={t} type={t} />) : <span className="text-[10px] text-slate-600">{emptyText}</span>}
    </div>
  );
}

// Always-visible, compact cheat sheet. The pairs are only a useful subset: battle maths uses the
// complete 18-type chart in pokemonData.js. Collapsible on phones, open on larger screens.
function TypeGuide({ opponentTypes = [], embedded = false }) {
  const [openState, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 640);
  const open = embedded || openState;
  const [picked, setPicked] = useState(null);
  const rel = picked ? typeRelations(picked) : null;

  return (
    <section className="hud-panel-cyan rounded-xl p-3 sm:p-4" data-testid="type-guide" aria-label="Pokémon type cheat sheet">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="type-guide-toggle"
        disabled={embedded}
        className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-volt sm:cursor-default"
      >
        <span className="font-display text-xs font-black tracking-[0.18em] text-volt sm:text-sm">POKÉMON TYPE CHEAT SHEET</span>
        {!embedded && <ChevronDown className={`h-4 w-4 text-volt transition-transform sm:hidden ${open ? "rotate-180" : ""}`} />}
      </button>

      <div className={`${open ? "block" : "hidden"} sm:block`} data-testid="type-guide-body">
        <div className="mt-3 grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 lg:grid-cols-3" data-testid="type-guide-pairs">
          {CHEAT_SHEET.map(([a, d]) => (
            <div key={`${a}-${d}`} className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950/70 px-2 py-1.5" data-testid={`pair-${a}-${d}`}>
              <Chip type={a} />
              <span className="text-sm font-black text-neon" aria-label="is strong against">&gt;</span>
              <Chip type={d} />
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Tap a type to see its strengths and weaknesses.</p>
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="type-guide-types">
          {TYPES.map((t) => {
            const m = TYPE_META[t];
            const on = picked === t;
            const isOpp = opponentTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setPicked(on ? null : t)}
                aria-pressed={on}
                data-testid={`type-btn-${t}`}
                className={`rounded border px-2 py-1 text-[10px] font-bold tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-volt ${on ? "bg-slate-800" : "bg-slate-950 hover:bg-slate-900"} ${isOpp ? "ring-1 ring-blood/80" : ""}`}
                style={{ borderColor: `${m.color}${on ? "ff" : "66"}`, color: m.color }}
                title={isOpp ? "Opponent type" : undefined}
              >
                {m.emoji} {cap(t)}
              </button>
            );
          })}
        </div>
        {opponentTypes.length > 0 && <p className="mt-1.5 text-[10px] text-blood/90">Red ring = your current opponent's type.</p>}

        {rel && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-3" data-testid="type-guide-detail">
            <div className="text-[10px] font-bold tracking-[0.2em] text-white">{TYPE_META[picked].emoji} {picked.toUpperCase()}</div>
            <Row label="HITS HARD (2x)" tone="text-neon" types={rel.strongAgainst} />
            <Row label="HITS WEAKLY (½x)" tone="text-ember" types={rel.weakAgainst} />
            <Row label="NO EFFECT ON" tone="text-slate-400" types={rel.noEffectOn} />
            <Row label="WEAK TO (takes 2x)" tone="text-blood" types={rel.weakTo} />
            <Row label="RESISTS (takes ½x)" tone="text-volt" types={rel.resists} />
            <Row label="IMMUNE TO" tone="text-slate-400" types={rel.immuneTo} />
          </div>
        )}
        <p className="mt-2 text-[9px] text-slate-600">Dual-type Pokémon multiply both types (e.g. Water vs Rock/Ground = 2 × 2 = 4x). This sheet is a subset of the full chart.</p>
      </div>
    </section>
  );
}

export default memo(TypeGuide);

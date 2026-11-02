import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import TypeGuide from "@/components/pokemon/TypeGuide";
import { TYPE_META, cap, effectivenessOf, fmtMult, typesLabel } from "@/data/pokemonData";

const multTone = (m) => (m === 0 ? "text-slate-500" : m > 1 ? "text-neon" : m < 1 ? "text-ember" : "text-slate-300");

// Opens from the Hints button. While it's open the battle's turn sequencer is paused (see Level2Pokemon),
// and the visitor has to close it with the X / Close button (or Escape) to carry on.
export default function HintsOverlay({ open, onClose, player, opponent }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 p-5 sm:p-6" data-testid="hints-overlay">
        <DialogTitle className="font-display text-lg font-black text-white">Hints</DialogTitle>
        <DialogDescription className="text-xs text-slate-400">The battle is paused. Close this when you're ready.</DialogDescription>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" data-testid="hints-matchup">
          <h3 className="text-[10px] font-bold tracking-[0.25em] text-volt">THIS MATCHUP</h3>
          <p className="mt-2 text-xs text-slate-300">
            Opponent: <b className="text-white">{opponent.name}</b> ({typesLabel(opponent.types)}). Weak to:{" "}
            {weakTo(opponent.types).map(([t, m]) => `${TYPE_META[t].emoji} ${cap(t)} ${fmtMult(m)}`).join(", ") || "nothing"}.
          </p>
          {player ? (
            <table className="mt-3 w-full text-left text-xs">
              <thead className="text-[9px] tracking-[0.2em] text-slate-500"><tr><th className="py-1">YOUR MOVE</th><th>TYPE</th><th>VS {opponent.name.toUpperCase()}</th></tr></thead>
              <tbody>
                {player.moves.map((m) => {
                  const e = effectivenessOf(m.type, opponent.types);
                  return (
                    <tr key={m.id} className="border-t border-slate-800" data-testid={`hint-move-${m.id}`}>
                      <td className="py-1.5 text-slate-200">{m.name}</td>
                      <td>{TYPE_META[m.type].emoji} {cap(m.type)}</td>
                      <td className={`font-bold ${multTone(e)}`}>{fmtMult(e)}{e === 0 ? " (no effect)" : e > 1 ? " (strong)" : e < 1 ? " (resisted)" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Pick a Pokémon and this table will show how each of its moves does against {opponent.name}.</p>
          )}
        </section>

        <TypeGuide embedded opponentTypes={opponent.types} />

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
          <h3 className="text-[10px] font-bold tracking-[0.25em] text-volt">HOW A TURN WORKS</h3>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>The faster Pokémon moves first. Quick Attack always goes first.</li>
            <li>A move that matches your Pokémon's own type gets a 1.5x bonus.</li>
            <li>Two-type Pokémon multiply both types, so 2x and 2x is 4x, and a 0x anywhere means no damage.</li>
            <li>Low-accuracy moves hit hard but can miss.</li>
          </ul>
        </section>

        <DialogClose asChild>
          <button data-testid="hints-close" className="flex w-full items-center justify-center gap-2 rounded-md bg-volt py-3 font-display text-xs font-bold tracking-[0.25em] text-void focus:outline-none focus:ring-2 focus:ring-white/70">
            <X className="h-4 w-4" /> CLOSE AND CONTINUE
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// attacking types that do extra damage to this defender: [[type, multiplier]]
function weakTo(defTypes) {
  return Object.keys(TYPE_META).map((t) => [t, effectivenessOf(t, defTypes)]).filter(([, m]) => m > 1);
}

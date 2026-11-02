const TONES = {
  ember: "border-ember/50 bg-ember/10 text-ember",
  aura: "border-aura/50 bg-aura/10 text-aura",
  volt: "border-volt/50 bg-volt/10 text-volt",
  neon: "border-neon/50 bg-neon/10 text-neon",
  blood: "border-blood/50 bg-blood/10 text-blood",
};

export default function StageHeader({ n, total = 5, title, icon: Icon, tone = "ember" }) {
  return (
    <div className="mb-5 flex items-center gap-3" data-testid={`stage-header-${n}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${TONES[tone] || TONES.ember}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[9px] tracking-[0.35em] text-slate-500">STAGE {n} OF {total}</div>
        <div className="font-display text-base font-black text-white sm:text-lg">{title}</div>
      </div>
    </div>
  );
}

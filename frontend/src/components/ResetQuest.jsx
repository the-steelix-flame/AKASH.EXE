import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ResetQuest({ onReset }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        data-testid="reset-quest-btn"
        onClick={() => setConfirming(true)}
        className="whitespace-nowrap rounded-md border border-slate-700 px-2 py-1.5 text-[9px] tracking-widest text-slate-500 sm:px-3 sm:text-[10px] transition-colors hover:border-blood hover:text-blood focus:outline-none focus:ring-2 focus:ring-blood"
      >
        <span className="sm:hidden">RESET</span><span className="hidden sm:inline">RESET QUEST</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 rounded-md border border-blood/50 bg-blood/10 px-3 py-1.5"
      data-testid="reset-quest-confirm"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-blood" />
      <span className="text-[10px] tracking-wider text-blood">WIPE ALL PROGRESS?</span>
      <button
        data-testid="reset-quest-confirm-yes"
        onClick={() => { onReset(); setConfirming(false); }}
        className="rounded bg-blood px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blood/80"
      >
        YES
      </button>
      <button
        data-testid="reset-quest-confirm-no"
        onClick={() => setConfirming(false)}
        className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-400"
      >
        NO
      </button>
    </motion.div>
  );
}

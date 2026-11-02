import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { analyticsAvailable, deleteMyData, doNotTrack, getConsent, onConsentChange, setConsent } from "@/utils/analytics";

const CHOICES = [
  { id: "full", label: "ALLOW ALL", note: "Visits and which answers people pick in the games" },
  { id: "basic", label: "VISITS ONLY", note: "Pages, levels and projects opened. No answers." },
  { id: "none", label: "NO THANKS", note: "Nothing is sent. The site works the same." },
];

const useConsent = () => {
  const [c, setC] = useState(getConsent);
  useEffect(() => onConsentChange(setC), []);
  return c;
};

// First-visit card. Nothing is collected until a choice is made.
export function ConsentBanner({ onDetails }) {
  const consent = useConsent();
  const ref = useRef(null);
  const showing = analyticsAvailable() && !doNotTrack() && consent === null;

  // Clicking anywhere else closes the card. That is not consent, so it counts as "No thanks"
  // (nothing is recorded); it can be changed any time from the shield icon in the nav.
  useEffect(() => {
    if (!showing) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.("[data-testid=privacy-dialog]")) setConsent("none"); };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [showing]);

  if (!showing) return null;
  return (
    <div ref={ref} className="fixed bottom-3 left-3 right-3 z-[47] mx-auto max-w-md rounded-xl border border-slate-600 bg-slate-950 p-4 shadow-2xl sm:left-4 sm:right-auto sm:mx-0" role="dialog" aria-label="Analytics choice" data-testid="consent-banner" data-agent-avoid>
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neon"><ShieldCheck className="h-4 w-4" /> ANONYMOUS ANALYTICS</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        I'd like to see how people play this. With your OK I record visits and, if you allow it, the answers chosen in the games. No names, emails, microphone audio or typed text. Deleted after about six months.{" "}
        <button onClick={onDetails} className="text-volt underline underline-offset-2 hover:text-white" data-testid="consent-details">Details</button>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setConsent("full")} data-testid="consent-full" className="rounded-md bg-neon px-3 py-2 text-[11px] font-black tracking-widest text-void focus:outline-none focus:ring-2 focus:ring-white/70">ALLOW ALL</button>
        <button onClick={() => setConsent("basic")} data-testid="consent-basic" className="rounded-md border border-slate-500 px-3 py-2 text-[11px] font-bold tracking-widest text-slate-200 hover:border-white focus:outline-none focus:ring-2 focus:ring-white/70">VISITS ONLY</button>
        <button onClick={() => setConsent("none")} data-testid="consent-none" className="rounded-md px-3 py-2 text-[11px] font-bold tracking-widest text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70">NO THANKS</button>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Clicking anywhere else closes this and counts as no.</p>
    </div>
  );
}

export function PrivacyDialog({ open, onClose }) {
  const consent = useConsent();
  const [days, setDays] = useState(180);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!open || !analyticsAvailable()) return;
    setDeleted(false);
    fetch(`${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}/api/analytics/policy`).then((r) => r.json()).then((p) => p.retention_days && setDays(p.retention_days)).catch(() => {});
  }, [open]);

  const current = doNotTrack() ? "none" : consent;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-700 bg-slate-950" data-testid="privacy-dialog">
        <DialogTitle className="font-display text-lg font-black text-white">Privacy</DialogTitle>
        <DialogDescription className="text-xs text-slate-400">What this site records, and how to stop it.</DialogDescription>
        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <section>
            <h3 className="mb-1 text-[10px] font-bold tracking-[0.25em] text-neon">WHAT I RECORD (WITH YOUR OK)</h3>
            <ul className="list-disc space-y-1 pl-4">
              <li>A random anonymous ID, kept in your browser. Not linked to your name.</li>
              <li>Which pages, levels and projects you open, and for how long.</li>
              <li>Device type (desktop, tablet, mobile), browser family, and the site that sent you.</li>
              <li><b>Only if you allow all:</b> which answers you pick in the games (swipe answers, Pokémon, strategy and budget choices).</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-[10px] font-bold tracking-[0.25em] text-blood">WHAT I NEVER RECORD</h3>
            <ul className="list-disc space-y-1 pl-4">
              <li>Names, emails, passwords or your IP address.</li>
              <li>Microphone audio or voice recordings.</li>
              <li>What you type or dictate into the boxes.</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-[10px] font-bold tracking-[0.25em] text-volt">HOW LONG</h3>
            <p>Automatically deleted after {days} days.</p>
          </section>
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-[0.25em] text-ember">YOUR CHOICE</h3>
            {!analyticsAvailable() ? (
              <p className="text-slate-400">Analytics is switched off on this copy of the site.</p>
            ) : doNotTrack() ? (
              <p className="text-slate-400">Your browser sends Do Not Track, so nothing is recorded.</p>
            ) : (
              <div className="grid gap-2" role="radiogroup" aria-label="Analytics choice">
                {CHOICES.map((c) => (
                  <button key={c.id} role="radio" aria-checked={current === c.id} onClick={() => setConsent(c.id)} data-testid={`privacy-${c.id}`}
                    className={`rounded-lg border px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-white/60 ${current === c.id ? "border-neon bg-neon/10" : "border-slate-700 hover:border-slate-400"}`}>
                    <div className="text-[11px] font-bold tracking-widest text-white">{c.label}{current === c.id ? "  ✓" : ""}</div>
                    <div className="text-[10px] text-slate-400">{c.note}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
          {analyticsAvailable() && (
            <section>
              <button
                data-testid="privacy-delete"
                onClick={async () => { await deleteMyData(); setConsent("none"); setDeleted(true); }}
                className="rounded-md border border-blood/60 px-3 py-2 text-[11px] font-bold tracking-widest text-blood hover:bg-blood/10 focus:outline-none focus:ring-2 focus:ring-blood"
              >
                DELETE MY DATA
              </button>
              {deleted && <span className="ml-3 text-neon" data-testid="privacy-deleted">Deleted. Recording is now off.</span>}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

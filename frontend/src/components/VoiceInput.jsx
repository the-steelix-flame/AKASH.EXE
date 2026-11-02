import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eraser, Loader2, Mic, MicOff, SendHorizonal } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

// Wispr Flow dictates straight into whichever field has focus and never tells the page that a
// microphone is active. So this component NEVER claims to be recording. Its status is derived
// only from things the page can really observe: input events, the field's contents and submits.
//
//   READY       field empty                       "Voice input ready. Use Wispr Flow to dictate."
//   RECEIVING   input events arriving right now   "Voice input detected. Receiving text..."
//   RECEIVED    non-empty text, input has settled "Your words have been received."
//   PROCESSING  submitted, evaluation running     "Evaluating your response..."
//   ERROR       submit attempted with no text     "No text received. Please try again or type directly."
//
// The optional browser SpeechRecognition button is separate and is the only thing that can show
// a "microphone listening" state, because only then does the page really hold the microphone.

export const VOICE_STATES = {
  ready: { title: "VOICE INPUT READY", text: "Voice input ready. Use Wispr Flow to dictate." },
  receiving: { title: "RECEIVING TEXT", text: "Voice input detected. Receiving text..." },
  received: { title: "TEXT READY", text: "Your words have been received." },
  processing: { title: "EVALUATING", text: "Evaluating your response..." },
  error: { title: "NO TEXT RECEIVED", text: "No text received. Please try again or type directly." },
};

const SETTLE_MS = 700; // no input events for this long => the burst of text has arrived

const ACCENTS = {
  neon: { ring: "focus-within:border-neon focus-within:shadow-[0_0_18px_rgba(57,255,20,0.25)]", btn: "bg-neon text-void hover:shadow-[0_0_18px_rgba(57,255,20,0.6)]", text: "text-neon", bar: "bg-neon" },
  volt: { ring: "focus-within:border-volt focus-within:shadow-[0_0_18px_rgba(0,240,255,0.25)]", btn: "bg-volt text-void hover:shadow-[0_0_18px_rgba(0,240,255,0.6)]", text: "text-volt", bar: "bg-volt" },
  aura: { ring: "focus-within:border-aura focus-within:shadow-[0_0_18px_rgba(168,85,247,0.3)]", btn: "bg-aura text-white hover:shadow-[0_0_18px_rgba(168,85,247,0.6)]", text: "text-aura", bar: "bg-aura" },
  ember: { ring: "focus-within:border-ember focus-within:shadow-[0_0_18px_rgba(245,158,11,0.3)]", btn: "bg-ember text-void hover:shadow-[0_0_18px_rgba(245,158,11,0.6)]", text: "text-ember", bar: "bg-ember" },
};

function StatusIcon({ state, accent }) {
  const a = ACCENTS[accent] || ACCENTS.neon;
  if (state === "receiving") {
    // transform-only animation: "text is arriving" waveform
    return (
      <span className="flex h-5 w-5 items-end justify-center gap-[2px]" aria-hidden="true" data-testid="voice-waveform">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`voice-bar block h-full w-[3px] origin-bottom rounded-sm ${a.bar}`} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </span>
    );
  }
  if (state === "received") return <CheckCircle2 className="h-5 w-5 text-neon" aria-hidden="true" data-testid="voice-check" />;
  if (state === "processing") return <Loader2 className={`h-5 w-5 animate-spin ${a.text}`} aria-hidden="true" />;
  if (state === "error") return <AlertTriangle className="h-5 w-5 text-ember" aria-hidden="true" />;
  return <Mic className="h-5 w-5 text-slate-400" aria-hidden="true" />; // static: not recording
}

export default function VoiceInput({
  onSubmit,
  onSubmitStart,   // fires the instant the visitor submits (before the short evaluation delay)
  placeholder = "Your answer appears here...",
  submitLabel = "SUBMIT",
  disabled = false,
  size = "md", // md = short command, lg = long answer
  autoFocus = false,
  accent = "neon",
  testId = "voice-input",
  heading = "USE WISPR FLOW TO SPEAK YOUR ANSWER",
  subheading = "Or type your answer directly below.",
  evalDelay = 700,
}) {
  const a = ACCENTS[accent] || ACCENTS.neon;
  const [value, setValue] = useState("");
  const [state, setState] = useState("ready");
  const [submitted, setSubmitted] = useState(null); // text currently being evaluated
  const [lastSent, setLastSent] = useState(null);
  const micUsed = useRef(false); // true only if the browser speech recogniser contributed text
  const fieldRef = useRef(null);
  const settleRef = useRef(null);
  const evalRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(settleRef.current);
      clearTimeout(evalRef.current);
    };
  }, []);

  // Dictation (Wispr Flow) lands in whichever field has focus, so an autoFocus box must STAY focused:
  // when it becomes enabled (a round starts) and when it comes back after an evaluation.
  const evaluating = state === "processing";
  useEffect(() => {
    if (autoFocus && !disabled && !evaluating && fieldRef.current) fieldRef.current.focus({ preventScroll: true });
  }, [autoFocus, disabled, evaluating]);

  // Called whenever text really changes (typed, pasted, or inserted by Wispr Flow).
  const noteInput = useCallback((next) => {
    clearTimeout(settleRef.current);
    if (!next.trim()) { setState("ready"); return; } // deleted everything => back to ready
    setState("receiving");
    settleRef.current = setTimeout(() => { if (mounted.current) setState("received"); }, SETTLE_MS);
  }, []);

  const handleChange = (e) => {
    setValue(e.target.value);
    noteInput(e.target.value);
  };

  // Optional browser speech recognition (separate from Wispr Flow).
  const handleTranscript = useCallback((text) => {
    micUsed.current = true;
    setValue((v) => {
      const next = (v ? v.trimEnd() + " " : "") + text.trim();
      noteInput(next);
      return next;
    });
  }, [noteInput]);
  const { supported, listening, error: micError, toggle } = useVoiceInput({ onTranscript: handleTranscript });

  const clear = () => {
    micUsed.current = false;
    clearTimeout(settleRef.current);
    setValue("");
    setState("ready");
    if (fieldRef.current) fieldRef.current.focus({ preventScroll: true });
  };

  const submit = () => {
    if (disabled || state === "processing") return;
    const text = value.trim();
    if (!text) { clearTimeout(settleRef.current); setState("error"); return; }
    clearTimeout(settleRef.current);
    const meta = { source: micUsed.current ? "browser-mic" : "text", submittedAt: Date.now() };
    micUsed.current = false;
    if (onSubmitStart) onSubmitStart(text, meta);
    setSubmitted(text);          // show exactly what is being evaluated
    setState("processing");
    evalRef.current = setTimeout(() => {
      if (!mounted.current) return;
      setLastSent(text);
      setSubmitted(null);
      setValue("");
      setState("ready");
      onSubmit(text, meta);
    }, evalDelay);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const busy = state === "processing";
  const heightCls = size === "lg" ? "min-h-[150px] sm:min-h-[170px]" : "min-h-[96px]";
  const info = VOICE_STATES[state];

  return (
    <div className="w-full" data-testid={`${testId}-wrap`}>
      {/* Instruction */}
      <div className="mb-2">
        <div className={`text-[11px] font-bold tracking-[0.18em] sm:text-xs ${a.text}`} data-testid={`${testId}-heading`}>{heading}</div>
        {subheading && <div className="mt-0.5 text-xs text-slate-400">{subheading}</div>}
      </div>

      <div className={`rounded-lg border border-slate-700 bg-slate-950 transition-shadow ${a.ring}`}>
        {/* Live status: derived from real input events only */}
        <div
          className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5"
          role="status"
          aria-live="polite"
          data-testid={`${testId}-status`}
          data-state={state}
        >
          <StatusIcon state={state} accent={accent} />
          <div className="min-w-0">
            <div className={`text-[10px] font-bold tracking-[0.25em] ${state === "error" ? "text-ember" : state === "received" ? "text-neon" : "text-slate-300"}`}>
              {info.title}
            </div>
            <div className="text-[11px] text-slate-400" data-testid={`${testId}-status-text`}>{info.text}</div>
          </div>
        </div>

        {busy && submitted ? (
          <div className={`${heightCls} px-4 py-3`} data-testid={`${testId}-submitted`}>
            <div className="text-[10px] tracking-[0.25em] text-slate-500">YOUR WORDS</div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">{submitted}</p>
          </div>
        ) : (
          <textarea
            ref={fieldRef}
            data-testid={`${testId}-field`}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={size === "lg" ? 6 : 3}
            aria-label={heading}
            className={`${heightCls} block w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-40`}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`${testId}-clear-btn`}
              onClick={clear}
              disabled={disabled || busy || !value}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-[11px] font-bold tracking-widest text-slate-300 transition-colors hover:border-blood hover:text-blood focus:outline-none focus:ring-2 focus:ring-blood disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Eraser className="h-3.5 w-3.5" /> CLEAR
            </button>
            {supported && (
              <button
                type="button"
                data-testid={`${testId}-mic-btn`}
                onClick={toggle}
                disabled={disabled || busy}
                title="Optional: use the browser's own speech recognition. Needs microphone permission. Wispr Flow and typing never do."
                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-neon disabled:opacity-30 ${
                  listening ? "border-blood bg-blood/15 text-blood" : "border-slate-700 text-slate-400 hover:border-neon hover:text-neon"
                }`}
              >
                {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {listening ? "STOP BROWSER MIC" : "BROWSER MIC (OPTIONAL)"}
              </button>
            )}
          </div>
          <button
            type="button"
            data-testid={`${testId}-submit-btn`}
            onClick={submit}
            disabled={disabled || busy}
            className={`flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold tracking-widest transition-shadow focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-40 ${a.btn} ${!value.trim() ? "opacity-70" : ""}`}
          >
            {submitLabel} <SendHorizonal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span>Enter to submit · Shift+Enter for a new line</span>
        {lastSent && <span className="max-w-full truncate" data-testid={`${testId}-last-sent`}>LAST SUBMITTED: “{lastSent}”</span>}
      </div>
      {listening && (
        <div className="mt-1 animate-pulse text-[11px] text-volt" data-testid={`${testId}-listening-indicator`}>
          Browser microphone is listening — this is separate from Wispr Flow. Allow microphone permission if asked.
        </div>
      )}
      {micError && <div className="mt-1 text-[11px] text-ember" data-testid={`${testId}-mic-error`}>{micError}</div>}
    </div>
  );
}

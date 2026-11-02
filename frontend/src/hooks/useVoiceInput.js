import { useCallback, useEffect, useRef, useState } from "react";

// Optional browser-native speech recognition.
// Wispr Flow users never need this — they dictate straight into the focused field.
// Typing always works regardless.
export function useVoiceInput({ onTranscript } = {}) {
  const recRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final && onTranscript) onTranscript(final);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone blocked. Allow mic access in your browser, or just type / use Wispr Flow.");
      } else if (e.error !== "aborted") {
        setError("Speech recognition hiccup — typing and Wispr Flow still work.");
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [onTranscript]);

  const start = useCallback(() => {
    setError(null);
    try { recRef.current && recRef.current.start(); setListening(true); } catch {}
  }, []);

  const stop = useCallback(() => {
    try { recRef.current && recRef.current.stop(); } catch {}
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { supported, listening, error, toggle, start, stop };
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getTrack, resolveId } from "@/data/audioData";
import { findAudio } from "@/utils/audioProbe";
import { setSfxEnabled } from "@/utils/sfx";

// Two contexts so components that only *trigger* audio (the game levels) never
// re-render when playback state changes. Only the narration panel subscribes to state.
const StateCtx = createContext(null);
const ActionsCtx = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);

  const tokenRef = useRef(0); // bumps on every play/stop: stale async work bails out
  const onEndedRef = useRef(null);
  const queueRef = useRef([]);
  const fallbackTimerRef = useRef(null);
  const seqTimerRef = useRef(null);
  const mutedRef = useRef(false);
  const playingRef = useRef(false);
  const trackRef = useRef(null);
  const api = useRef({});

  const [track, setTrackState] = useState(null); // {id, file, label, text, purpose, custom, kind}
  const [playing, setPlayingState] = useState(false);
  const [muted, setMuted] = useState(false);
  const [available, setAvailable] = useState(true); // false = no audio file, caption-only
  const [blocked, setBlocked] = useState(false); // browser refused autoplay
  const [duration, setDuration] = useState(0); // seconds, once the browser knows it (0 = unknown)

  const setTrack = (t) => { trackRef.current = t; setTrackState(t); };
  const setPlaying = (v) => { playingRef.current = v; setPlayingState(v); };

  const clearTimers = () => {
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    if (seqTimerRef.current) { clearTimeout(seqTimerRef.current); seqTimerRef.current = null; }
  };

  // A track ended (real audio finished, or the caption timer ran out).
  api.current.finish = (token) => {
    if (token !== tokenRef.current) return;
    setPlaying(false);
    const cb = onEndedRef.current;
    if (cb) { onEndedRef.current = null; cb(); return; }
    const next = queueRef.current.shift();
    if (next) {
      seqTimerRef.current = setTimeout(() => api.current.start(next, null, {}), 250);
    }
  };

  const scheduleCaption = (t, token) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    const ms = Math.min(12000, Math.max(3500, t.text.split(" ").length * 380));
    fallbackTimerRef.current = setTimeout(() => api.current.finish(token), ms);
  };

  api.current.start = async (id, onEnded, opts = {}) => {
    const t = getTrack(id);
    if (!t) { if (onEnded) onEnded(); return; }
    if (opts.low && playingRef.current) return; // short reaction clips never interrupt narration
    const a = audioRef.current;
    if (!a) return;

    const token = ++tokenRef.current;
    clearTimers();
    a.pause();
    onEndedRef.current = onEnded || null;

    setTrack({ ...t, kind: null });
    setDuration(0);
    setAvailable(true);
    setBlocked(false);
    setPlaying(false);

    let src = null;
    let kind = null;
    const found = await findAudio(t.file);
    if (token !== tokenRef.current) return; // something newer started meanwhile
    if (found) { src = found.src; kind = found.kind; }
    setTrack({ ...t, custom: kind === "recording", kind });

    if (!src) {
      // No file uploaded for this clip: never touch the <audio> element, show the caption instead.
      setAvailable(false);
      setPlaying(true);
      scheduleCaption(t, token);
      return;
    }

    a.src = src;
    a.muted = mutedRef.current;
    const p = a.play();
    if (p && p.then) {
      p.then(() => { if (token !== tokenRef.current) return; setPlaying(true); })
       .catch(() => {
         if (token !== tokenRef.current) return;
         setBlocked(true); // autoplay policy: user must press replay once
         setPlaying(true);
         scheduleCaption(t, token);
       });
    } else {
      setPlaying(true);
    }
  };

  const play = useCallback((id, opts = {}) => {
    queueRef.current = [];
    api.current.start(id, opts.onEnded || null, opts);
  }, []);

  const playSequence = useCallback((ids) => {
    if (!ids || !ids.length) return;
    const [first, ...rest] = ids;
    queueRef.current = rest;
    api.current.start(first, null, {});
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    clearTimers();
    const a = audioRef.current;
    if (a) { a.pause(); try { a.currentTime = 0; } catch {} }
    onEndedRef.current = null;
    queueRef.current = [];
    setPlaying(false);
    setTrack(null);
  }, []);

  const replay = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    queueRef.current = [];
    api.current.start(t.id, null, {});
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (audioRef.current) audioRef.current.muted = mutedRef.current;
    setSfxEnabled(!mutedRef.current);
    setMuted(mutedRef.current);
  }, []);

  const handleEnded = useCallback(() => api.current.finish(tokenRef.current), []);
  const handleError = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.getAttribute("src")) return; // ignore errors from an empty element
    const t = trackRef.current;
    if (!t) return;
    setAvailable(false); // file exists but cannot be decoded: fall back to the caption
    scheduleCaption(t, tokenRef.current);
  }, []);

  useEffect(() => () => { clearTimers(); tokenRef.current += 1; }, []);

  const actions = useMemo(
    () => ({ play, playSequence, stop, replay, toggleMute, resolveId }),
    [play, playSequence, stop, replay, toggleMute],
  );
  const state = useMemo(
    () => ({ track, playing, muted, available, blocked, duration }),
    [track, playing, muted, available, blocked, duration],
  );

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>
        {children}
        <audio ref={audioRef} onEnded={handleEnded} onError={handleError} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} preload="none" />
      </StateCtx.Provider>
    </ActionsCtx.Provider>
  );
}

export const useAudioActions = () => useContext(ActionsCtx);
export const useAudioState = () => useContext(StateCtx);
// Backwards compatible: state + actions together (re-renders on playback changes).
export const useAudio = () => ({ ...useContext(StateCtx), ...useContext(ActionsCtx) });

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ambient } from "@/utils/ambient";
import { useAudioState } from "@/hooks/useAudio";

// The music preference + whether it is audibly playing right now.
export const useMusic = () => {
  const snap = useSyncExternalStore(ambient.subscribe, ambient.getSnapshot, ambient.getSnapshot);
  return { ...snap, toggle: ambient.toggle };
};

// Mounted once. Starts the music on the visitor's first click / tap / key press (browsers require one),
// follows the mute button, and turns the music down while a narration clip is speaking.
export function MusicController() {
  const { playing, muted } = useAudioState();
  useEffect(() => ambient.attach(), []);
  useEffect(() => { ambient.setMuted(!!muted); }, [muted]);
  const release = useRef(null);
  useEffect(() => {
    clearTimeout(release.current);
    if (playing && !muted) ambient.setDuck(true);
    else release.current = setTimeout(() => ambient.setDuck(false), 1000); // clips often follow each other: don't pump the volume up and down
    return () => clearTimeout(release.current);
  }, [playing, muted]);
  return null;
}

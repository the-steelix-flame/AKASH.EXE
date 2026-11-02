import { useEffect, useRef } from "react";
import { useAudioActions } from "@/hooks/useAudio";

// Plays a level's opening narration as ONE sequence (intro -> briefing), so the second clip
// waits for the first instead of cutting it off on a timer. Narration stops when the level
// unmounts, unless the level asks to keep it (e.g. the unlocked story that plays on the next page).
export function useLevelAudio(ids) {
  const { playSequence, stop } = useAudioActions();
  const keep = useRef(false);

  useEffect(() => {
    playSequence(ids);
    return () => { if (!keep.current) stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { keepAudio: () => { keep.current = true; } };
}

import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEY = "akash_exe_progress_v1";

const DEFAULT_PROGRESS = {
  version: 1,
  level1Unlocked: true,
  level1Completed: false,
  level2Unlocked: false,
  level2Completed: false,
  level3Unlocked: false,
  level3Completed: false,
  level4Unlocked: false,
  level4Completed: false,
  allLevelsCompleted: false,
  lastUnlockedLevel: 1,
};

const BOOL_KEYS = Object.keys(DEFAULT_PROGRESS).filter((k) => k !== "version" && k !== "lastUnlockedLevel");

function validate(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1) return null;
  const p = { ...DEFAULT_PROGRESS };
  for (const k of BOOL_KEYS) p[k] = raw[k] === true;
  p.lastUnlockedLevel = [1, 2, 3, 4].includes(raw.lastUnlockedLevel) ? raw.lastUnlockedLevel : 1;
  // derive consistency: completed implies unlocked; completion chain implies next unlocked
  for (let n = 1; n <= 4; n++) {
    if (p[`level${n}Completed`]) {
      p[`level${n}Unlocked`] = true;
      if (n < 4) p[`level${n + 1}Unlocked`] = true;
    }
  }
  if (p.level4Completed) p.allLevelsCompleted = true;
  if (p.allLevelsCompleted) {
    for (let n = 1; n <= 4; n++) { p[`level${n}Unlocked`] = true; }
  }
  let last = 1;
  for (let n = 1; n <= 4; n++) if (p[`level${n}Unlocked`]) last = n;
  p.lastUnlockedLevel = last;
  return p;
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return validate(JSON.parse(raw)) || { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function persist(p) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable (private mode etc.) — game continues in memory
  }
}

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    persist(progress);
  }, [progress]);

  const completeLevel = useCallback((n) => {
    setProgress((prev) => {
      const next = { ...prev, [`level${n}Completed`]: true, [`level${n}Unlocked`]: true };
      if (n < 4) next[`level${n + 1}Unlocked`] = true;
      if (n === 4) next.allLevelsCompleted = true;
      let last = 1;
      for (let i = 1; i <= 4; i++) if (next[`level${i}Unlocked`]) last = i;
      next.lastUnlockedLevel = last;
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setProgress({ ...DEFAULT_PROGRESS });
  }, []);

  const isUnlocked = useCallback((n) => progress[`level${n}Unlocked`] === true, [progress]);
  const isCompleted = useCallback((n) => progress[`level${n}Completed`] === true, [progress]);

  const completedCount = [1, 2, 3, 4].filter((n) => progress[`level${n}Completed`]).length;

  return { progress, completeLevel, resetProgress, isUnlocked, isCompleted, completedCount };
}

// Finds which audio file (if any) exists for a clip, without ever throwing.
// Create-React-App / SPA hosts answer unknown URLs with index.html (HTTP 200), so we
// also check the Content-Type instead of trusting the status code alone.
import { AUDIO_BASE, AUDIO_EXTENSIONS, PLACEHOLDER_SUFFIX } from "@/data/audioData";

const cache = new Map(); // file -> Promise<{src, kind} | null>

async function exists(url) {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-cache" });
    if (!r.ok) return false;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    return !ct.includes("text/html");
  } catch {
    return false;
  }
}

async function probe(file) {
  for (const ext of AUDIO_EXTENSIONS) {
    const src = `${AUDIO_BASE}${file}.${ext}`;
    if (await exists(src)) return { src, kind: "recording" };
  }
  const ph = `${AUDIO_BASE}${file}.${PLACEHOLDER_SUFFIX}`;
  if (await exists(ph)) return { src: ph, kind: "placeholder" };
  return null;
}

// Cached lookup used by the player. Resolves to {src, kind} or null (= missing).
export function findAudio(file) {
  if (!cache.has(file)) cache.set(file, probe(file));
  return cache.get(file);
}

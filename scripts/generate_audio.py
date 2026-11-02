"""Generate PLACEHOLDER narration for AKASH.EXE with free Microsoft neural voices (edge-tts, no API key).

    backend/.venv/Scripts/python scripts/generate_audio.py        (needs: pip install edge-tts)

Reads frontend/src/data/audioManifest.json (the single source of truth) and writes
frontend/public/audio/<file>.placeholder.mp3 for every clip that does not have one yet.

These are only stand-ins. To use YOUR voice, copy your recording next to it as
<file>.wav (e.g. public/audio/level1/intro.wav). The game always prefers your file.
"""
import asyncio
import json
import os
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "frontend" / "src" / "data" / "audioManifest.json"
OUT_DIR = ROOT / "frontend" / "public" / "audio"
VOICE = "en-IN-PrabhatNeural"  # male Indian-English placeholder voice
RATE = "+0%"


async def main():
    clips = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ok, failed = 0, []
    for clip in clips:
        path = OUT_DIR / f"{clip['file']}.placeholder.mp3"
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 1000:
            ok += 1
            continue
        try:
            await edge_tts.Communicate(clip["text"], VOICE, rate=RATE).save(str(path))
            ok += 1
            print(f"[ok] {clip['file']}.placeholder.mp3 ({os.path.getsize(path) // 1024} KB)", flush=True)
        except Exception as e:  # noqa: BLE001
            failed.append(clip["file"])
            print(f"[fail] {clip['file']}: {e}", flush=True)
    print(f"DONE ok={ok} failed={failed}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

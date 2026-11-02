"""Anonymous interaction analytics + private admin API.

Privacy rules (enforced here, not just in the browser):
  * only an anonymous random visitor id; no names, emails, IP addresses, raw user agents or audio
  * IPs are used in memory for rate limiting only and are never stored or logged
  * answer-level events are discarded unless the visitor chose "full" consent
  * free text (e.g. a typed pitch) is discarded unless ANALYTICS_STORE_FREE_TEXT=true
  * everything expires automatically after ANALYTICS_RETENTION_DAYS (MongoDB TTL indexes)
  * a visitor can delete their own data (DELETE /api/analytics/me); the admin can purge too
The admin API is disabled until ADMIN_PASSWORD_HASH and ADMIN_JWT_SECRET are set in the environment.
"""
import csv
import hmac
import io
import json
import os
import re
import secrets
import time
from collections import Counter, defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse

RETENTION_DAYS = int(os.environ.get("ANALYTICS_RETENTION_DAYS", "180"))
STORE_FREE_TEXT = os.environ.get("ANALYTICS_STORE_FREE_TEXT", "false").lower() == "true"
TRUST_PROXY = os.environ.get("TRUST_PROXY", "false").lower() == "true"
ADMIN_USER = os.environ.get("ADMIN_USERNAME", "admin")
MAX_BODY = 32 * 1024
MAX_EVENTS = 25
JWT_TTL = 2 * 60 * 60

ID_RE = re.compile(r"^[A-Za-z0-9\-]{8,64}$")
CTRL_RE = re.compile(r"[\x00-\x1f\x7f<>`\\]")

ANSWER_EVENTS = {
    "mc_answer", "swiper_result", "pokemon_pick", "pokemon_attack", "battle_result",
    "strategy_choice", "audience_pick", "budget_alloc", "twist_response", "pitch_submit",
}

# type -> {prop: kind}. kind: ("s", maxlen) | "i" | "f" | "b" | "m" (small str->int map) | "sl" (short list of str)
SCHEMA = {
    "session_start": {"ref": ("s", 60), "w": "i", "lang": ("s", 8), "returning": "b"},
    "session_end": {"exit": ("s", 40)},
    "page_view": {"page": ("s", 40)},
    "page_time": {"page": ("s", 40), "ms": "i"},
    "level_start": {"level": "i", "revisit": "b"},
    "level_complete": {"level": "i", "ms": "i"},
    "level_abandon": {"level": "i", "ms": "i"},
    "project_open": {"project": ("s", 40)},
    "video_play": {"project": ("s", 40)},
    "mc_answer": {"question": ("s", 40), "option": ("s", 40), "verdict": ("s", 20), "points": "i"},
    "swiper_result": {"round": "i", "ok": "b", "reason": ("s", 20), "ms": "i", "source": ("s", 20), "practice": "b"},
    "pokemon_pick": {"pokemon": ("s", 30), "opponent": ("s", 30), "round": "i"},
    "pokemon_attack": {"move": ("s", 30), "pokemon": ("s", 30), "effectiveness": "f", "round": "i"},
    "battle_result": {"won": "b", "pokemon": ("s", 30), "opponent": ("s", 30), "round": "i", "turns": "i"},
    "strategy_choice": {"stage": "i", "option": ("s", 40), "score": "i", "source": ("s", 12)},
    "audience_pick": {"audience": ("s", 30)},
    "budget_alloc": {"alloc": "m", "total": "i"},
    "twist_response": {"event": ("s", 30), "option": ("s", 40), "points": "i", "source": ("s", 12)},
    "pitch_submit": {"score": "i", "picks": "m2", "source": ("s", 12), "text": ("s", 280)},
}

_NUM_LIMIT = 10_000_000


def clean_str(v, maxlen):
    if not isinstance(v, str):
        return None
    v = CTRL_RE.sub("", v).strip()
    v = re.sub(r"\s+", " ", v)
    return v[:maxlen] if v else None


def clean_props(etype, raw):
    spec = SCHEMA[etype]
    out = {}
    if not isinstance(raw, dict):
        return out
    for key, kind in spec.items():
        if key not in raw:
            continue
        v = raw[key]
        if key == "text" and not STORE_FREE_TEXT:
            continue
        if isinstance(kind, tuple):
            s = clean_str(v, kind[1])
            if s is not None:
                out[key] = s
        elif kind == "i":
            if isinstance(v, (int, float)) and not isinstance(v, bool) and abs(v) < _NUM_LIMIT:
                out[key] = int(v)
        elif kind == "f":
            if isinstance(v, (int, float)) and not isinstance(v, bool) and abs(v) < 1000:
                out[key] = float(v)
        elif kind == "b":
            if isinstance(v, bool):
                out[key] = v
        elif kind in ("m", "m2"):
            if isinstance(v, dict):
                m = {}
                for k2, v2 in list(v.items())[:10]:
                    k2 = clean_str(k2, 30)
                    if not k2:
                        continue
                    if kind == "m" and isinstance(v2, (int, float)) and not isinstance(v2, bool):
                        m[k2] = int(v2)
                    elif kind == "m2":
                        s2 = clean_str(v2, 30)
                        if s2:
                            m[k2] = s2
                if m:
                    out[key] = m
    return out


def classify_device(ua, width):
    ua = ua or ""
    if isinstance(width, int) and 0 < width < 640:
        return "mobile"
    if re.search(r"iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)", ua):
        return "tablet"
    if re.search(r"Mobi|iPhone|iPod|Android.*Mobile", ua):
        return "mobile"
    if isinstance(width, int) and 640 <= width < 1024:
        return "tablet"
    return "desktop"


def classify_browser(ua):
    ua = ua or ""
    if "Edg/" in ua or "EdgA/" in ua:
        return "Edge"
    if "OPR/" in ua or "Opera" in ua:
        return "Opera"
    if "SamsungBrowser" in ua:
        return "Samsung Internet"
    if "Firefox/" in ua or "FxiOS" in ua:
        return "Firefox"
    if "Chrome/" in ua or "CriOS" in ua:
        return "Chrome"
    if "Safari/" in ua:
        return "Safari"
    return "Other"


class RateLimiter:
    """Sliding-window limiter held in memory. Keys are hashed-in-memory strings; nothing is persisted."""

    def __init__(self):
        self.hits = defaultdict(deque)

    def allow(self, key, limit, window):
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return False, max(1, int(window - (now - q[0])))
        q.append(now)
        if len(self.hits) > 20000:  # bound memory under abuse
            for k in list(self.hits)[:5000]:
                if not self.hits[k]:
                    del self.hits[k]
        return True, 0


def client_ip(request: Request):
    if TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def parse_day(s, end=False):
    if not s:
        return None
    try:
        d = datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must look like YYYY-MM-DD")
    return d + timedelta(days=1) if end else d


def csv_safe(v):
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


def create_analytics_router(db):
    router = APIRouter()
    ev, sess, vis = db.an_events, db.an_sessions, db.an_visitors
    limiter = RateLimiter()
    login_fails = defaultdict(list)
    admin_hash = os.environ.get("ADMIN_PASSWORD_HASH", "").encode()
    jwt_secret = os.environ.get("ADMIN_JWT_SECRET", "")
    admin_ready = bool(admin_hash) and len(jwt_secret) >= 32
    dummy_hash = bcrypt.hashpw(b"not-the-password", bcrypt.gensalt(rounds=10))

    async def ensure_indexes():
        ttl = RETENTION_DAYS * 86400
        await ev.create_index("ts", expireAfterSeconds=ttl, name="ttl_ts")
        await ev.create_index([("t", 1), ("ts", -1)])
        await ev.create_index([("vid", 1), ("ts", -1)])
        await sess.create_index("last", expireAfterSeconds=ttl, name="ttl_last")
        await sess.create_index("vid")
        await vis.create_index("last_seen", expireAfterSeconds=ttl, name="ttl_last_seen")
    router.ensure_indexes = ensure_indexes

    # ------------------------------------------------------------------ public ingestion
    @router.post("/analytics/events", status_code=204)
    async def ingest(request: Request):
        ip = client_ip(request)
        ok, retry = limiter.allow(f"ip:{ip}", 40, 60)
        if not ok:
            return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": str(retry)})
        try:
            declared = int(request.headers.get("content-length") or 0)
        except ValueError:
            declared = 0
        if declared > MAX_BODY:
            raise HTTPException(status_code=413, detail="Payload too large")
        raw = await request.body()
        if len(raw) > MAX_BODY:
            raise HTTPException(status_code=413, detail="Payload too large")
        try:
            body = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(status_code=400, detail="Invalid JSON")
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Invalid body")
        vid, sid, consent = body.get("vid"), body.get("sid"), body.get("consent")
        events = body.get("events")
        if not (isinstance(vid, str) and ID_RE.match(vid) and isinstance(sid, str) and ID_RE.match(sid)):
            raise HTTPException(status_code=400, detail="Invalid ids")
        if consent not in ("basic", "full"):
            return Response(status_code=204)  # no consent, nothing stored
        if not isinstance(events, list) or not events:
            raise HTTPException(status_code=400, detail="No events")
        ok, retry = limiter.allow(f"vid:{vid}", 30, 60)
        ok2, _ = limiter.allow(f"day:{vid}", 3000, 86400)
        if not (ok and ok2):
            return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": str(retry or 60)})

        now = datetime.now(timezone.utc)
        ua = request.headers.get("user-agent", "")
        docs, width, ref, first_ts, last_ts = [], None, None, None, None
        for e in events[:MAX_EVENTS]:
            if not isinstance(e, dict):
                continue
            t = e.get("t")
            if t not in SCHEMA:
                continue
            if t in ANSWER_EVENTS and consent != "full":
                continue
            props = clean_props(t, e.get("p"))
            ts = e.get("ts")
            try:
                ts = datetime.fromtimestamp(int(ts) / 1000, tz=timezone.utc)
            except (TypeError, ValueError, OverflowError, OSError):
                ts = now
            if abs((ts - now).total_seconds()) > 86400:
                ts = now
            if t == "session_start":
                width = props.get("w")
                ref = props.get("ref")
                if ref and not re.match(r"^[A-Za-z0-9.\-]{1,60}$", ref):
                    ref = None
            docs.append({"ts": ts, "vid": vid, "sid": sid, "t": t, "p": props})
            first_ts = ts if first_ts is None or ts < first_ts else first_ts
            last_ts = ts if last_ts is None or ts > last_ts else last_ts
        if not docs:
            return Response(status_code=204)

        device = classify_device(ua, width)
        browser = classify_browser(ua)
        await ev.insert_many(docs, ordered=False)
        exit_page = next((d["p"].get("exit") for d in reversed(docs) if d["t"] == "session_end" and d["p"].get("exit")), None)
        sset = {"last": last_ts, "device": device, "browser": browser, "consent": consent}
        if exit_page:
            sset["exit"] = exit_page
        res = await sess.update_one(
            {"_id": sid},
            {"$set": sset, "$setOnInsert": {"vid": vid, "start": first_ts, "ref": ref or ""}, "$inc": {"events": len(docs)}},
            upsert=True,
        )
        new_session = res.upserted_id is not None
        vset = {"last_seen": last_ts, "device": device, "browser": browser, "consent": consent}
        vupd = {"$set": vset, "$setOnInsert": {"first_seen": first_ts}}
        if new_session:
            vupd["$inc"] = {"visits": 1}
        await vis.update_one({"_id": vid}, vupd, upsert=True)
        return Response(status_code=204)

    @router.delete("/analytics/me", status_code=204)
    async def delete_me(request: Request):
        ok, retry = limiter.allow(f"del:{client_ip(request)}", 10, 3600)
        if not ok:
            return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": str(retry)})
        try:
            body = json.loads((await request.body())[:2048])
            vid = body.get("vid")
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid body")
        if not (isinstance(vid, str) and ID_RE.match(vid)):
            raise HTTPException(status_code=400, detail="Invalid id")
        await ev.delete_many({"vid": vid})
        await sess.delete_many({"vid": vid})
        await vis.delete_one({"_id": vid})
        return Response(status_code=204)

    @router.get("/analytics/policy")
    async def policy():
        return {"retention_days": RETENTION_DAYS, "free_text_stored": STORE_FREE_TEXT}

    # ------------------------------------------------------------------ admin auth
    @router.post("/admin/login")
    async def login(request: Request):
        ip = client_ip(request)
        if not admin_ready:
            raise HTTPException(status_code=503, detail="Admin is not configured on this server")
        now = time.time()
        fails = [t for t in login_fails[ip] if now - t < 900]
        login_fails[ip] = fails
        if len(fails) >= 6:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        ok, retry = limiter.allow(f"login:{ip}", 10, 60)
        if not ok:
            raise HTTPException(status_code=429, detail="Slow down")
        try:
            body = json.loads((await request.body())[:2048])
            user, pw = str(body.get("username", "")), str(body.get("password", ""))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid body")
        user_ok = hmac.compare_digest(user.encode(), ADMIN_USER.encode())
        try:
            pw_ok = bcrypt.checkpw(pw.encode()[:72], admin_hash if user_ok else dummy_hash)
        except ValueError:
            pw_ok = False
        if not (user_ok and pw_ok):
            login_fails[ip].append(now)
            raise HTTPException(status_code=401, detail="Wrong username or password")
        token = jwt.encode({"sub": "admin", "iat": int(now), "exp": int(now) + JWT_TTL, "jti": secrets.token_hex(8)}, jwt_secret, algorithm="HS256")
        return {"token": token, "expires_in": JWT_TTL}

    async def require_admin(request: Request):
        if not admin_ready:
            raise HTTPException(status_code=503, detail="Admin is not configured on this server")
        h = request.headers.get("authorization", "")
        if not h.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            jwt.decode(h[7:], jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Session expired")
        ok, _ = limiter.allow(f"admin:{client_ip(request)}", 120, 60)
        if not ok:
            raise HTTPException(status_code=429, detail="Slow down")

    def window(frm, to):
        end = parse_day(to, end=True) or datetime.now(timezone.utc) + timedelta(days=1)
        start = parse_day(frm) or end - timedelta(days=30)
        return start, end

    # ------------------------------------------------------------------ admin data
    @router.get("/admin/summary", dependencies=[Depends(require_admin)])
    async def summary(frm: str = "", to: str = ""):
        start, end = window(frm, to)
        q = {"ts": {"$gte": start, "$lt": end}}
        counts = Counter()
        pages, page_ms, page_n = Counter(), Counter(), Counter()
        projects, videos = Counter(), Counter()
        lv = {n: {"starts": 0, "completes": 0, "abandons": 0, "revisits": 0, "complete_ms": [], "time_ms": 0, "time_n": 0} for n in (1, 2, 3, 4)}
        answers = defaultdict(Counter)
        swiper = {"rounds": defaultdict(lambda: {"ok": 0, "fail": 0}), "reasons": Counter(), "sources": Counter()}
        poke_pick, poke_move, battles = Counter(), Counter(), defaultdict(lambda: {"won": 0, "lost": 0})
        audiences, strategies, twists = Counter(), defaultdict(Counter), defaultdict(Counter)
        alloc_sum, alloc_n, pitch_scores = Counter(), 0, []
        daily_sessions, daily_vids, weekly_vids = Counter(), defaultdict(set), defaultdict(set)
        exits = Counter()
        n_events = 0

        async for e in ev.find(q, {"_id": 0}).limit(300000):
            n_events += 1
            t, p = e["t"], e.get("p", {})
            counts[t] += 1
            day = e["ts"].strftime("%Y-%m-%d")
            daily_vids[day].add(e["vid"])
            wk = e["ts"].strftime("%G-W%V")
            weekly_vids[wk].add(e["vid"])
            if t == "session_start":
                daily_sessions[day] += 1
            elif t == "page_view":
                pages[p.get("page", "?")] += 1
            elif t == "page_time":
                pg = p.get("page", "?")
                page_ms[pg] += p.get("ms", 0)
                page_n[pg] += 1
                if pg.startswith("level:") and pg[6:].isdigit() and int(pg[6:]) in lv:
                    lv[int(pg[6:])]["time_ms"] += p.get("ms", 0)
                    lv[int(pg[6:])]["time_n"] += 1
            elif t == "session_end":
                exits[p.get("exit", "?")] += 1
            elif t == "project_open":
                projects[p.get("project", "?")] += 1
            elif t == "video_play":
                videos[p.get("project", "?")] += 1
            elif t in ("level_start", "level_complete", "level_abandon"):
                n = p.get("level")
                if n in lv:
                    key = {"level_start": "starts", "level_complete": "completes", "level_abandon": "abandons"}[t]
                    lv[n][key] += 1
                    if t == "level_start" and p.get("revisit"):
                        lv[n]["revisits"] += 1
                    if t == "level_complete" and p.get("ms"):
                        lv[n]["complete_ms"].append(p["ms"])
            elif t == "mc_answer":
                answers[p.get("question", "?")][f'{p.get("option", "?")} ({p.get("verdict", "-")})'] += 1
            elif t == "swiper_result":
                if not p.get("practice"):
                    r = swiper["rounds"][p.get("round", 0)]
                    r["ok" if p.get("ok") else "fail"] += 1
                    if not p.get("ok"):
                        swiper["reasons"][p.get("reason", "?")] += 1
                    else:
                        swiper["sources"][p.get("source", "text")] += 1
            elif t == "pokemon_pick":
                poke_pick[p.get("pokemon", "?")] += 1
            elif t == "pokemon_attack":
                poke_move[f'{p.get("pokemon", "?")}: {p.get("move", "?")}'] += 1
            elif t == "battle_result":
                battles[p.get("pokemon", "?")]["won" if p.get("won") else "lost"] += 1
            elif t == "audience_pick":
                audiences[p.get("audience", "?")] += 1
            elif t == "strategy_choice":
                strategies[f'stage {p.get("stage", "?")}'][f'{p.get("option", "?")}'] += 1
            elif t == "twist_response":
                twists[p.get("event", "?")][f'{p.get("option", "?")}'] += 1
            elif t == "budget_alloc":
                for k, v in (p.get("alloc") or {}).items():
                    alloc_sum[k] += v
                alloc_n += 1
            elif t == "pitch_submit":
                if "score" in p:
                    pitch_scores.append(p["score"])

        sq = {"start": {"$gte": start, "$lt": end}}
        total_sessions = await sess.count_documents(sq)
        dev, brw, refs = Counter(), Counter(), Counter()
        durations = []
        async for s in sess.find(sq, {"device": 1, "browser": 1, "ref": 1, "start": 1, "last": 1, "vid": 1}):
            dev[s.get("device", "?")] += 1
            brw[s.get("browser", "?")] += 1
            refs[s.get("ref") or "(direct)"] += 1
            if s.get("start") and s.get("last"):
                durations.append((s["last"] - s["start"]).total_seconds())
        active_vids = set()
        async for s in sess.find(sq, {"vid": 1}):
            active_vids.add(s["vid"])
        returning = 0
        if active_vids:
            async for v in vis.find({"_id": {"$in": list(active_vids)}}, {"first_seen": 1, "visits": 1}):
                if v.get("first_seen") and v["first_seen"] < start or v.get("visits", 1) > 1:
                    returning += 1

        def avg(xs):
            return round(sum(xs) / len(xs)) if xs else 0

        def top(c, n=12):
            return [{"key": k, "count": v} for k, v in c.most_common(n)]

        levels = []
        for n, d in lv.items():
            started = d["starts"]
            levels.append({
                "level": n, "starts": started, "completes": d["completes"], "abandons": d["abandons"], "revisits": d["revisits"],
                "completion_rate": round(d["completes"] / started * 100) if started else 0,
                "avg_time_s": round(d["time_ms"] / d["time_n"] / 1000) if d["time_n"] else 0,
                "avg_complete_s": round(avg(d["complete_ms"]) / 1000) if d["complete_ms"] else 0,
            })
        return {
            "range": {"from": start.strftime("%Y-%m-%d"), "to": (end - timedelta(days=1)).strftime("%Y-%m-%d")},
            "retention_days": RETENTION_DAYS,
            "totals": {"events": n_events, "sessions": total_sessions, "unique_visitors": len(active_vids), "returning_visitors": returning, "avg_session_s": avg(durations)},
            "daily": [{"day": d, "sessions": daily_sessions.get(d, 0), "visitors": len(vs)} for d, vs in sorted(daily_vids.items())],
            "weekly": [{"week": w, "visitors": len(vs)} for w, vs in sorted(weekly_vids.items())],
            "pages": [{"page": k, "views": v, "avg_time_s": round(page_ms[k] / page_n[k] / 1000) if page_n[k] else 0} for k, v in pages.most_common(15)],
            "projects": {"opened": top(projects), "videos": top(videos)},
            "levels": levels,
            "exits": top(exits),
            "devices": top(dev), "browsers": top(brw), "referrers": top(refs),
            "answers": {q: top(c) for q, c in answers.items()},
            "swiper": {"rounds": [{"round": r, **v, "success_rate": round(v["ok"] / (v["ok"] + v["fail"]) * 100) if (v["ok"] + v["fail"]) else 0} for r, v in sorted(swiper["rounds"].items())], "failure_reasons": top(swiper["reasons"]), "input_sources": top(swiper["sources"])},
            "pokemon": {"picks": top(poke_pick), "moves": top(poke_move, 15), "battles": [{"pokemon": k, **v, "win_rate": round(v["won"] / (v["won"] + v["lost"]) * 100) if (v["won"] + v["lost"]) else 0} for k, v in battles.items()]},
            "growth": {"audiences": top(audiences), "strategy": {k: top(c) for k, c in strategies.items()}, "twists": {k: top(c) for k, c in twists.items()},
                       "avg_budget": [{"campaign": k, "avg": round(v / alloc_n)} for k, v in alloc_sum.most_common()] if alloc_n else [], "pitch_avg": avg(pitch_scores), "pitches": len(pitch_scores)},
            "event_counts": top(counts, 30),
        }

    @router.get("/admin/visitors", dependencies=[Depends(require_admin)])
    async def visitors(frm: str = "", to: str = "", limit: int = 100):
        start, end = window(frm, to)
        out = []
        async for v in vis.find({"last_seen": {"$gte": start, "$lt": end}}).sort("last_seen", -1).limit(max(1, min(limit, 500))):
            out.append({"vid": v["_id"], "short": v["_id"][:8], "first_seen": v.get("first_seen"), "last_seen": v.get("last_seen"), "visits": v.get("visits", 1),
                        "device": v.get("device"), "browser": v.get("browser"), "consent": v.get("consent")})
        return out

    @router.get("/admin/timeline", dependencies=[Depends(require_admin)])
    async def timeline(vid: str = "", frm: str = "", to: str = "", limit: int = 200):
        start, end = window(frm, to)
        q = {"ts": {"$gte": start, "$lt": end}}
        if vid:
            if not ID_RE.match(vid):
                raise HTTPException(status_code=400, detail="Bad id")
            q["vid"] = vid
        out = []
        async for e in ev.find(q, {"_id": 0}).sort("ts", -1).limit(max(1, min(limit, 1000))):
            out.append({"ts": e["ts"], "visitor": e["vid"][:8], "vid": e["vid"], "type": e["t"], "props": e.get("p", {})})
        return out

    @router.get("/admin/export.csv", dependencies=[Depends(require_admin)])
    async def export_csv(frm: str = "", to: str = "", kind: str = "events"):
        start, end = window(frm, to)
        buf = io.StringIO()
        w = csv.writer(buf)
        if kind == "sessions":
            w.writerow(["session", "visitor", "start", "last", "duration_s", "events", "device", "browser", "referrer", "exit_page", "consent"])
            async for s in sess.find({"start": {"$gte": start, "$lt": end}}).sort("start", 1).limit(100000):
                dur = round((s["last"] - s["start"]).total_seconds()) if s.get("last") and s.get("start") else ""
                w.writerow([csv_safe(x) for x in [s["_id"], s.get("vid"), s.get("start"), s.get("last"), dur, s.get("events"), s.get("device"), s.get("browser"), s.get("ref"), s.get("exit"), s.get("consent")]])
        else:
            w.writerow(["time_utc", "visitor", "session", "event", "properties_json"])
            async for e in ev.find({"ts": {"$gte": start, "$lt": end}}).sort("ts", 1).limit(200000):
                w.writerow([csv_safe(x) for x in [e["ts"].isoformat(), e["vid"], e["sid"], e["t"], json.dumps(e.get("p", {}), separators=(",", ":"))]])
        name = f"akash-exe-{kind}-{start:%Y%m%d}-{(end - timedelta(days=1)):%Y%m%d}.csv"
        return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"})

    @router.delete("/admin/data", dependencies=[Depends(require_admin)])
    async def purge(request: Request):
        try:
            body = json.loads((await request.body())[:2048])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid body")
        if body.get("confirm") != "DELETE":
            raise HTTPException(status_code=400, detail='Send {"confirm": "DELETE"}')
        before = parse_day(body.get("before")) if body.get("before") else None
        qe = {"ts": {"$lt": before}} if before else {}
        qs = {"last": {"$lt": before}} if before else {}
        qv = {"last_seen": {"$lt": before}} if before else {}
        a = await ev.delete_many(qe)
        b = await sess.delete_many(qs)
        c = await vis.delete_many(qv)
        return {"events": a.deleted_count, "sessions": b.deleted_count, "visitors": c.deleted_count}

    return router

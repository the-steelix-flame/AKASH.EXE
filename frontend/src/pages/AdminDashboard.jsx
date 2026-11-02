import { useCallback, useEffect, useState } from "react";

// Private analytics dashboard (/admin). It holds no secrets: the password is checked by the server,
// which returns a short-lived token that lives in sessionStorage only (gone when the tab closes).
const API = `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}/api`;
const TOKEN_KEY = "akash_admin_token";
const iso = (d) => d.toISOString().slice(0, 10);

async function call(path, { token, method = "GET", body } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let d = r.statusText;
    try { d = (await r.json()).detail || d; } catch { /* not json */ }
    const e = new Error(d); e.status = r.status; throw e;
  }
  return r;
}

const fmtS = (s) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="font-display text-2xl font-black text-neon">{value}</div>
      <div className="mt-1 text-[10px] tracking-[0.2em] text-slate-500">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-600">{sub}</div>}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-950 p-4 ${className}`}>
      <h3 className="mb-3 text-[10px] font-bold tracking-[0.3em] text-volt">{title}</h3>
      {children}
    </section>
  );
}

function Rank({ rows, empty = "No data yet" }) {
  if (!rows || !rows.length) return <div className="text-xs text-slate-600">{empty}</div>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className="text-xs">
          <div className="flex justify-between gap-3"><span className="truncate text-slate-300">{r.key}</span><span className="text-slate-400">{r.count}</span></div>
          <div className="mt-0.5 h-1 rounded bg-slate-800"><div className="h-1 rounded bg-neon/70" style={{ width: `${(r.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Table({ cols, rows }) {
  if (!rows.length) return <div className="text-xs text-slate-600">No data yet</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-[9px] tracking-[0.2em] text-slate-500"><tr>{cols.map((c) => <th key={c.k} className="px-2 py-1.5">{c.h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-800 text-slate-300">{cols.map((c) => <td key={c.k} className="px-2 py-1.5">{c.f ? c.f(r) : r[c.k]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Daily({ rows }) {
  if (!rows.length) return <div className="text-xs text-slate-600">No traffic in this range</div>;
  const max = Math.max(...rows.map((r) => Math.max(r.sessions, r.visitors)), 1);
  return (
    <div className="flex h-32 items-end gap-1" role="img" aria-label="Daily sessions and visitors">
      {rows.map((r) => (
        <div key={r.day} className="group relative flex h-full flex-1 items-end justify-center gap-px" title={`${r.day}: ${r.sessions} sessions, ${r.visitors} visitors`}>
          <div className="w-full rounded-t bg-volt/70" style={{ height: `${(r.sessions / max) * 100}%` }} />
          <div className="w-full rounded-t bg-neon/70" style={{ height: `${(r.visitors / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function Login({ onToken }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await call("/admin/login", { method: "POST", body: { username: u, password: p } });
      const { token } = await r.json();
      sessionStorage.setItem(TOKEN_KEY, token);
      onToken(token);
    } catch (e2) { setErr(e2.message || "Login failed"); } finally { setBusy(false); setP(""); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-950 p-6" data-testid="admin-login">
        <h1 className="font-display text-lg font-black text-white">Analytics admin</h1>
        <label className="block text-xs text-slate-400">Username
          <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" className="mt-1 w-full rounded border border-slate-700 bg-void px-3 py-2 text-sm text-white focus:border-neon focus:outline-none" data-testid="admin-user" />
        </label>
        <label className="block text-xs text-slate-400">Password
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" className="mt-1 w-full rounded border border-slate-700 bg-void px-3 py-2 text-sm text-white focus:border-neon focus:outline-none" data-testid="admin-pass" />
        </label>
        {err && <div className="text-xs text-blood" role="alert" data-testid="admin-error">{err}</div>}
        <button disabled={busy || !p} className="w-full rounded-md bg-neon py-2.5 text-xs font-black tracking-widest text-void disabled:opacity-40" data-testid="admin-submit">{busy ? "…" : "SIGN IN"}</button>
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [range, setRange] = useState(() => ({ frm: iso(new Date(Date.now() - 29 * 864e5)), to: iso(new Date()) }));
  const [data, setData] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Analytics";
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
    m.content = "noindex, nofollow";
  }, []);

  const logout = useCallback(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setData(null); }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setErr("");
    const q = `frm=${range.frm}&to=${range.to}`;
    try {
      const [s, v] = await Promise.all([call(`/admin/summary?${q}`, { token }), call(`/admin/visitors?${q}&limit=60`, { token })]);
      setData(await s.json()); setVisitors(await v.json());
    } catch (e) { if (e.status === 401) logout(); else setErr(e.message); } finally { setLoading(false); }
  }, [token, range, logout]);

  useEffect(() => { load(); }, [load]);

  const openTimeline = async (vid) => {
    try { const r = await call(`/admin/timeline?vid=${vid}&frm=${range.frm}&to=${range.to}&limit=300`, { token }); setTimeline({ vid, rows: await r.json() }); } catch (e) { setErr(e.message); }
  };

  const download = async (kind) => {
    try {
      const r = await call(`/admin/export.csv?frm=${range.frm}&to=${range.to}&kind=${kind}`, { token });
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `akash-exe-${kind}-${range.frm}-${range.to}.csv` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setErr(e.message); }
  };

  const purge = async () => {
    const before = window.prompt(`Delete ALL analytics older than this date (YYYY-MM-DD). Leave empty to delete EVERYTHING.`, "");
    if (before === null) return;
    if (window.prompt('Type DELETE to confirm. This cannot be undone.') !== "DELETE") return;
    try { const r = await call("/admin/data", { token, method: "DELETE", body: { confirm: "DELETE", ...(before ? { before } : {}) } }); setErr(`Deleted: ${JSON.stringify(await r.json())}`); load(); } catch (e) { setErr(e.message); }
  };

  if (!token) return <Login onToken={setToken} />;
  const d = data;

  return (
    <div className="min-h-screen bg-void px-4 py-6 text-slate-200 sm:px-8" data-testid="admin-dashboard">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-black text-white">AKASH.EXE <span className="text-neon">analytics</span></h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-slate-400">From <input type="date" value={range.frm} max={range.to} onChange={(e) => setRange((r) => ({ ...r, frm: e.target.value }))} className="ml-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white" data-testid="admin-from" /></label>
            <label className="text-slate-400">To <input type="date" value={range.to} min={range.frm} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="ml-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white" data-testid="admin-to" /></label>
            <button onClick={() => download("events")} className="rounded border border-slate-600 px-3 py-1.5 hover:border-neon hover:text-neon" data-testid="admin-csv-events">CSV: events</button>
            <button onClick={() => download("sessions")} className="rounded border border-slate-600 px-3 py-1.5 hover:border-neon hover:text-neon" data-testid="admin-csv-sessions">CSV: sessions</button>
            <button onClick={purge} className="rounded border border-blood/60 px-3 py-1.5 text-blood hover:bg-blood/10" data-testid="admin-purge">Delete data</button>
            <button onClick={logout} className="rounded border border-slate-600 px-3 py-1.5 hover:border-white" data-testid="admin-logout">Sign out</button>
          </div>
        </header>

        {err && <div className="mb-4 rounded border border-ember/50 bg-ember/10 p-2 text-xs text-ember" role="alert">{err}</div>}
        {loading && !d && <div className="text-xs text-slate-500">Loading…</div>}

        {d && (
          <div className="space-y-4">
            <div className="text-[10px] tracking-widest text-slate-500">{d.range.from} → {d.range.to} · data is deleted after {d.retention_days} days</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="admin-tiles">
              <Tile label="SESSIONS (VISITS)" value={d.totals.sessions} />
              <Tile label="UNIQUE VISITORS" value={d.totals.unique_visitors} />
              <Tile label="RETURNING" value={d.totals.returning_visitors} />
              <Tile label="AVG SESSION" value={fmtS(d.totals.avg_session_s)} />
              <Tile label="EVENTS" value={d.totals.events} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="DAILY TRAFFIC" className="lg:col-span-2">
                <Daily rows={d.daily} />
                <div className="mt-2 flex gap-4 text-[10px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 bg-volt/70" />sessions</span><span><i className="mr-1 inline-block h-2 w-2 bg-neon/70" />visitors</span></div>
              </Card>
              <Card title="WEEKLY VISITORS"><Table cols={[{ k: "week", h: "WEEK" }, { k: "visitors", h: "VISITORS" }]} rows={d.weekly} /></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="MOST VISITED PAGES" className="lg:col-span-2"><Table cols={[{ k: "page", h: "PAGE" }, { k: "views", h: "VIEWS" }, { h: "AVG TIME", k: "t", f: (r) => fmtS(r.avg_time_s) }]} rows={d.pages} /></Card>
              <Card title="DEVICE"><Rank rows={d.devices} /></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="PROJECTS OPENED"><Rank rows={d.projects.opened} /></Card>
              <Card title="PROJECT VIDEOS PLAYED"><Rank rows={d.projects.videos} /></Card>
              <Card title="WHERE VISITORS LEAVE"><Rank rows={d.exits} /></Card>
            </div>

            <Card title="LEVELS: COMPLETION, TIME AND DROP-OFF">
              <Table
                cols={[
                  { k: "level", h: "LEVEL" }, { k: "starts", h: "STARTED" }, { k: "completes", h: "COMPLETED" }, { k: "abandons", h: "ABANDONED" },
                  { h: "COMPLETION", k: "r", f: (r) => `${r.completion_rate}%` }, { h: "AVG TIME ON LEVEL", k: "t", f: (r) => fmtS(r.avg_time_s) },
                  { h: "AVG TO COMPLETE", k: "c", f: (r) => fmtS(r.avg_complete_s) }, { k: "revisits", h: "REVISITS" },
                ]}
                rows={d.levels}
              />
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="SWIPER CHALLENGE">
                <Table cols={[{ k: "round", h: "ROUND" }, { k: "ok", h: "WON" }, { k: "fail", h: "LOST" }, { h: "SUCCESS", k: "s", f: (r) => `${r.success_rate}%` }]} rows={d.swiper.rounds} />
                <div className="mt-3 text-[10px] text-slate-500">FAILURE REASONS</div><Rank rows={d.swiper.failure_reasons} />
                <div className="mt-3 text-[10px] text-slate-500">HOW SUCCESS WAS ENTERED</div><Rank rows={d.swiper.input_sources} />
              </Card>
              <Card title="POKÉMON: PICKS AND MOVES">
                <Rank rows={d.pokemon.picks} />
                <div className="mt-3 text-[10px] text-slate-500">TOP ATTACKS</div><Rank rows={d.pokemon.moves.slice(0, 8)} />
              </Card>
              <Card title="BATTLE OUTCOMES"><Table cols={[{ k: "pokemon", h: "POKÉMON" }, { k: "won", h: "WON" }, { k: "lost", h: "LOST" }, { h: "WIN RATE", k: "w", f: (r) => `${r.win_rate}%` }]} rows={d.pokemon.battles} /></Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="GROWTH: AUDIENCE CHOSEN"><Rank rows={d.growth.audiences} /></Card>
              <Card title="GROWTH: AVERAGE BUDGET (₹)"><Table cols={[{ k: "campaign", h: "CAMPAIGN" }, { k: "avg", h: "AVG ₹" }]} rows={d.growth.avg_budget} />
                <div className="mt-3 text-xs text-slate-400">Pitch score avg: <b className="text-white">{d.growth.pitch_avg}</b> ({d.growth.pitches} pitches)</div></Card>
              <Card title="UNEXPECTED-EVENT RESPONSES">
                {Object.keys(d.growth.twists).length ? Object.entries(d.growth.twists).map(([k, rows]) => <div key={k} className="mb-3"><div className="mb-1 text-[10px] text-slate-500">{k}</div><Rank rows={rows} /></div>) : <div className="text-xs text-slate-600">No data yet</div>}
              </Card>
            </div>

            <Card title="MOST COMMON ANSWERS">
              {Object.keys(d.answers).length ? <div className="grid gap-4 md:grid-cols-2">{Object.entries(d.answers).map(([q, rows]) => <div key={q}><div className="mb-1 text-[10px] text-slate-500">{q}</div><Rank rows={rows} /></div>)}</div> : <div className="text-xs text-slate-600">No answers recorded yet (only visitors who allowed all analytics)</div>}
              {Object.entries(d.growth.strategy).map(([k, rows]) => <div key={k} className="mt-4"><div className="mb-1 text-[10px] text-slate-500">STRATEGY CHOICES: {k}</div><Rank rows={rows} /></div>)}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="BROWSERS"><Rank rows={d.browsers} /></Card>
              <Card title="REFERRERS"><Rank rows={d.referrers} /></Card>
            </div>

            <Card title="VISITORS (ANONYMOUS IDS). CLICK ONE FOR THEIR TIMELINE">
              <Table
                cols={[{ k: "short", h: "ID", f: (r) => <button onClick={() => openTimeline(r.vid)} className="text-volt underline" data-testid={`visitor-${r.short}`}>{r.short}</button> },
                  { h: "VISITS", k: "visits" }, { h: "DEVICE", k: "device" }, { h: "BROWSER", k: "browser" }, { h: "CONSENT", k: "consent" },
                  { h: "FIRST SEEN", k: "first_seen", f: (r) => (r.first_seen || "").slice(0, 16).replace("T", " ") }, { h: "LAST SEEN", k: "last_seen", f: (r) => (r.last_seen || "").slice(0, 16).replace("T", " ") }]}
                rows={visitors}
              />
            </Card>

            {timeline && (
              <Card title={`ACTIVITY TIMELINE: ${timeline.vid.slice(0, 8)}`}>
                <button onClick={() => setTimeline(null)} className="mb-2 text-xs text-slate-400 hover:text-white">Close</button>
                <Table cols={[{ h: "TIME (UTC)", k: "ts", f: (r) => String(r.ts).slice(0, 19).replace("T", " ") }, { k: "type", h: "EVENT" }, { h: "DETAILS", k: "props", f: (r) => JSON.stringify(r.props) }]} rows={timeline.rows} />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

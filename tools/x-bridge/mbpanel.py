#!/usr/bin/env python3
"""Market Bubble — X bridge control panel.

A local browser dashboard so nobody has to live in Terminal:
  • one switch turns the whole bridge on/off (helper + caffeinate included)
  • paste an X broadcast URL → it opens in its own Chrome window, set up right
  • live per-stream status, same data as the terminal HUD

Run: ./mb-panel.command   →   http://localhost:8765   (localhost only)
The bridge itself is unchanged — this supervises `xchat-watch.py` and reads
the state file it publishes each cycle (/tmp/mb_bridge_state.json).
"""
import http.server, json, os, re, signal, subprocess, threading, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
STATE = "/tmp/mb_bridge_state.json"
KEYFILE = os.path.join(HERE, ".ingest-key")
HELPER = "/Applications/MBCapture.app"
X_URL = re.compile(r"^https://(x|twitter)\.com/\S+$")

bridge = None          # the xchat-watch.py subprocess
caff = None            # the caffeinate subprocess
desired_on = False
lock = threading.Lock()


def helper_running():
    return subprocess.run(["pgrep", "-f", "MBCapture.app/Contents/MacOS/MBCapture"],
                          capture_output=True).returncode == 0


def read_key():
    try:
        with open(KEYFILE) as f: return f.read().strip()
    except OSError: return ""


def bridge_state():
    try:
        with open(STATE) as f: s = json.load(f)
        s["fresh"] = (time.time() - s.get("t", 0)) < 30
        return s
    except Exception:
        return None


def start_bridge():
    global bridge, caff, desired_on
    with lock:
        desired_on = True
        if bridge and bridge.poll() is None: return "already running"
        key = read_key()
        if not key: return "no ingest key saved"
        if os.path.isdir(HELPER) and not helper_running():
            subprocess.run(["open", "-g", HELPER])
        try: os.remove(STATE)
        except OSError: pass
        env = dict(os.environ, MB_INGEST_KEY=key)
        bridge = subprocess.Popen(["python3", os.path.join(HERE, "xchat-watch.py")],
                                  cwd=HERE, env=env,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if caff is None or caff.poll() is not None:
            caff = subprocess.Popen(["caffeinate", "-dis"])
        return "started"


def stop_bridge():
    global bridge, caff, desired_on
    with lock:
        desired_on = False
        if bridge and bridge.poll() is None:
            bridge.send_signal(signal.SIGINT)
            try: bridge.wait(timeout=5)
            except subprocess.TimeoutExpired: bridge.kill()
        if caff and caff.poll() is None:
            caff.kill()
        return "stopped"


def watchdog():
    """If the switch is ON and the bridge died, bring it back (5s backoff)."""
    while True:
        time.sleep(5)
        if desired_on and (bridge is None or bridge.poll() is not None):
            start_bridge()


PAGE = """<!doctype html><html><head><meta charset="utf-8">
<title>Market Bubble — Bridge</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap" rel="stylesheet">
<style>
  :root { --bg:#1a1917; --panel:#22211e; --line:#3a3833; --text:#f4efe4; --dim:#a59f8f;
          --up:#5aa873; --down:#cc5a45; --warn:#d4a04b; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); min-height:100vh;
         font:15px/1.5 ui-monospace, "SF Mono", Menlo, monospace; padding:48px 20px; }
  .sheet { max-width:680px; margin:0 auto; }
  h1 { font-family:"Playfair Display", Georgia, serif; font-weight:700; font-size:42px;
       letter-spacing:-0.01em; }
  h1 em { font-style:italic; font-weight:500; }
  .rule { border-top:1px solid var(--line); margin:18px 0 26px; position:relative; }
  .rule::after { content:""; position:absolute; top:2px; left:0; right:0;
                 border-top:1px solid var(--line); }
  .row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
  /* the switch */
  .power { background:var(--panel); border:1px solid var(--line); border-radius:10px;
           padding:22px 24px; margin-bottom:18px; }
  .power .label { font-family:"Playfair Display", Georgia, serif; font-size:22px; }
  .power .sub { color:var(--dim); font-size:12.5px; margin-top:3px; }
  .switch { position:relative; width:84px; height:40px; border-radius:24px; cursor:pointer;
            background:var(--line); transition:background .25s; flex:none; border:none; }
  .switch::after { content:""; position:absolute; top:4px; left:4px; width:32px; height:32px;
                   border-radius:50%; background:var(--text); transition:left .25s; }
  .switch.on { background:var(--up); }
  .switch.on::after { left:48px; }
  .switch.busy { opacity:.5; pointer-events:none; }
  /* streams */
  .streams { background:var(--panel); border:1px solid var(--line); border-radius:10px;
             padding:8px 24px; margin-bottom:18px; }
  .stream { display:flex; align-items:baseline; gap:14px; padding:13px 0;
            border-bottom:1px dashed var(--line); }
  .stream:last-child { border-bottom:none; }
  .dot { width:9px; height:9px; border-radius:50%; flex:none; align-self:center; }
  .ok .dot { background:var(--up); box-shadow:0 0 8px var(--up); }
  .warn .dot { background:var(--warn); }
  .bad .dot { background:var(--down); }
  .stream .name { font-family:"Playfair Display", Georgia, serif; font-size:17px; min-width:130px; }
  .stream .note { color:var(--dim); font-size:12.5px; }
  .stream .watch { margin-left:auto; color:var(--dim); font-size:12.5px; white-space:nowrap; }
  .empty { color:var(--dim); padding:16px 0; font-size:13px; }
  /* url box */
  .openbox { background:var(--panel); border:1px solid var(--line); border-radius:10px;
             padding:18px 24px; margin-bottom:18px; }
  .openbox .hint { color:var(--dim); font-size:12.5px; margin-bottom:10px; }
  .openbox form { display:flex; gap:10px; }
  input[type=text] { flex:1; background:var(--bg); color:var(--text); border:1px solid var(--line);
          border-radius:8px; padding:10px 12px; font:inherit; font-size:13px; }
  input:focus { outline:1px solid var(--dim); }
  button.go { background:var(--text); color:var(--bg); border:none; border-radius:8px;
              padding:10px 18px; font:inherit; font-weight:700; cursor:pointer; }
  button.go:active { transform:translateY(1px); }
  /* footer strip */
  .meta { display:flex; gap:22px; color:var(--dim); font-size:12px; flex-wrap:wrap; }
  .meta b { color:var(--text); font-weight:600; }
  .events { margin-top:14px; color:var(--dim); font-size:12px; white-space:pre-wrap; }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
           background:var(--text); color:var(--bg); padding:10px 18px; border-radius:8px;
           font-size:13px; opacity:0; transition:opacity .3s; pointer-events:none; }
  .toast.show { opacity:1; }
  .keybox { margin-top:8px; }
</style></head><body>
<div class="sheet">
  <h1>The <em>Bridge</em></h1>
  <div class="rule"></div>

  <div class="power row">
    <div>
      <div class="label">Chat capture</div>
      <div class="sub" id="powersub">…</div>
    </div>
    <button class="switch" id="sw" onclick="toggle()"></button>
  </div>

  <div class="streams" id="streams"><div class="empty">…</div></div>

  <div class="openbox">
    <div class="hint">Paste an X broadcast link — it opens in its own Chrome window, ready for capture. Fullscreen it after.</div>
    <form onsubmit="openUrl(event)">
      <input type="text" id="url" placeholder="https://x.com/i/broadcasts/…" autocomplete="off">
      <button class="go">Open</button>
    </form>
    <div class="keybox" id="keybox" style="display:none">
      <div class="hint">One-time: paste the ingest key to let the bridge talk to the hub.</div>
      <form onsubmit="saveKey(event)">
        <input type="text" id="key" placeholder="ingest key" autocomplete="off">
        <button class="go">Save</button>
      </form>
    </div>
  </div>

  <div class="meta" id="meta"></div>
  <div class="events" id="events"></div>
</div>
<div class="toast" id="toast"></div>
<script>
let busy=false;
function toast(m){const t=document.getElementById('toast');t.textContent=m;
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',
  headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  return r.json();}
async function toggle(){if(busy)return;busy=true;
  const sw=document.getElementById('sw');sw.classList.add('busy');
  const on=sw.classList.contains('on');
  const r=await api(on?'/stop':'/start',{});
  if(r.error)toast(r.error);
  await refresh();sw.classList.remove('busy');busy=false;}
async function openUrl(e){e.preventDefault();
  const u=document.getElementById('url');
  const r=await api('/open',{url:u.value.trim()});
  toast(r.error||'Window opened — fullscreen it whenever');if(!r.error)u.value='';}
async function saveKey(e){e.preventDefault();
  const k=document.getElementById('key');
  const r=await api('/key',{key:k.value.trim()});
  toast(r.error||'Key saved');k.value='';refresh();}
function fmtAge(s){return s<90?Math.round(s)+'s':Math.round(s/60)+'m';}
async function refresh(){
  const s=await api('/state');
  const sw=document.getElementById('sw');
  sw.classList.toggle('on',s.running);
  document.getElementById('keybox').style.display=s.key_saved?'none':'';
  const sub=document.getElementById('powersub');
  sub.textContent=s.running
    ?(s.bridge&&s.bridge.fresh?(s.bridge.mbcap?'on — capturing via MBCapture (fullscreen anywhere is fine)':'on — LEGACY capture: helper down, windows must stay on this desktop'):'on — starting up…')
    :(s.key_saved?'off — nothing is being read or pushed':'off — save the ingest key below first');
  const el=document.getElementById('streams');
  const st=(s.bridge&&s.bridge.fresh)?s.bridge.streams:{};
  const names=Object.keys(st).sort();
  if(!s.running){el.innerHTML='<div class="empty">Flip the switch, then open each broadcast below.</div>';}
  else if(!names.length){el.innerHTML='<div class="empty">No broadcast windows found yet — open them below. Each in its own window; fullscreen is fine, minimized is not.</div>';}
  else{
    const now=s.now;
    el.innerHTML=names.map(n=>{
      const v=st[n];
      const age=v.last_msg?now-v.last_msg:null;
      let cls='ok',note='last chat '+(age!==null?fmtAge(age)+' ago':'—');
      if(!v.ok){cls='bad';note='window lost — reopen the broadcast';}
      else if(v.frozen){cls='warn';note='frames frozen — window minimized? un-minimize it (fullscreen is fine)';}
      else if(age===null){cls='warn';note='capturing, no chat read yet';}
      else if(age>120){cls='warn';note='no new chat for '+fmtAge(age);}
      const w=v.watching?v.watching.toLocaleString()+' watching':'';
      return '<div class="stream '+cls+'"><span class="dot"></span><span class="name">'+n+
        '</span><span class="note">'+note+'</span><span class="watch">'+w+'</span></div>';
    }).join('');
  }
  const m=document.getElementById('meta');
  if(s.bridge&&s.bridge.fresh){
    const up=Math.round((s.now-s.bridge.started)/60);
    m.innerHTML='<span>up <b>'+up+'m</b></span><span>pushed <b>'+s.bridge.pushed+
      '</b> msgs</span><span>helper <b>'+(s.helper?'running':'stopped')+'</b></span>'+
      (s.bridge.push_err?'<span style="color:var(--down)">push error: '+s.bridge.push_err+'</span>':'');
  } else {
    m.innerHTML='<span>helper <b>'+(s.helper?'running':'stopped')+'</b></span>';
  }
  document.getElementById('events').textContent=
    (s.bridge&&s.bridge.fresh&&s.bridge.events)?s.bridge.events.slice(-4).join('\\n'):'';
}
refresh();setInterval(refresh,2000);
</script></body></html>"""


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("content-length") or 0)
        try: return json.loads(self.rfile.read(n) or b"{}")
        except Exception: return {}

    def do_GET(self):
        if self.path == "/":
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("content-type", "text/html; charset=utf-8")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/state":
            running = desired_on and bridge is not None and bridge.poll() is None
            self._json({"running": running, "helper": helper_running(),
                        "key_saved": bool(read_key()), "bridge": bridge_state(),
                        "now": time.time()})
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path == "/start":
            r = start_bridge()
            self._json({"error": r} if r == "no ingest key saved" else {"ok": r})
        elif self.path == "/stop":
            self._json({"ok": stop_bridge()})
        elif self.path == "/open":
            url = (self._body().get("url") or "").strip()
            if not X_URL.match(url):
                self._json({"error": "that's not an x.com link"}); return
            subprocess.run(["open", "-na", "Google Chrome", "--args", "--new-window", url])
            self._json({"ok": "opened"})
        elif self.path == "/key":
            key = (self._body().get("key") or "").strip()
            if not key:
                self._json({"error": "empty key"}); return
            with open(KEYFILE, "w") as f: f.write(key)
            os.chmod(KEYFILE, 0o600)
            self._json({"ok": "saved"})
        else:
            self._json({"error": "not found"}, 404)


def main():
    threading.Thread(target=watchdog, daemon=True).start()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Market Bubble bridge panel → http://localhost:{PORT}")
    try:
        srv.serve_forever()
    finally:
        stop_bridge()


if __name__ == "__main__":
    main()

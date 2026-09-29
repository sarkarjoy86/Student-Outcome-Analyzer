import os, sys, time, json, argparse, statistics, subprocess, datetime, threading
import httpx

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, ".."))
DEFAULT_URL = "https://student-outcome-analyzer-ml.onrender.com"
Q = "Explain how inheritance and polymorphism help in designing reusable classes. Illustrate with a C++ example."
COS = [{"code": "CO1", "description": "Understand the fundamental concepts of object-oriented programming such as classes and objects."},
       {"code": "CO2", "description": "Apply inheritance, polymorphism and abstraction to design reusable software components."},
       {"code": "CO3", "description": "Analyze exception handling and file operations in object-oriented programs."},
       {"code": "CO4", "description": "Design and implement small object-oriented applications using templates and the STL."}]
SIM = {"currentPaperText": "1. Explain the working principle of bubble sort with an example.\n2. Define a binary search tree and write the insertion algorithm.\n3. Compare BFS and DFS.",
       "archivedPapers": [{"id": "a1", "assessmentName": "Midterm", "semester": "Spring 2025",
                           "text": "1. Describe bubble sort and show each pass for the array 5 1 4 2 8.\n2. What is a heap? Build a max heap."},
                          {"id": "a2", "assessmentName": "Final", "semester": "Fall 2024",
                           "text": "1. Explain TCP three-way handshake.\n2. Differentiate between circuit switching and packet switching."}]}
ENDPOINTS = [("GET", "/health", None), ("POST", "/suggest-metadata", {"questionText": Q, "courseOutcomes": COS}),
             ("POST", "/similarity-check", SIM)]

def stats(v):
    if not v: return {}
    s = sorted(v); p95 = s[min(len(s) - 1, int(round(0.95 * (len(s) - 1))))]
    return {"n": len(v), "mean": statistics.mean(v), "sd": statistics.stdev(v) if len(v) > 1 else 0.0,
            "median": statistics.median(v), "p95": p95, "min": s[0], "max": s[-1]}

def call(client, method, url, body, timeout):
    t0 = time.perf_counter()
    try:
        r = client.request(method, url, json=body, timeout=timeout)
        ok = r.status_code == 200
    except Exception as e:
        ok, r = False, None
    return time.perf_counter() - t0, ok, (r.status_code if r is not None else "ERR")

def live(base, n, out_rows):
    res = {"url": base}
    with httpx.Client() as c:
        print(f"[live] cold-start probe: GET {base}/health")
        dt, ok, code = call(c, "GET", base + "/health", None, 180)
        res["cold_start_health_s"] = {"seconds": dt, "ok": ok, "status": code}
        dt2, ok2, code2 = call(c, "POST", base + "/suggest-metadata", ENDPOINTS[1][2], 180)
        res["first_inference_s"] = {"seconds": dt2, "ok": ok2, "status": code2}
        print(f"   health {dt:.2f}s  first inference {dt2:.2f}s")
        for method, path, body in ENDPOINTS:
            times, oks = [], 0
            for i in range(n):
                dt, ok, code = call(c, method, base + path, body, 120)
                out_rows.append((path, i + 1, round(dt, 4), ok, code))
                if ok: times.append(dt); oks += 1
                time.sleep(0.5)
            res[path] = {**stats(times), "success_rate": oks / n}
            s = res[path]
            print(f"   {path:20s} mean {s.get('mean', 0):.3f}s +/- {s.get('sd', 0):.3f}  p95 {s.get('p95', 0):.3f}s  ok {oks}/{n}")
    return res

def rss_tree(pid):
    import psutil
    try:
        p = psutil.Process(pid); total = p.memory_info().rss
        for ch in p.children(recursive=True):
            try: total += ch.memory_info().rss
            except Exception: pass
        return total
    except Exception:
        return 0

def local_memory(n_req, port=8765):
    env = dict(os.environ)
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(port), "--log-level", "warning"],
                            cwd=ROOT, env=env)
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(120):
            try:
                if httpx.get(base + "/health", timeout=2).status_code == 200: break
            except Exception: time.sleep(0.5)
        time.sleep(2)
        idle = [rss_tree(proc.pid) for _ in range(5) if not time.sleep(0.4)]
        peak = [0]; stop = [False]
        def sampler():
            while not stop[0]:
                peak[0] = max(peak[0], rss_tree(proc.pid)); time.sleep(0.1)
        th = threading.Thread(target=sampler); th.start()
        oks = 0
        with httpx.Client() as c:
            for i in range(n_req):
                for method, path, body in ENDPOINTS[1:]:
                    _, ok, _ = call(c, method, base + path, body, 120); oks += ok
        stop[0] = True; th.join()
        after = rss_tree(proc.pid)
        mb = lambda b: round(b / 1024 / 1024, 2)
        return {"idle_rss_mb": mb(statistics.mean(idle)), "peak_rss_mb_during_requests": mb(peak[0]),
                "rss_after_requests_mb": mb(after), "requests_sent": 2 * n_req, "requests_ok": oks,
                "hf_token_set": bool(os.getenv("HF_TOKEN"))}
    finally:
        proc.terminate()
        try: proc.wait(10)
        except Exception: proc.kill()

BASELINE_CODE = r"""
import os, psutil, json, time
t0=time.time()
from sentence_transformers import SentenceTransformer
from transformers import pipeline
m=SentenceTransformer("obe-ai-system/sbert-obe-csematch", device="cpu")
z=pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-3", device=-1)
m.encode(["warm up"]); z("Explain bubble sort.", ["Remember","Understand","Apply","Analyze","Evaluate","Create"])
print(json.dumps({"rss_mb": psutil.Process().memory_info().rss/1024/1024, "load_seconds": time.time()-t0}))
"""

def baseline():
    r = subprocess.run([sys.executable, "-c", BASELINE_CODE], capture_output=True, text=True)
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return {"error": (r.stderr or r.stdout)[-800:]}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=os.getenv("ML_SERVICE_URL", DEFAULT_URL))
    ap.add_argument("-n", type=int, default=30, help="warm requests per endpoint (live)")
    ap.add_argument("--local-requests", type=int, default=10)
    ap.add_argument("--skip-live", action="store_true"); ap.add_argument("--skip-local", action="store_true")
    ap.add_argument("--baseline", action="store_true")
    a = ap.parse_args()
    try:
        from dotenv import load_dotenv; load_dotenv(os.path.join(ROOT, ".env"))
    except Exception: pass
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.join(HERE, "results", f"perf_{stamp}"); os.makedirs(out, exist_ok=True)
    R = {"generated": stamp}; rows = []; md = [f"# Performance benchmark -- {stamp}\n"]
    if not a.skip_live:
        R["live"] = live(a.url, a.n, rows)
        L = R["live"]
        md += [f"## 1. Live latency -- {a.url}\n",
               f"- Cold-start probe (/health, first call): **{L['cold_start_health_s']['seconds']:.2f} s** (status {L['cold_start_health_s']['status']})",
               f"- First inference after wake-up (/suggest-metadata): **{L['first_inference_s']['seconds']:.2f} s**\n",
               "| Endpoint | n ok | Mean +/- SD (s) | Median | p95 | Min | Max | Success |", "|---|---|---|---|---|---|---|---|"]
        for _, p, _ in ENDPOINTS:
            s = L[p]
            if s.get("n"):
                md.append(f"| {p} | {s['n']} | {s['mean']:.3f} +/- {s['sd']:.3f} | {s['median']:.3f} | {s['p95']:.3f} | {s['min']:.3f} | {s['max']:.3f} | {s['success_rate']*100:.0f}% |")
            else:
                md.append(f"| {p} | 0 | -- | -- | -- | -- | -- | 0% |")
        with open(os.path.join(out, "raw_latency.csv"), "w") as f:
            f.write("endpoint,run,seconds,ok,status\n"); f.writelines(",".join(map(str, r)) + "\n" for r in rows)
    if not a.skip_local:
        print("[local] starting uvicorn main:app to measure memory ...")
        R["local_memory"] = m = local_memory(a.local_requests)
        md += ["\n## 2. Local memory of the serverless ML service\n",
               f"- Idle RSS: **{m['idle_rss_mb']} MB**", f"- Peak RSS during {m['requests_sent']} requests: **{m['peak_rss_mb_during_requests']} MB** (ok: {m['requests_ok']})",
               f"- RSS after requests: {m['rss_after_requests_mb']} MB  (HF_TOKEN set: {m['hf_token_set']})"]
    if a.baseline:
        print("[baseline] loading SBERT + DistilBART locally (can take several minutes) ...")
        R["baseline_local_models"] = b = baseline()
        md += ["\n## 3. Old design baseline (models loaded locally with PyTorch)\n", f"- {b}"]
    md.append("\n## Machine\n- " + f"Python {sys.version.split()[0]} on {sys.platform}")
    json.dump(R, open(os.path.join(out, "results.json"), "w"), indent=2)
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(md))
    print("\n".join(md)); print(f"\nSaved to: {out}")

if __name__ == "__main__":
    main()

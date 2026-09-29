# Performance benchmark -- 20260930_015754

## 1. Live latency -- https://student-outcome-analyzer-ml.onrender.com

- Cold-start probe (/health, first call): **0.17 s** (status 200)
- First inference after wake-up (/suggest-metadata): **3.17 s**

| Endpoint | n ok | Mean +/- SD (s) | Median | p95 | Min | Max | Success |
|---|---|---|---|---|---|---|---|
| /health | 30 | 0.076 +/- 0.024 | 0.073 | 0.087 | 0.064 | 0.202 | 100% |
| /suggest-metadata | 30 | 1.753 +/- 0.090 | 1.754 | 1.890 | 1.603 | 1.963 | 100% |
| /similarity-check | 30 | 4.080 +/- 0.251 | 4.030 | 4.550 | 3.727 | 4.601 | 100% |

## 2. Local memory of the serverless ML service

- Idle RSS: **84.61 MB**
- Peak RSS during 20 requests: **109.89 MB** (ok: 20)
- RSS after requests: 100.81 MB  (HF_TOKEN set: True)

## Machine
- Python 3.13.14 on win32
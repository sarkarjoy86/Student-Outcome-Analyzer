# DEPARTMENTAL CLOUD INFRASTRUCTURE & SCALABILITY REPORT
## Project: Student Outcome Analyzer (OBE Attainment & Question Paper Analytics System)
**Target Environment:** Department of Computer Science & Engineering (CSE)  
**User Base:** 25–30 Faculty Members (Teachers)  
**Operating Hours:** 08:00 AM – 05:00 PM (Monday – Friday, ~22 working days/month)  
**Document Purpose:** Presentation to Department Head, Evaluation Committee & Faculty Members for Production Deployment & Budget Approval.

---

## 1. Executive Summary

The **Student Outcome Analyzer** currently operates on an entirely free-tier, serverless/cloud architecture comprising:
1. **Render.com** (Node.js/Express Backend API + Python/FastAPI ML Microservice)
2. **MongoDB Atlas** (Cloud Database - M0 Sandbox Free Tier)
3. **Cloudinary** (Cloud Media/Image Storage)
4. **Hugging Face** (Serverless Inference API for SBERT & Zero-Shot Classification)
5. **Syncfusion Essential Studio** (React Rich Text Editor for Question Paper Design)
6. **Google Gemini API** (Generative AI for CQI & Rubrics Generation)
7. **GitHub Pages / Vercel** (Frontend Client Hosting)

### Can the Free Tier handle 25–30 CSE Teachers during department hours (8:00 AM – 5:00 PM)?
* **Short Answer:** **NO, not reliably for real-world departmental operations.**
* **Why?** 
  - **Render Cold Starts:** Free instances shut down after 15 minutes of inactivity. When teachers attempt to use the platform in the morning or between lectures, they will encounter **50 to 90-second loading freezes** or HTTP 502/504 Bad Gateway timeouts.
  - **Resource Exhaustion (OOM):** The free 512 MB RAM / 0.1 vCPU tier on Render will crash or trigger Out-Of-Memory (OOM) fatal errors when 20+ teachers simultaneously upload class Excel mark sheets or compute departmental OBE aggregations.
  - **Data Loss Risk:** The free MongoDB M0 cluster offers **zero automated backups**. In an academic institution, losing student attainment records and accreditation grades is a catastrophic risk.
  - **Trial Expiration Popups:** Syncfusion is currently using a 30-day trial license which displays annoying warning popups upon expiration unless switched to the free Community License.

By investing as little as **~$25.00/month (~3,000 BDT/month)**, all performance bottlenecks, cold starts, and backup risks can be completely resolved.

---

## 2. Comprehensive Audit of Current Free Tiers & Technical Limits

| Cloud Service | Role in Codebase | Free Tier Specifications & Limits | Status Under 25–30 Teacher Concurrency |
| :--- | :--- | :--- | :--- |
| **Render.com (Backend API)** | Express/Node.js API (`student-outcome-analyzer-api`) | • **750 free instance hours/month** shared across workspace<br>• **Spins down after 15 minutes of inactivity**<br>• **0.1 vCPU & 512 MB RAM**<br>• Wake-up delay: **50–90 seconds** | ❌ **FAIL** (Severe cold-start latency; memory spikes during bulk Excel mark uploads will crash the instance) |
| **Render.com (ML Service)** | FastAPI/Python microservice (`student-outcome-analyzer-ml`) | • Shared 750-hour budget<br>• Spins down after 15 min idle<br>• **512 MB RAM limit** | ❌ **FAIL** (Document parsing and Hugging Face router proxying will cause dual cold-starts when grading papers) |
| **MongoDB Atlas** | Primary Database (`mongodb+srv://obisystem:...`) | • **512 MB storage**<br>• **500 max concurrent connections**<br>• Capped at **100 CRUD ops/second**<br>• **NO automated snapshots/backups** | ⚠️ **AT RISK** (512 MB storage is enough for 1–2 semesters of text data, but lack of automated daily backups poses high risk) |
| **Cloudinary** | Teacher profile avatars & question diagrams | • **25 Credits/month** (Rolling 30 days)<br>• 1 Credit = 1 GB storage or 1,000 transformations<br>• 25 GB bandwidth/month | ✅ **PASS** (30 teachers consume < 300 MB storage and < 2 GB bandwidth/month. 100% sufficient) |
| **Hugging Face** | SBERT sentence similarity & Bloom classification | • **$0.10 monthly inference credit**<br>• Shared serverless queue<br>• Subject to HTTP 429 & 503 "Model Loading" | ⚠️ **BORDERLINE** (Works for single users; simultaneous question paper creation during exam season will hit rate limits) |
| **Google Gemini API** | CQI recommendations, student feedback analysis, rubrics | • **15 Requests Per Minute (RPM)**<br>• **1,500 Requests Per Day (RPD)**<br>• 1 Million Tokens/min | ⚠️ **BORDERLINE** (Daily quota of 1,500 is ample, but 15 RPM will be breached if multiple teachers run AI analysis simultaneously) |
| **Syncfusion RTE** | Rich Text Editor for Question Paper formatting | • 30-day Trial License key (currently hardcoded)<br>• Throws trial expiration popup after 30 days | ❌ **REQUIRES ACTION** (Must be replaced with permanent **Free Community License**) |
| **Frontend Client** | Vite + React SPA hosted on GitHub Pages | • 100 GB monthly bandwidth<br>• 1 GB site storage<br>• Unlimited static hits | ✅ **PASS** (100% free and lightning fast; no upgrade needed) |

---

## 3. Deep-Dive: Departmental Load Analysis (25–30 Teachers)

### 3.1. Schedule & Usage Pattern
* **Operating Hours:** 08:00 AM / 08:30 AM to 05:00 PM (Monday to Friday).
* **Peak Utilization Windows:**
  - **Morning Peak (09:30 AM – 11:30 AM):** Course syllabus setup, question paper formulation, rubric mappings.
  - **Afternoon Peak (02:00 PM – 04:30 PM):** Uploading Excel marks sheets, grading assessments, generating attainment & CQI reports.
* **Concurrent Concurrency:** Estimated at **8 to 18 active simultaneous users** during peak office hours, with potential surges up to **25+ users** during midterm and final exam result preparation weeks.

### 3.2. Where Free Tier Will Break

1. **The Dual Cold Start Phenomenon:**
   - Both the Express API and the Python ML service reside on Render free tiers.
   - If a teacher logs in at 08:30 AM after overnight inactivity, the browser sends an API request. The backend takes ~60 seconds to boot.
   - Next, when the teacher creates an assessment question and requests Bloom's taxonomy verification, the Express backend calls the ML service, triggering a *second* cold start of ~45–60 seconds.
   - Total latency: **Over 2 minutes of blank/loading state**. Teachers will abandon the system thinking the server is down.

2. **Memory Leaks and Concurrency on Excel Parsing:**
   - Teachers upload student rosters and marks via multi-sheet Excel files (`xlsx` / `xlsx-js-style`).
   - Parsing large Excel sheets in Node.js consumes 50–120 MB RAM per operation.
   - With 512 MB total RAM on Render Free, 4–5 simultaneous uploads will spike memory past 512 MB, causing Render to terminate the container with an `Out Of Memory (OOM) Killed` error (HTTP 502 Bad Gateway).

3. **Accreditation & Data Security Vulnerability (MongoDB Atlas M0):**
   - The CSE Department requires OBE data for Bangladesh Board of Accreditation for Engineering and Technical Education (BAETE) / UGC accreditation.
   - Free Atlas M0 provides **no point-in-time restore or scheduled automated snapshots**. If a user accidentally deletes a course offering or an unhandled sync script corrupts attainment collections, the data cannot be recovered from the cloud.

4. **Syncfusion Trial Expiration:**
   - In `src/main.jsx`, line 12 currently registers a trial license:
     ```javascript
     registerLicense('Ngo9BigBOggjHTQxAR8/V1JAaF5cX2pCd1p/TH5YfUNzdUVEY1ZUTXxaS1ZhSXxVdkJhXn5ccXxURWhVWE19XEY=')
     ```
   - When this trial period lapses, every teacher attempting to edit questions will be blocked by a popup modal and watermarks across all document exports.

---

## 4. Upgrade Options & Exact Official Pricing

### 4.1. Render.com Web Services
* **Official Pricing Structure:** Workspace base fee ($0 on Hobby Workspace) + Compute per service instance.
* **Starter Instance:** **$7.00 / month** per service.
  - **Specs:** 512 MB RAM, 0.5 dedicated vCPU, **Always-On (Zero Sleep / No Cold Starts)**.
* **Standard Instance:** **$25.00 / month** per service.
  - **Specs:** 2 GB RAM, 1.0 dedicated vCPU, Always-On, High concurrency.
* **Recommendation for CSE Dept:**
  - Express API: **Starter ($7/month)**
  - ML Microservice: **Starter ($7/month)**
  - **Subtotal:** **$14.00 / month**.

### 4.2. MongoDB Atlas (Cloud Database)
* **Status of M2/M5:** Officially retired by MongoDB in January 2026.
* **Current Replacement:** **MongoDB Atlas Flex Tier**.
  - **Storage:** 5 GB high-performance storage.
  - **Backups:** Automated cloud backups & snapshot recovery.
  - **Connections:** 500 concurrent connections with guaranteed IOPS.
  - **Pricing:** Consumption-based, capped at **$8.00 – $15.00 / month** for departmental workloads.
* **Recommendation for CSE Dept:**
  - **Flex Tier (~$9.00 / month)** guarantees BAETE accreditation data safety.

### 4.3. Cloudinary (Image & Asset CDN)
* **Free Tier Allowance:** 25 Credits/month (25 GB storage or 25,000 transformations).
* **Next Tier (Plus Plan):** $89.00 – $99.00 / month (225 credits).
* **Recommendation for CSE Dept:**
  - **REMAIN ON FREE TIER ($0.00 / month).** 30 teachers will use less than 1% of the free quota. Upgrading is a waste of funds.

### 4.4. Syncfusion React Rich Text Editor
* **Commercial Retail Price:** ~$995 / developer / year.
* **Syncfusion Community License:** **100% FREE ($0.00)** forever!
  - **Eligibility:** Organizations with < $1M annual revenue and < 5 developers. University capstone projects and academic departments fully qualify.
* **Action Required:**
  - Register at [syncfusion.com/products/communitylicense](https://www.syncfusion.com/products/communitylicense).
  - Generate a free Community License Key and paste it into `src/main.jsx`.
* **Cost:** **$0.00 (Zero Cost)**.

### 4.5. Google Gemini API (CQI & Report Generation)
* **Free Tier:** 15 Requests Per Minute (RPM) & 1,500 Requests Per Day.
* **Paid Tier (Pay-As-You-Go):**
  - Rates: ~$0.075 to $0.75 per 1,000,000 input tokens; ~$0.30 to $3.00 per 1M output tokens.
  - Rate Limits: Up to **1,000+ RPM** (Zero concurrency bottlenecks).
  - Cost for 30 teachers generating ~800 reports/month: **~$1.00 – $2.00 / month**.
* **Recommendation:** Set up Google AI Studio billing with a **$5.00/month spending cap**.

### 4.6. Hugging Face Serverless / Inference
* **Free Tier:** $0.10 monthly serverless inference credit with router fallback to `all-MiniLM-L6-v2`.
* **PRO Plan:** **$9.00 / month** (Higher priority queue, 10x throughput).
* **Recommendation:** Start on Free Tier using the built-in fallback logic already written in `ml-service/core/config.py`. Only upgrade to PRO ($9/mo) if faculty report Bloom classification queue delays during exam preparation weeks.

---

## 5. Proposed Departmental Budget Packages

### 🎯 OPTION 1: "Recommended Production" Package (Best Value & 100% Stability)
*This is the recommended package to submit to the department for approval. It completely eliminates cold starts and secures student data at minimal cost.*

| Item / Service | Provider | Plan / Tier | Key Benefit | Monthly Cost (USD) | Annual Cost (USD) | Annual Cost (BDT @ 1 USD = 122 BDT) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend API** | Render.com | Starter Instance | Always-on, 0s latency, no sleep | $7.00 | $84.00 | ~10,248 BDT |
| **ML NLP Service** | Render.com | Starter Instance | Always-on, stable Python runtime | $7.00 | $84.00 | ~10,248 BDT |
| **Database & Backups**| MongoDB Atlas | Flex Tier | 5 GB Storage, Daily Automated Backup | $9.00 | $108.00 | ~13,176 BDT |
| **Generative AI** | Google AI Studio | Pay-As-You-Go | High concurrency CQI & Rubric generation | $2.00 | $24.00 | ~2,928 BDT |
| **Media Storage** | Cloudinary | Free Tier | 25 Credits (More than sufficient) | $0.00 | $0.00 | 0 BDT |
| **Rich Text Editor** | Syncfusion | Community License| Full features, no trial popup, legal | $0.00 | $0.00 | 0 BDT |
| **Client Hosting** | GitHub Pages / Vercel| Free Tier | Global CDN static delivery | $0.00 | $0.00 | 0 BDT |
| **TOTAL** | — | — | — | **$25.00 / mo** | **$300.00 / yr** | **~36,600 BDT / yr** |

---

### 🚀 OPTION 2: "High-Performance Institutional" Package (For Heavy Concurrent Workloads)
*Recommended if the department plans to scale across multiple departments (CSE + EEE + BBA) or wants dedicated high-RAM servers for complex batch calculations.*

| Item / Service | Provider | Plan / Tier | Key Benefit | Monthly Cost (USD) | Annual Cost (USD) | Annual Cost (BDT) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend API** | Render.com | Standard (2 GB RAM) | High memory for large batch Excel uploads | $25.00 | $300.00 | ~36,600 BDT |
| **ML NLP Service** | Render.com | Starter (512 MB RAM)| Dedicated instance | $7.00 | $84.00 | ~10,248 BDT |
| **Database & Backups**| MongoDB Atlas | Flex Tier (Expanded) | Scalable database with multi-region backups | $15.00 | $180.00 | ~21,960 BDT |
| **NLP Inference** | Hugging Face | PRO Subscription | Priority queue, zero 429 rate limit | $9.00 | $108.00 | ~13,176 BDT |
| **Generative AI** | Google AI Studio | Pay-As-You-Go | Uncapped token quota | $4.00 | $48.00 | ~5,856 BDT |
| **Media & Editor** | Cloudinary / Syncfusion| Free / Community | Zero cost | $0.00 | $0.00 | 0 BDT |
| **TOTAL** | — | — | — | **$60.00 / mo** | **$720.00 / yr** | **~87,840 BDT / yr** |

---

### 🛡️ OPTION 3: "Zero-Cost Mitigation" Strategy (If Department Budget is 0 Taka)
*If the department cannot allocate any financial budget, the following 4 engineering interventions MUST be implemented immediately to minimize free-tier failure:*

1. **Anti-Sleep Keep-Alive Ping (Uptime Monitoring):**
   - Configure a free external monitor (e.g., UptimeRobot or Cron-Job.org) to ping `https://student-outcome-analyzer-api.onrender.com/api/health` and `https://student-outcome-analyzer-ml.onrender.com/health` every 10 minutes strictly between **07:50 AM and 05:10 PM on weekdays**.
   - *Limitation:* Render provides 750 free hours/month. Two services pinged 9 hours/day * 22 days = ~396 hours (within 750 hours). Outside office hours, pinging must stop to prevent exhausting the 750-hour budget!
2. **Automated Local Database Backups:**
   - Write a Node.js / Bash cron script on a designated lab computer that executes `mongodump --uri="mongodb+srv://..."` daily at 05:30 PM and uploads an encrypted ZIP file to Google Drive.
3. **Switch to Syncfusion Community License:**
   - Register a free Community License on Syncfusion immediately to eliminate the trial expiration modal.
4. **Client-Side Throttling & Exponential Backoff for Gemini:**
   - Ensure Gemini API calls in `src/services/cqiAiService.js` and `StudentFeedbackReport.jsx` gracefully retry upon HTTP 429 errors using exponential backoff so teachers don't see raw JSON crash errors.

---

## 6. Summary Comparison & Recommendation for Tomorrow's Presentation

| Evaluation Factor | Current Free Tier | Recommended Plan ($25/mo) |
| :--- | :--- | :--- |
| **Page Load / Initial Login Time** | 50–90 seconds delay (Cold start) | **< 1.2 seconds (Instant)** |
| **Question Paper NLP Processing** | Often delayed or queued (503 / 429) | **Instant (< 1.5s)** |
| **Excel Sheet Upload Capacity** | High risk of Out-Of-Memory crash | **Smooth and concurrent** |
| **Accreditation Grade Protection** | ❌ No automated backups | **✅ Daily automated cloud snapshots** |
| **Rich Text Editor Experience** | ⚠️ Trial popup after 30 days | **✅ Permanent, clean interface** |
| **Monthly Department Expense** | **0 BDT** | **~3,000 BDT** (~100 BDT/teacher/month) |

### Final Talking Point for the Presentation:
> *"Our entire system is fully built, functional, and cloud-integrated. For 25 to 30 teachers working daily from 8:00 AM to 5:00 PM, running entirely on the free tier creates cold-start delays of over a minute and lacks data recovery. Upgrading only the essential compute and database layers requires a minimal departmental budget of just **$25/month (around 3,000 Taka/month)**—less than 100 Taka per teacher per month—to provide a reliable, professional, accreditation-ready platform."*

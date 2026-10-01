# System Sequence Diagrams & Workflow Specifications

**Project Title:** Student Outcome Analyzer & OBE Management System  
**Document Purpose:** Academic Thesis Specification (Chapter 4: Implementation Architecture & Algorithmic Workflows)  
**Standard Compliance:** UML 2.5 Sequence Diagram Specification / IEEE 830 / Washington Accord & BAETE Criteria  
**Target File:** `docs/sequence_diagrams.md`  
**Document Version:** 1.0.0 (Production Verified)  
**Date:** October 2026  

---

## 1. Executive Summary & Sequence Modeling Foundations

A **UML Sequence Diagram** depicts the dynamic behavioral perspective of an enterprise software system by modeling **time-ordered object interactions, message exchanges, and execution lifelines**. In the context of the **Student Outcome Analyzer & OBE Management System**, sequence diagrams formalize the exact asynchronous API lifecycles, inter-service communications between Node.js and Python FastAPI, distributed database updates in MongoDB Atlas, and mathematical evaluation algorithms.

This document formalizes the core runtime workflows of the system:
1. **AI Question Suggestion & Pedagogical Metadata Workflow** (Syncfusion RTE $\to$ Express Gateway $\to$ FastAPI ML $\to$ Hugging Face / Heuristic Fallback).
2. **OBE Attainment & 4-Year Longitudinal Student Radar Workflow** (Marks Ingestion $\to$ Best-CT Pairing $\to$ Direct CO Attainment $\to$ PO Matrix `max()` Transformation $\to$ Longitudinal Radar & Recommendation Engine).
3. **Student Anonymous Evaluation & QR Code Feedback Workflow** (QR/Token Access $\to$ Date Window Verification $\to$ Pseudonymous Likert & Feedback Ingestion).
4. **Teacher Reference Notes Ingestion & Semantic RAG Query Workflow** (Document Chunking $\to$ SBERT 384-d Embedding $\to$ In-Memory Cosine Similarity Top-$K$ Search).
5. **Activity-Aware ML Container Keep-Alive Lifecycle** (`useMLServiceWakeup` JIT Warming $\to$ 9-min Heartbeats $\to$ 5-min Idle Suspension).
6. **Curriculum Governance & CO-PO Articulation Change Workflow** (Teacher Proposal $\to$ Matrix Delta Diffing $\to$ Admin Resolution $\to$ Atomic Propagation).

```
+----------------------------------------------------------------------------------------------------+
|                                  SEQUENCE WORKFLOW MATRIX (CHAPTER 4)                              |
+------------------------------------+----------------------------------+----------------------------+
| Workflow 1: AI Metadata Suggestion | Workflow 2: OBE Attainment Engine| Workflow 3: Student QR Eval|
| - Fast & Zero-Shot Hybrid Pipeline | - Direct CO/PO Attainment        | - Anonymous Likert Rating  |
| - Action Verb Hierarchy (C1-C6)    | - Washington Accord max() Rule   | - Token Access Control     |
| - SBERT Vector Distance Ranking    | - 4-Yr Longitudinal PO Radar     | - Single-Submission Guard  |
+------------------------------------+----------------------------------+----------------------------+
| Workflow 4: Reference Notes RAG    | Workflow 5: JIT Keep-Alive Life  | Workflow 6: CO-PO Govern   |
| - Text Chunker (.docx, .pdf, .ppt) | - Cold-Start Mitigation (~22s)   | - Teacher Proposal Queue   |
| - 384-d Dense Vector Caching       | - Activity-Aware Heartbeat (9m)  | - Side-by-Side Delta Diff  |
| - Semantic Context Top-K Retrieval | - Idle Detection Pause (5m)      | - Atomic DB Matrix Update  |
+------------------------------------+----------------------------------+----------------------------+
```

---

## 2. Sequence Workflow 1: AI Question Suggestion & Pedagogical Engineering

### 2.1 Technical Architectural Description
When an instructor authors an exam question in `QuestionPaperEditor.jsx`, the system automatically infers the **Bloom's Revised Taxonomy Cognitive Level (C1–C6)** and the optimal **Course Outcome (CO)** mapping.

- **Primary Participants:**
  - `Teacher (User)`: Faculty member editing exam questions.
  - `QuestionPaperEditor (UI)`: Frontend authoring component hosting Syncfusion RTE and KaTeX preview.
  - `Express Gateway (Node.js)`: Core API router (`server/routes/aiRoutes.js`).
  - `FastAPI ML Microservice`: Python backend hosting `services/bloom_service.py` and `services/co_service.py`.
  - `Hugging Face Serverless API`: Cloud inference for Zero-Shot classification and SBERT sentence embeddings.
  - `Local Heuristic Engine`: Gateway regex classifier that activates if the Python container is cold-starting.

### 2.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Faculty Author
    participant UI as QuestionPaperEditor.jsx (UI)
    participant Gateway as Express Gateway (/api/ai)
    participant ML as FastAPI ML Microservice (Port 8000)
    participant HF as Hugging Face Serverless API
    participant Fallback as Local Heuristic Fallback Engine

    Teacher->>UI: Types Question Text & Sets Marks (e.g. "Explain Polymorphism with C++ code")
    Teacher->>UI: Clicks "Auto-Tag Metadata" Button
    UI->>UI: Validates non-empty string & extracts candidate COs from active offering
    UI->>Gateway: POST /api/ai/suggest-metadata { questionText, courseOutcomes }
    
    activate Gateway
    Gateway->>Gateway: Set AbortController timeout (120,000 ms)
    Gateway->>ML: POST /suggest-metadata { questionText, courseOutcomes }
    
    activate ML
    alt Python ML Microservice is Online & Healthy
        ML->>ML: sanitize_question_text(): Strip HTML tags, Q numbers, mark brackets
        
        par Parallel Cognitive Classification & Semantic CO Mapping
            ML->>ML: Action Verb Rule Engine: match pedagogical verbs (C1..C6)
            ML->>HF: POST /models/valhalla/distilbart-mnli-12-3 (Zero-Shot Classification)
            HF-->>ML: Return Probabilities: { C2: 0.88, C4: 0.06, C1: 0.03, ... }
        and
            ML->>HF: POST /models/obe-ai-system/sbert-obe-csematch (Sentence Embeddings)
            HF-->>ML: Return Cosine Similarities against Candidate COs
        end

        ML->>ML: Evaluate Cognitive Hierarchy: max(C_hierarchy) for compound questions
        ML->>ML: Rank candidate COs in descending order of vector similarity
        ML-->>Gateway: HTTP 200 OK { success: true, bloom: { suggested: "C2", confidence: 0.8845 }, co: { suggested: "CO1", confidence: 0.8234 } }
        Gateway-->>UI: HTTP 200 OK { success: true, bloom, co }
    else ML Service Timed Out / Cold-Starting (HTTP 502/503/504)
        ML--xGateway: Connection Refused / Cold-Start Timeout
        deactivate ML
        Gateway->>Fallback: computeLocalSimilarityFallback(questionText, courseOutcomes)
        activate Fallback
        Fallback->>Fallback: Tokenize words, filter stop-words, match keyword vocabulary
        Fallback-->>Gateway: Return Heuristic Predictions: { bloom: "C2", co: "CO1", confidence: 0.65 }
        deactivate Fallback
        Gateway-->>UI: HTTP 200 OK { success: true, bloom, co, source: "heuristic_fallback" }
    end
    deactivate Gateway

    UI->>UI: Auto-select suggested Bloom dropdown and CO pill selector
    UI->>Teacher: Visual confirmation badge displayed ("AI Metadata Applied")
```

---

## 3. Sequence Workflow 2: OBE Attainment & 4-Year Longitudinal Student Radar Calculation

### 3.1 Technical Architectural Description
This workflow represents the mathematical core of the platform. Upon marks submission, the system evaluates individual question items, performs **Best-CT pairing**, computes **Direct CO Attainment**, transforms COs into **Direct PO Attainment using the Washington Accord `max()` rule**, and updates the student's **4-Year Cumulative Longitudinal Radar Profile**.

- **Primary Participants:**
  - `Teacher / Evaluator`: Uploads assessment marks via Excel or manual spreadsheet grid.
  - `Express Gateway`: Orchestrates the calculation pipeline across `teacherRoutes.js` and `poRecommendationRoutes.js`.
  - `MongoDB Atlas`: Stores intermediate and finalized attainment records (`studentmarks`, `coattainments`, `poattainments`, `studentlongitudinalpos`, `porecommendations`).

### 3.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Course Instructor
    participant UI as ComprehensiveMarksEntry.jsx
    participant Gateway as Express Gateway (teacherRoutes.js)
    participant PORouter as Longitudinal Router (poRecommendationRoutes.js)
    participant DB as MongoDB Atlas Cluster

    Teacher->>UI: Uploads Marks Spreadsheet (.xlsx) or enters scores
    UI->>UI: Validates format & checks Student IDs against enrolled roster
    UI->>Gateway: POST /api/offerings/:offeringId/marks/bulk { marksData }
    
    activate Gateway
    Gateway->>DB: Upsert score entries into `studentmarks` collection
    DB-->>Gateway: Confirmation { upsertedCount }

    Note over Gateway: Step 1: Execute Direct CO Attainment Computation
    Gateway->>DB: Query `assessments`, `questionmetadatas`, and `studentmarks`
    DB-->>Gateway: Return Roster Marks & Rubric Structures

    loop For each student in cohort
        Gateway->>Gateway: Group CT assessments (Standard CT + Extra/Makeup CTs)
        Gateway->>Gateway: Best-CT Pairing: BestScore = Max(Standard_CT, Extra_CT)
        Gateway->>Gateway: Sum obtained marks per CO and divide by coMaxMarks: Score_CO%
    end

    loop For each CO (CO1 to CO12)
        Gateway->>Gateway: PassCount = count(Students with Score_CO% >= targetPassMarks)
        Gateway->>Gateway: passMarksPercentage = (PassCount / TotalStudents) * 100
        Gateway->>Gateway: kpiPercentage = count(Students with Score_CO% >= kpiCO) / Total * 100
        Gateway->>Gateway: attained = (kpiPercentage >= kpiCO)
        Gateway->>DB: Upsert into `coattainments` { offeringId, co, passMarksPercentage, kpiPercentage, attained }
    end

    Note over Gateway: Step 2: Execute Direct PO Matrix Transformation (max rule)
    Gateway->>DB: Fetch offering `coPoMapping` matrix (weights 1-3)
    DB-->>Gateway: Return Matrix Articulation Weights

    loop For each PO (PO1 to PO12)
        Gateway->>Gateway: Extract all mapped COs where coMapping[CO_i][PO_j] == 1
        alt Mapped COs exist for PO_j
            Gateway->>Gateway: passMarksPercentage = Max(passMarksPercentage of all mapped COs)
            Gateway->>Gateway: kpiPercentage = Max(kpiPercentage of all mapped COs)
            Gateway->>Gateway: attained = (kpiPercentage >= kpiPO)
        else Unmapped PO
            Gateway->>Gateway: Set attainment to 0 (Unassessed in this course)
        end
        Gateway->>DB: Upsert into `poattainments` { offeringId, po, passMarksPercentage, kpiPercentage, attained }
    end

    Note over Gateway,PORouter: Step 3: Trigger 4-Year Longitudinal Student Radar Update
    Gateway->>PORouter: syncAllStudentsLongitudinalPO(offeringId)
    activate PORouter

    loop For every student in cohort
        PORouter->>DB: Query all completed enrollments & courseofferings across all 4 years
        DB-->>PORouter: Return Historical Course Grades & PO Attainment Vectors
        
        PORouter->>PORouter: Compute CGPA = Sum(GradePoint * Credits) / Sum(AttemptedCredits)
        PORouter->>PORouter: Compute Credit-Weighted POs: PO_cum[j] = Sum(PO[j] * Credits) / Sum(Credits)
        PORouter->>PORouter: Identify Weak POs: count(PO_cum[j] < threshold)
        PORouter->>PORouter: Classify Recommendation Status (Eligible / Conditional / Gap / Ineligible)
        
        PORouter->>DB: Upsert into `studentlongitudinalpos` { longitudinalPOs, radarData, status, cgpa }
        PORouter->>DB: Upsert into `porecommendations` { student, threshold, recommendationScore, status }
    end
    deactivate PORouter

    Gateway-->>UI: HTTP 200 OK { success: true, updatedCOs, updatedPOs }
    deactivate Gateway

    UI->>Teacher: Re-renders Direct Attainment Barcharts & Student Radar Visualizations
```

---

## 4. Sequence Workflow 3: Student Anonymous Evaluation & QR Code Feedback

### 4.1 Technical Architectural Description
This workflow facilitates pseudonymous, zero-login course and instructor feedback. Students access the system via dynamic mobile QR codes generated for an active course offering.

- **Primary Participants:**
  - `Student (Mobile)`: Classroom attendee scanning dynamic QR code.
  - `Public Evaluation Form`: React client component (`StudentFeedbackForm.jsx`).
  - `Express Gateway`: Controller (`server/routes/evaluationRoutes.js`).
  - `MongoDB Atlas`: Verifies dates and records submissions in `evaluations` and `responses`.

### 4.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Mobile / QR)
    participant UI as StudentFeedbackForm.jsx
    participant Gateway as Express Gateway (evaluationRoutes.js)
    participant DB as MongoDB Atlas Cluster

    Student->>UI: Scans QR Code -> Navigates to /feedback/:evaluationId
    UI->>Gateway: GET /api/evaluations/public/:evaluationId
    
    activate Gateway
    Gateway->>DB: Query `evaluations` collection by unique token
    DB-->>Gateway: Return Evaluation Document { openDate, closeDate, status, questions }
    
    alt Evaluation is Inactive or Expired
        Gateway-->>UI: HTTP 403 Forbidden { success: false, message: "Evaluation session closed." }
        UI->>Student: Displays "Session Expired" error screen
    else Evaluation is Active (status == 'Published' & now within date bounds)
        Gateway-->>UI: HTTP 200 OK { success: true, evaluation: { title, description, questions } }
        deactivate Gateway
        
        UI->>Student: Renders Questionnaire grouped by pedagogical sections
        Student->>UI: Selects Likert Ratings (1-5) & types qualitative comments
        Student->>UI: Inputs Student Institutional Email & Clicks "Submit Feedback"
        
        UI->>Gateway: POST /api/evaluations/public/:evaluationId/submit { ratings, comments, email }
        activate Gateway
        
        Gateway->>DB: Check for duplicate submission by email & evaluationId
        DB-->>Gateway: Result { existingResponse: null }
        
        Gateway->>DB: Insert new document into `responses` collection
        DB-->>Gateway: Confirmation { responseId: ObjectId }
        
        Gateway-->>UI: HTTP 200 OK { success: true, message: "Feedback submitted successfully." }
        deactivate Gateway
        
        UI->>Student: Displays "Submission Confirmed" receipt with integrity hash
    end
```

---

## 5. Sequence Workflow 4: Teacher Reference Notes Ingestion & Semantic RAG Query

### 5.1 Technical Architectural Description
Instructors can upload course lecture materials (`.docx`, `.pdf`, `.pptx`, `.txt`). The Python microservice chunks the document, caches vector embeddings, and enables semantic search for formulating assessment questions.

- **Primary Participants:**
  - `Teacher`: Faculty author seeking syllabus-aligned question ideas.
  - `ReferenceNotesModal.jsx`: Client upload and search interface.
  - `Express Gateway`: REST proxy (`server/routes/notesRoutes.js`).
  - `FastAPI ML Service`: Document parser and vector matcher (`services/notes_service.py`).
  - `Hugging Face SBERT`: Dense 384-dimensional vector embedding model.

### 5.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Course Instructor
    participant UI as ReferenceNotesModal.jsx
    participant Gateway as Express Gateway (/api/notes)
    participant ML as FastAPI ML Microservice (notes_routes.py)
    participant HF as Hugging Face SBERT API

    Note over Teacher,HF: Phase A: Document Upload & Semantic Chunk Indexing
    Teacher->>UI: Selects lecture file (e.g. "Lecture_04_Trees.pdf") & submits
    UI->>Gateway: POST /api/notes/upload (Multipart FormData with courseId)
    
    activate Gateway
    Gateway->>ML: Forward Multipart Upload to FastAPI /api/notes/upload
    activate ML
    
    ML->>ML: extract_text_from_file(): Parse PDF text & split into 300-word sliding windows
    ML->>HF: POST /models/sentence-transformers/all-MiniLM-L6-v2 (Batch Embed Chunks)
    HF-->>ML: Return 384-dimensional Dense Vector Embeddings
    ML->>ML: Cache chunk texts and vector arrays in course memory store
    ML-->>Gateway: HTTP 200 OK { success: true, indexedChunks: 24, courseId }
    deactivate ML
    Gateway-->>UI: HTTP 200 OK { success: true, count: 24 }
    deactivate Gateway
    UI->>Teacher: Displays "24 Lecture Chunks Indexed & Ready"

    Note over Teacher,HF: Phase B: Semantic Question Retrieval & Formulation
    Teacher->>UI: Enters query: "Formulate a 5-mark question on binary search tree deletion"
    UI->>Gateway: POST /api/notes/suggest { queryText, topK: 3, courseId }
    
    activate Gateway
    Gateway->>ML: Forward query to /api/notes/suggest
    activate ML
    
    ML->>HF: Compute 384-d vector embedding for queryText
    HF-->>ML: Return Query Vector
    ML->>ML: Compute Cosine Similarity between Query Vector and all cached Chunks
    ML->>ML: Sort chunks descending by cosine score & select Top-3 contexts
    ML-->>Gateway: HTTP 200 OK { success: true, suggestions: [ { chunkText, score: 0.91 }, ... ] }
    deactivate ML
    Gateway-->>UI: HTTP 200 OK { suggestions }
    deactivate Gateway
    
    UI->>Teacher: Presents Top-3 relevant lecture passages & suggested question draft
```

---

## 6. Sequence Workflow 5: Activity-Aware ML Container Keep-Alive Lifecycle

### 6.1 Technical Architectural Description
To prevent cloud free-tier spin-downs (15-minute inactivity timeout on Render) without exceeding monthly quotas, `useMLServiceWakeup.js` implements an **activity-aware heartbeat with automatic idle suspension**.

- **Primary Participants:**
  - `User`: Faculty author typing, clicking, or scrolling in Question Paper Editor.
  - `useMLServiceWakeup.js`: React lifecycle hook.
  - `Express Gateway`: Health probe controller (`server/routes/aiRoutes.js`).
  - `Render ML Container`: Asynchronous Python FastAPI microservice.

### 6.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty User
    participant Hook as useMLServiceWakeup.js (Client Hook)
    participant Gateway as Express Gateway (/api/ai)
    participant Render as Render ML Container (FastAPI)

    Note over Faculty,Render: Event 1: User Opens Question Paper Editor (JIT Pre-Warming)
    Hook->>Gateway: POST /api/ai/ml-wake { waitForReady: false }
    activate Gateway
    Gateway->>Render: GET /health (Non-blocking probe, timeout 35s)
    activate Render
    
    alt Container is Cold-Starting (Spin-up Latency ~20-30s)
        Render-->>Gateway: Connection Pending / HTTP 502
        Gateway-->>Hook: HTTP 200 OK { waking: true, online: false, status: "warming" }
        Hook->>Faculty: Displays subtle UI badge: "AI Engine Waking Up (~20s)..."
    else Container is Warm & Active
        Render-->>Gateway: HTTP 200 OK { status: "online", models: { sbert: true } }
        deactivate Render
        Gateway-->>Hook: HTTP 200 OK { waking: false, online: true, status: "ready" }
        Hook->>Faculty: Displays green badge: "AI Assistant Online"
    end
    deactivate Gateway

    Note over Faculty,Render: Event 2: Active Authoring Session (Periodic Keep-Alive)
    loop Every 9 Minutes (While Editor Session < 90 mins)
        alt User interacted within last 5 minutes (mousedown, keydown, scroll)
            Hook->>Gateway: POST /api/ai/ml-heartbeat
            activate Gateway
            Gateway->>Render: GET /health (Timeout 5s)
            Render-->>Gateway: HTTP 200 OK { status: "online" }
            Gateway-->>Hook: HTTP 200 OK { heartbeat: true, online: true }
            deactivate Gateway
        else User Inactive >= 5 Minutes (Idle State Detected)
            Hook->>Hook: Suspend heartbeat timer
            Note over Hook,Render: Allows Render container to sleep naturally, preserving free-tier hours
        end
    end

    Note over Faculty,Render: Event 3: User Resumes Activity After Idle
    Faculty->>Hook: Types or clicks inside editor
    Hook->>Hook: Reset lastActivity timestamp & re-engage JIT wake-up flow
```

---

## 7. Sequence Workflow 6: Curriculum Governance & CO-PO Articulation Change Proposal

### 7.1 Technical Architectural Description
When an instructor determines that syllabus-level Course Outcomes or correlation weights require revision, the system prevents unilateral modification by enforcing a formal **Administrative Proposal & Delta Diff Approval Workflow**.

- **Primary Participants:**
  - `Teacher`: Recommends adjustments to Course Outcomes or correlation matrices.
  - `Admin`: Department Head reviewing curriculum change proposals.
  - `Express Gateway`: Controller (`copoRequestRoutes.js`).
  - `MongoDB Atlas`: Persists governance queue in `copo_requests` and updates `courses` / `courseofferings`.

### 7.2 Sequence Diagram (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Course Instructor
    actor Admin as Department Head / Admin
    participant UI as COPOMapping.jsx / AdminDashboard.jsx
    participant Gateway as Express Gateway (copoRequestRoutes.js)
    participant DB as MongoDB Atlas Cluster

    Teacher->>UI: Edits matrix weights & proposes new Course Outcome description
    Teacher->>UI: Clicks "Submit CO-PO Modification Proposal"
    UI->>Gateway: POST /api/copo-requests { courseId, offeringId, proposedMapping, changesSummary }
    
    activate Gateway
    Gateway->>DB: Fetch original matrix from `courses` collection
    DB-->>Gateway: Return Original Syllabus Matrix
    Gateway->>DB: Insert record into `copo_requests` { status: "pending", proposedMapping, originalMapping }
    DB-->>Gateway: Confirmation { requestId: ObjectId }
    Gateway->>DB: Asynchronously log event in `recentactivities`
    Gateway-->>UI: HTTP 201 Created { success: true, message: "Proposal submitted for review." }
    deactivate Gateway
    UI->>Teacher: Displays "Proposal Pending Department Head Approval" banner

    Note over Admin,DB: Administrative Review & Governance Phase
    Admin->>UI: Opens Admin Dashboard -> "Governance & Approvals" tab
    UI->>Gateway: GET /api/copo-requests?status=pending
    activate Gateway
    Gateway->>DB: Query `copo_requests` where status == 'pending'
    DB-->>Gateway: Return List of Pending Modification Proposals
    Gateway-->>UI: HTTP 200 OK { pendingRequests }
    deactivate Gateway

    Admin->>UI: Clicks proposal to view Side-by-Side Matrix Delta Diff
    UI->>Admin: Highlights modified cells (e.g. CO2-PO3 changed from 1 to 2) and new CO text
    Admin->>UI: Enters approval remarks into `adminNote` & clicks "Approve Proposal"
    
    UI->>Gateway: PUT /api/copo-requests/:id/approve { adminNote }
    activate Gateway
    Gateway->>DB: Atomic Update: Commit proposedMapping to `courses` and `courseofferings`
    Gateway->>DB: Update `copo_requests` status to "approved" with timestamp & reviewedBy
    DB-->>Gateway: Write Acknowledged
    Gateway->>DB: Log approval in `recentactivities`
    Gateway-->>UI: HTTP 200 OK { success: true, message: "Curriculum change committed." }
    deactivate Gateway

    UI->>Admin: Removes proposal from pending queue & updates audit ledger
    Teacher->>UI: Refreshes course offering matrix -> Active matrix reflects approved syllabus
```

---

## 8. Ready-to-Use PlantUML Source Scripts

For high-resolution thesis figures requiring vector-rendered graphics (via draw.io, PlantText, or PlantUML CLI), use the following script:

### 8.1 PlantUML: AI Question Suggestion Workflow
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam roundcorner 10
skinparam shadowing false
skinparam defaultFontName "Segoe UI", Arial, sans-serif

actor "Faculty Author" as Teacher #065f46
participant "QuestionPaperEditor" as UI #ffffff
participant "Express Gateway\n(/api/ai)" as Gateway #0f172a
participant "FastAPI ML Service\n(Port 8000)" as ML #312e81
participant "Hugging Face\nServerless API" as HF #1e3a8a
participant "Local Heuristic\nFallback" as Fallback #64748b

Teacher -> UI: Enters question text & marks
UI -> Gateway: POST /api/ai/suggest-metadata
activate Gateway

alt ML Microservice Online
  Gateway -> ML: POST /suggest-metadata
  activate ML
  ML -> ML: sanitize_question_text()
  
  par
    ML -> HF: Zero-Shot Classification (distilbart)
    HF --> ML: Probabilities (C1-C6)
  else
    ML -> HF: Sentence Embeddings (sbert-obe)
    HF --> ML: Cosine Similarities (COs)
  end
  
  ML -> ML: Evaluate Cognitive Demand Hierarchy
  ML --> Gateway: HTTP 200 OK { bloom: "C2", co: "CO1" }
  deactivate ML
  Gateway --> UI: HTTP 200 OK { metadata }
else ML Cold-Starting / Offline
  Gateway -> Fallback: computeLocalSimilarityFallback()
  activate Fallback
  Fallback --> Gateway: Return Heuristic Predictions
  deactivate Fallback
  Gateway --> UI: HTTP 200 OK { source: "fallback" }
end

deactivate Gateway
UI -> Teacher: Auto-selects Bloom level & CO pill
@enduml
```

### 8.2 PlantUML: OBE Attainment & 4-Year Longitudinal Radar Workflow
```plantuml
@startuml
skinparam sequenceMessageAlign center
skinparam roundcorner 10
skinparam shadowing false
skinparam defaultFontName "Segoe UI", Arial, sans-serif

actor "Course Instructor" as Teacher #065f46
participant "ComprehensiveMarksEntry" as UI #ffffff
participant "Express Gateway\n(teacherRoutes.js)" as Gateway #0f172a
participant "Longitudinal Router\n(poRecommendationRoutes.js)" as PORouter #312e81
database "MongoDB Atlas\nCluster" as DB #1e293b

Teacher -> UI: Uploads Marks Spreadsheet (.xlsx)
UI -> Gateway: POST /api/offerings/:id/marks/bulk
activate Gateway

Gateway -> DB: Upsert studentmarks
DB --> Gateway: Success

== Step 1: Direct CO Attainment Computation ==
Gateway -> DB: Fetch Assessments, Metadata & Marks
DB --> Gateway: Return Assessment Records
Gateway -> Gateway: Best-CT Pairing: Max(Standard CT, Extra CT)
Gateway -> Gateway: Check Student CO% vs targetPassMarks & KPI
Gateway -> DB: Upsert coattainments

== Step 2: Direct PO Matrix Transformation (max rule) ==
Gateway -> DB: Fetch offering coPoMapping
DB --> Gateway: Return Matrix Weights
Gateway -> Gateway: Apply Washington Accord max() rule across mapped COs
Gateway -> DB: Upsert poattainments

== Step 3: 4-Year Longitudinal Student Radar Update ==
Gateway -> PORouter: syncAllStudentsLongitudinalPO()
activate PORouter

loop For each student in cohort
  PORouter -> DB: Query historical course grades & POs
  DB --> PORouter: Return 4-Year Academic History
  PORouter -> PORouter: Compute CGPA & Credit-Weighted POs
  PORouter -> PORouter: Classify Recommendation Status
  PORouter -> DB: Upsert studentlongitudinalpos & porecommendations
end

deactivate PORouter

Gateway --> UI: HTTP 200 OK { updatedCOs, updatedPOs }
deactivate Gateway
UI -> Teacher: Re-renders Attainment Charts & Radar Visuals
@enduml
```

---

## 9. Thesis Chapter 4 Integration Summary

This Sequence Diagram specification provides the mathematical and algorithmic baseline required for **Chapter 4 (Implementation & Workflow)** of the academic thesis:
1. **Algorithmic Transparency:** Documents the step-by-step logic of the **Best-CT Pairing** and **Washington Accord `max()` rule** for Course and Program Outcome calculations.
2. **Applied NLP Resilience:** Formalizes the dual-path execution flow transitioning seamlessly between cloud neural models and local heuristic classifiers.
3. **Auditability & Traceability:** Outlines the strict separation between instructional evaluation, student pseudonymity, and administrative curriculum governance.

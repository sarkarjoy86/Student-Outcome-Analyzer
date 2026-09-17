# 🎓 OBE Student Outcome Analyzer & AI Question Paper Intelligence

> **An Enterprise Outcome-Based Education (OBE) Management, Washington Accord Accreditation Analytics, and Neural AI-Powered Question Paper Engineering Platform.**  
> *Developed as a Bachelor Capstone Project for Higher Education & Engineering Accreditation Automation.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-brightgreen?style=for-the-badge&logo=github)](https://sarkarjoy86.github.io/Student-Outcome-Analyzer/)
[![License](https://img.shields.io/badge/License-Proprietary_%7C_All_Rights_Reserved-red?style=for-the-badge)](LICENSE)
[![React 18](https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_Tailwind-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express_%7C_MongoDB-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Python FastAPI](https://img.shields.io/badge/ML_Service-Python_3.10+_%7C_FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/Deep_Learning-PyTorch_%7C_CUDA-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org/)
[![HuggingFace](https://img.shields.io/badge/NLP_Models-Sentence--BERT_%7C_Zero--Shot-FFD21E?style=for-the-badge&logo=huggingface)](https://huggingface.co/)
[![Gemini AI](https://img.shields.io/badge/Generative_AI-Google_Gemini_API-8E75B2?style=for-the-badge&logo=google)](https://ai.google.dev/)

---

## 📌 Executive Overview

The **OBE Student Outcome Analyzer** is an enterprise-grade academic platform engineered for universities, engineering faculties, and educational institutions operating under the **Washington Accord / BAETE Accreditation Frameworks**. 

### 🚀 Ending the Era of Microsoft Word & Excel in Academia
In conventional university workflows, faculty members waste hundreds of hours every semester juggling disconnected, manual tools:
- **The Microsoft Word Nightmare**: Crafting exam papers in Microsoft Word is notoriously frustrating. Word automatically mangles code indentation, disrupts mathematical equation formatting, breaks tabular structures, and forces teachers to seek third-party websites to draw computer science trees and graphs—only to copy-paste blurry screenshots back into Word. Furthermore, tagging questions with Bloom's Taxonomy and Course Outcomes is completely manual, arbitrary, and error-prone.
- **The Microsoft Excel Fragility**: Computing Outcome-Based Education metrics in Excel spreadsheets leads to disaster: broken cell references (`#REF!`, `#VALUE!`), corrupted macro formulas, missed rows during student add/drop periods, and zero longitudinal tracking across semesters.

### 🌐 A Unified, All-in-One Academic Operating System
The **OBE Student Outcome Analyzer** completely eliminates the need for Microsoft Word and Excel by providing a single, browser-based ecosystem that unifies the entire academic lifecycle:
1. **End-to-End Course & Roster Management**: Digital syllabus mapping, automated "Best 3 of 4" Class Test grading, and continuous assessment spreadsheets.
2. **AI-Powered Question Paper Studio**: Built-in rich text typesetting with native KaTeX mathematical equations, an integrated **CS Diagram Studio** (Trees, Graphs, State Machines), a **Code Snippet Editor with Smart Output Analyzer**, and zero-shot neural AI verification for Bloom's Taxonomy (**C1–C6**) and Course Outcome (**CO1–CO12**) alignment.
3. **Accreditation-Grade Attainment Engine**: Real-time direct and indirect attainment computations with zero formula errors, interactive heatmaps, multi-student comparative benchmarks, automated **SWOT Analysis**, and student **PO Recommendation Transcripts**.

### 🌐 Live Production Application
👉 **[Access the Deployed Web Application](https://sarkarjoy86.github.io/Student-Outcome-Analyzer/)**

---

## 🏛️ System Architecture

The platform operates on a resilient three-tier distributed architecture combining an offline-first Single Page Application (SPA), an Express.js enterprise API gateway, and an asynchronous Python FastAPI deep-learning microservice.

```mermaid
graph TB
    subgraph Client ["Client Layer (React 18 + Vite)"]
        UI["Teacher & Admin Dashboards\n(Tailwind CSS + Lucide Icons)"]
        RTE["Syncfusion Rich Text Editor\n+ KaTeX Math Renderer"]
        AIAssistant["AI Assistant Drawer\n(CS Diagrams, Code Snippets, GenAI)"]
        Cache["Session GET Cache (0ms Tabs)\n+ IndexedDB Note Store"]
        WakeHook["useMLServiceWakeup Hook\n(Activity Tracking & Tab Visibility)"]
    end

    subgraph BackendGateway ["Application Gateway (Node.js & Express)"]
        AuthMiddleware["JWT Authentication\n& Role-Based Authorization"]
        OBERoutes["OBE Analytics & Attainment\nCalculation Pipeline"]
        ExamRoutes["Assessment & Paper Metadata Router"]
        NotesRoutes["Reference Question Vector Proxy"]
        MongoDB[("MongoDB Database\n(Users, Offerings, Marks, Papers, Surveys)")]
    end

    subgraph MLMicroservice ["Neural ML Microservice (FastAPI & PyTorch)"]
        MLRouter["FastAPI REST Endpoints\n(/suggest-metadata, /similarity, /notes)"]
        SBERT["Sentence-BERT Embeddings\n(all-MiniLM-L6-v2)"]
        ZeroShot["Zero-Shot Bloom Classifier\n(DistilBART-MNLI)"]
        VectorMatch["Semantic Similarity & Cosine Matcher"]
        HardwareEngine["Inference Engine\n(NVIDIA CUDA GPU / CPU Fallback)"]
    end

    subgraph CloudAI ["Cloud Intelligence (Google Gemini API)"]
        GeminiEngine["Generative AI Engine\n(Question Gen, Text Refinement, Code Analysis)"]
    end

    UI --> RTE
    UI --> AIAssistant
    UI --> Cache
    UI --> WakeHook
    RTE <--> AuthMiddleware
    AIAssistant <--> CloudAI
    WakeHook -.->|Periodic 9m Poke\nActive Session Only| MLRouter
    AuthMiddleware --> OBERoutes
    AuthMiddleware --> ExamRoutes
    AuthMiddleware --> NotesRoutes
    OBERoutes <--> MongoDB
    ExamRoutes <--> MongoDB
    NotesRoutes <--> MongoDB
    ExamRoutes <--> MLRouter
    NotesRoutes <--> MLRouter
    MLRouter --> SBERT
    MLRouter --> ZeroShot
    SBERT --> VectorMatch
    VectorMatch --> HardwareEngine
```

---

## 👨‍🏫 1. Teacher Dashboard & Course Workspaces

The **Teacher Dashboard** guides instructors through four sequential academic phases, streamlining everything from course setup to graduation outcome verification.

```mermaid
flowchart TD
    subgraph Phase1 ["Phase 1: Curriculum & Roster Setup"]
        Overview["📋 Course Overview\nCourse Specifications, Reminders & Audit Feed"]
        COPO["🎯 12x12 CO-PO Matrix\nWashington Accord Alignment & Dean Review Workflow"]
        Roster["👥 Student Table & Roster\nContinuous Assessment & Automated Best-3 CTs"]
    end

    subgraph Phase2 ["Phase 2: Exam Engineering & AI Authoring"]
        Assessments["📦 Assessment Management\n10 Evaluation Cards & Extra-CT Target Mapping"]
        Archives["📂 Question Archives\nHistorical Exam Paper Bank & Reuse Folders"]
        Editor["⚡ Question Paper Editor\nKaTeX Math, CS Diagram Studio & Code Analyzer"]
    end

    subgraph Phase3 ["Phase 3: Grading & Attainment Analytics"]
        Marks["📊 Dynamic Marks Spreadsheet\nSingle/Question Entry & Draft Auto-Restore"]
        Attainment["🧮 Attainment Engine\nInteractive Sliders (Pass %, KPI %) & Live Status"]
    end

    subgraph Phase4 ["Phase 4: Continuous Quality Improvement (CQI)"]
        Reports["📈 Automated OBE Reports\nSWOT Analysis, Heatmaps & Comparative Stats"]
        PORec["🎯 PO Recommendation System\nLongitudinal Competency & Gap Deficit Alerts"]
        Surveys["📝 Washington Accord Surveys\nLikert-Scale Indirect Feedback Portal"]
    end

    Overview --> COPO --> Roster --> Assessments
    Assessments --> Editor
    Archives -.->|Clone & Reuse Past Qs| Editor
    Editor --> Marks --> Attainment --> Reports
    Attainment --> PORec
    Surveys -.->|Indirect Attainment Aggregation| Attainment
    Reports --> PORec

    classDef phase1 fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#064e3b;
    classDef phase2 fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef phase3 fill:#fefce8,stroke:#ca8a04,stroke-width:2px,color:#713f12;
    classDef phase4 fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87;

    class Overview,COPO,Roster phase1;
    class Assessments,Archives,Editor phase2;
    class Marks,Attainment phase3;
    class Reports,PORec,Surveys phase4;
```

### 1.1 Course Overview & Live Activity Monitor
- **Course Specifications**: Highlights active academic session (e.g., *Spring 2026*), batch, section (*Section B*), credits (*3 Credit Hours*), level/term (*Level 2, Term II*), and mapped CO count.
- **Actionable Course Reminders**: Surfaces pending academic deadlines, missing marks entries (e.g., *Pending Marks: CT-2 [Required]* with direct navigation links), upcoming presentation dates, and overdue submissions.
- **Assessment Module Summary**: Tabulates all 10 configured evaluation modules with creation dates, max marks, question counts, exam durations, and status badges (**Assigned** / **Evaluated**).
- **Audit Activity Feed**: Displays real-time chronological logs of recent changes made to question papers, assessments, and marks sheets.

---

### 1.2 Interactive 12×12 CO-PO Mapping Matrix
- **Washington Accord Criteria Alignment**: Maps Course Outcomes (**CO1–CO12**) against all 12 Washington Accord Program Outcomes:
  - **PO1**: Engineering Knowledge
  - **PO2**: Problem Analysis
  - **PO3**: Design/Development of Solutions
  - **PO4**: Investigation
  - **PO5**: Modern Tool Usage
  - **PO6**: The Engineer and Society
  - **PO7**: Environment and Sustainability
  - **PO8**: Ethics
  - **PO9**: Individual and Team Work
  - **PO10**: Communication
  - **PO11**: Project Management and Finance
  - **PO12**: Life-long Learning
- **Administrative Governance Workflow**: Teachers can submit mapping proposals (`Propose Mappings / Add CO`), triggering an audit request for Department Head / Dean review before updating institutional records.

---

### 1.3 Continuous Assessment Student Table
- **Comprehensive Roster View**: Lists all enrolled students with Roll ID and Student Name alongside continuous evaluation columns (CT-1, CT-2, CT-3, Extra CT-4, Assignment-1, Attendance, Class Performance, Presentation) and Term Exams (Mid Term, Final).
- **Automated "Best 3 of 4" CT Calculation**: Dynamically identifies and highlights the top three Class Test scores, calculating the **Best CT Total (Max: 30)** automatically on the fly.
- **Full-Screen Capability**: Dedicated full-screen toggle allows distraction-free verification of large class rosters with both horizontal and vertical virtual scrolling.

---

### 1.4 Assessment Management & Extra-CT Target Mapping
- **Modular Assessment Cards**: Individual cards for every assessment displaying max marks, duration, question count, mapped COs, and evaluation status badges.
- **Extra CT Replacement Mapping**: Special support for makeup tests (e.g., *Extra CT-4*), allowing teachers to explicitly designate a **Mapped Target (e.g., CT-2)** to seamlessly replace a missed or poor score without corrupting previous grade history.
- **Direct Editor Launch**: Integrated `Open Q.Paper` action opens the AI Question Paper Editor pre-loaded with the assessment's metadata.

---

### 1.5 Question Archives & Paper Reuse Bank
- **Categorized Question Repository**: Organizes past semester exam papers into folders by category (**Assignment-1, CTs, Mid Term, Final, Presentation**) with historical session counters.
- **Instant Search & Reuse**: Allows instructors to review, search, and clone previously validated questions to save preparation time across academic terms.

---

### 1.6 Dynamic Marks Entry Spreadsheet
- **Spreadsheet-Style Grid**: Excel-like fast entry interface with keyboard navigation (`Enter`, `Tab`, arrow keys).
- **Dynamic Calculation**: Validates marks against maximum boundaries with instant row summing and a **Fully Entered** completion badge.
- **Draft Auto-Recovery**: Prevents accidental data loss by caching uncommitted edits in browser storage, prompting teachers with a *Restored draft marks* notification and one-click discard option.
- **Multi-Mode Input**: Supports both **Total Marks (Single Entry)** and **Question-by-Question** granular score entry.

---

### 1.7 Attainment Threshold Sliders & Status Engine
- **Interactive KPI Threshold Sliders**:
  - **Target Pass Marks (%)**: Configurable pass benchmark (default: 40%).
  - **CO Attainment Target KPI (%)**: Percentage of students required to pass for CO achievement (default: 50%).
  - **PO Attainment Target KPI (%)**: Target attainment percentage for program outcomes (default: 50%).
- **Live Status Badges**: Evaluates class scores in real-time, displaying green **Attained** or red **Not Attained** badges across all COs (CO1–CO6) and POs (PO1–PO12).

---

## 🤖 2. Flagship AI Question Paper Engineering Suite

The **Question Paper Editor** is an end-to-end academic authoring environment that replaces Microsoft Word with neural NLP and generative AI tools built directly into the rich text canvas.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Educator / Teacher
    participant Editor as Question Paper Editor (Client)
    participant WakeHook as JIT Activity & Wake-up Hook
    participant LocalML as FastAPI ML Microservice (S-BERT / DistilBART)
    participant CloudAI as Google Gemini Generative AI

    Teacher->>Editor: Opens Question Paper Editor
    Editor->>WakeHook: Initialize Session (autoWarm: true)
    WakeHook->>LocalML: Send JIT Wake-up Request (/health)
    LocalML-->>WakeHook: Microservice Online (CUDA/CPU Ready)
    
    Note over Editor,LocalML: Real-Time Typing & Semantic Suggestions
    Teacher->>Editor: Types question (e.g., "Explain polymorphism...")
    Editor->>Editor: Debounce Text Block (300ms)
    Editor->>LocalML: Query Reference Vector Index
    LocalML-->>Editor: Matched Reference Questions (Cosine Similarity %)
    Editor-->>Teacher: Live Suggestion Card in Sidebar

    Note over Editor,LocalML: Bloom's Taxonomy & CO Verification
    Teacher->>Editor: Selects text & clicks "Verify AI Tag"
    Editor->>LocalML: POST /suggest-metadata (Text + Syllabus COs)
    LocalML->>LocalML: Zero-Shot DistilBART (C1-C6) + S-BERT (CO Mapping)
    LocalML-->>Editor: Suggested Level (e.g., C2: Understand) & Target CO (e.g., CO1)
    Editor-->>Teacher: Displays AI Tag Card with One-Click Inline Injection

    Note over Editor,CloudAI: Generative Assistants & CS Diagrams
    Teacher->>Editor: Opens "AI Assistant (OBE Tools)" Drawer
    Teacher->>CloudAI: Generate CS Diagram / Code Snippet / Table
    CloudAI-->>Editor: Renders Native KaTeX Math / Monospace Code / Vector Tree
    Editor-->>Teacher: Formatted Block Inserted Without Word Formatting Loss
```

### 2.1 AI Creation Tools (OBE Tools Drawer)
- 🎯 **AI Verify [CO / Bloom Level]** *(OBE Tagged)*: Uses local Hugging Face Zero-Shot Classification (`DistilBART-MNLI`) to classify questions into cognitive domains (**C1: Remember, C2: Understand, C3: Apply, C4: Analyze, C5: Evaluate, C6: Create**) and Sentence-BERT (`all-MiniLM-L6-v2`) to map to the target Course Outcome (**CO1–CO12**). Injects non-destructive `[COx→Cy]` badges directly into the active paragraph.
- 📝 **Automated Question Gen**: Generates high-quality exam questions tailored to specific course topics, target marks, and designated Bloom cognitive tiers.
- 📊 **Automated Data Table**: Automatically constructs academic tables, truth tables, and comparison grids without manual HTML formatting.
- 🧮 **Math Equation Editor**: Built-in visual equation composer with native **KaTeX** rendering for complex inline and display mathematical formulas (`\( ... \)`, `$$ ... $$`).
- 📈 **CS Diagram Studio** *(Flagship Tool for Computer Science & Engineering)*:
  - Eliminates the need for external diagram tools. Teachers can generate and embed custom **Trees** (Binary Trees, AVL Trees, B-Trees), **Directed/Undirected Graphs**, **State Transition Diagrams (Finite Automata)**, and **Flow Maps** directly onto the question paper canvas.
  - Native vector-crisp rendering ensures perfect legibility when printed or exported to PDF.
- 💻 **Code Snippet Editor with Smart Output Analyzer**:
  - Solves the nightmare of Microsoft Word stripping indentation, destroying monospace fonts, and auto-capitalizing keywords in programming exams.
  - Supports **C, C++, Java, Python, and Pseudocode** with preserved indentation and custom syntax styling.
  - **Smart Output Analyzer**: Features built-in execution prediction that explains the code's runtime output, helping instructors design challenging debugging questions.
- 📄 **Paper Structure Builder**: Generates institutional exam headers, instructions to candidates, time limits, total marks, and section partitions with one click.

---

### 2.2 Text Refinement Suite (Powered by Google Gemini AI API)
When instructors highlight drafted text, the **Text Refinement** menu provides one-click AI polishing:
- ✨ **Improve Content**: Enhances academic clarity and vocabulary.
- 📝 **Shorten**: Condenses lengthy prompts to fit exam page constraints.
- 📖 **Elaborate**: Expands short questions into comprehensive problem statements.
- 📋 **Summarize**: Synthesizes case studies into digestible problem summaries.
- ✅ **Check Grammar & Spelling**: Corrects typos and grammatical irregularities.
- 🎭 **Change Tone**: Shifts prompts between formal academic, technical, or exploratory phrasing.
- 🎨 **Change Style**: Adapts question tone for undergraduate vs postgraduate assessments.
- 🌐 **Translate**: Multilingual translation for bilingual academic examination papers.

---

### 2.3 Sentence-BERT Exam Similarity Analyzer
- Encodes exam questions into high-dimensional semantic vectors using Sentence-BERT.
- Compares the draft against historical semester exams stored in MongoDB, surfacing pairwise cosine similarity matches.
- Generates side-by-side comparison modals with match percentage tags (e.g., *94% Match with Spring 2025 Midterm*) to prevent question repetition across consecutive academic cycles.

---

### 2.4 Real-Time Reference Questions Live Suggestion Engine
- **Instant 0ms In-Memory Search**: Scans pre-indexed syllabus questions using prefix matching, substring heuristics, and multi-token overlap algorithms without waiting for network responses.
- **Background Resilient Vector Sync**: Automatically re-uploads document binary blobs from browser `IndexedDB` to the microservice if cloud containers restart during idle periods.
- **Debounced Input Capture**: Uses capture-phase listeners on Syncfusion content panels to surface live question suggestions 300ms after the teacher pauses typing.

---

### 2.5 Smart Cloud Resource & Activity Keep-Alive Engine
- **Single Unified Dark-Green Notification**: During cold-starts, displays a single unified dark-emerald card (`bg-emerald-950/95 text-emerald-100 border-emerald-400/60`) informing educators that neural models are loading (~20–30s), cleanly transforming into a confirmation checkmark upon completion.
- **Zero-Overhead Activity Detection**: Uses passive capture listeners on `window` and `document` for `pointerdown`, `keydown`, `scroll`, and `wheel` throttled to 15-second write intervals (0% CPU impact, 60/120 FPS buttery-smooth typing and scrolling).
- **5-Minute Inactivity Threshold**: If the teacher does not click, type, or scroll for $\ge 5$ minutes, keep-alive heartbeats are paused. Combined with Render's 15-minute sleep policy, the container sleeps within a maximum of **20 minutes total**, saving hundreds of free-tier compute hours monthly.
- **Tab Visibility Pause**: When the user switches to other browser tabs (e.g., YouTube or university portals), heartbeats pause immediately. Returning within 15 minutes seamlessly refreshes the session without cold-starts.

---

## 📈 3. Automated OBE Reports & Accreditation Intelligence

The **Automated OBE Reports** module is a comprehensive Continuous Quality Improvement (CQI) platform designed for Washington Accord and BAETE accreditation audits.

Unlike manual Excel spreadsheets—which frequently break due to `#REF!` errors, accidental formula deletion, and student row-mismatches—the automated reporting engine computes directly from validated MongoDB assessment schemas, guaranteeing **100% mathematical accuracy**.

```mermaid
flowchart TD
    subgraph DataInputs ["Verified Input Streams"]
        ContinuousMarks["Continuous Assessment Roster (CTs, Assignments, Labs)"]
        ExamMarks["Term Exam Marks (Midterm & Final Question-Level COs)"]
        SurveyScores["Student Course Surveys (26-Item Likert Feedback)"]
        TargetKPIs["Configured Attainment Targets (Pass % & KPI %)"]
    end

    subgraph CoreEngine ["OBE Analytics Engine"]
        CourseOverviewTab["1. Course Overview\nAttainment Charts, Contribution Bars & Heatmaps"]
        SectionAnalysisTab["2. CO/PO Attainment (Section)\n16 Analytical Metrics, Grade Spread & Gauge"]
        StudentAnalysisTab["3. Student Analysis\nIndividual Student Deep-Dive Across COs/POs"]
        ComparativeTab["4. Comparative Analysis\nMulti-Student Overlay (Line & Area Charts)"]
        MappingTab["5. Mapping Details\nFull CO-PO Credit & Contribution Breakdown"]
        SWOTTab["6. SWOT Analysis\nAI-Synthesized Accreditation Audit Document"]
    end

    subgraph ExportSuite ["Audit Deliverables"]
        PDFExport["📄 Print Official PDF Report"]
        ExcelExport["📊 Export Institutional Excel (.xlsx)"]
    end

    ContinuousMarks --> CoreEngine
    ExamMarks --> CoreEngine
    SurveyScores --> CoreEngine
    TargetKPIs --> CoreEngine
    CoreEngine --> PDFExport
    CoreEngine --> ExcelExport
```

### 3.1 Deep Dive into the 6 Report Sub-Modules

#### 1. Course Overview Sub-Page
- **Course Outcomes (COs) Attainment Bar Chart**: Side-by-side vertical bars showing the percentage of students crossing the Pass Mark (40%) versus the target KPI (50%) for each Course Outcome (**CO1–CO12**).
- **CO Student Distribution Stacked Bar Chart**: Visualizes class performance bands:
  - 🔴 **Below 40%** (At-Risk Students needing remedial support)
  - 🟠 **40% – 79%** (Competent Students meeting criteria)
  - 🟢 **≥ 80%** (Exemplary High Achievers)
- **Program Outcomes (POs) Attainment Bar Chart**: Class-wide attainment percentages across all 12 Washington Accord POs.
- **PO Contribution Horizontal Bar Chart**: Shows exactly how much each Course Outcome contributes toward each Program Outcome.
- **Student CO & PO Attainment Heatmaps**: Full student-by-student matrix heatmaps color-coding individual achievement percentages across all outcomes for quick pattern identification.

#### 2. CO/PO Attainment (Section) Sub-Page
- **Section & Combined Batch Toggle**: Analyze a specific cohort (*Section B*) or aggregate across the entire academic batch.
- **16 Statistical Performance Indicators**:
  - Class Grade Distribution (Count and percentage of A+, A, A-, B+, B, C, D, F).
  - Assessment Pass Rates and standard deviation spreads.
  - Highest, lowest, and median score distributions.
  - Overall Academic Performance Gauge (radial percentage dial).
- **Top 10 Performers vs. Most At-Risk Students**: Automatically filters the top 10 students alongside the lowest-scoring students, highlighting specific deficient COs for targeted tutoring.
- **Teacher Reflection & Actionable Observations**: Dedicated inputs for faculty to document semester observations, continuous quality improvement plans, and accreditation notes.

#### 3. Student Analysis Sub-Page
- Provides a microscopic profile of any selected student, graphing their personal CO and PO attainment percentages across all course components.

#### 4. Comparative Analysis Sub-Page *(Student-by-Student Benchmark)*
- Allows instructors to select multiple students simultaneously to compare their mastery side-by-side.
- Rendered through **Area Charts and Multi-Line Charts**, showing where specific students excelled or lagged relative to their peers.

#### 5. Mapping Details Sub-Page
- Displays the complete mathematical matrix of CO-to-PO weights, contact hours, and percentage contributions toward departmental accreditation.

#### 6. AI-Powered SWOT Analysis Sub-Page
- Automatically synthesizes an institutional **SWOT Analysis** (Strengths, Weaknesses, Opportunities, Threats) based on empirical class scores:
  - **Strengths**: High-performing COs with attainment crossing target KPIs.
  - **Weaknesses**: Course Outcomes with high failure rates or low student comprehension.
  - **Opportunities**: Recommendations for curriculum adjustments, revised question formats, or tutorial sessions.
  - **Threats**: Risk factors affecting departmental accreditation under Washington Accord guidelines.

---

## 🎯 4. Student PO Recommendation System

Beyond traditional Cumulative GPA, the **PO Recommendation System** evaluates a student’s true engineering competence across all 12 Washington Accord Program Outcomes over their 4-year degree.

```mermaid
flowchart LR
    A[Student Academic History\nCompleted Courses & Marks] --> B(PO Attainment Engine\nAcross 12 Washington Accord Outcomes)
    B --> C{Eligibility Evaluation\nCGPA >= 3.50 & All POs >= 60%}
    C -->|Criteria Met| D[Eligible for Faculty Recommendation\nOfficial Dean Endorsement]
    C -->|Competency Deficit| E[Ineligible Status\nDeficit Gap Analysis]
    E --> F[Critical PO Gap Alerts\ne.g., PO1: -11.7%, PO2: -5.4%]
    F --> G[Data-Backed Intervention\nCareer & Academic Track Guidance]
    D --> H[Export PO Transcript PDF]
    G --> H
```

### 4.1 Key Capabilities
- **Longitudinal Competency Profiling**: Tracks student mastery across courses, displaying Cumulative GPA (e.g., *2.41 / 4.00*), Overall PO Average (e.g., *35.5%*), and a Recommendation Score (0–100).
- **Configurable PO Target Threshold**: Interactive slider (e.g., *60% Target Threshold*) to customize institutional standards.
- **Automated Eligibility Status**: Evaluates whether a student meets the dual criteria for official faculty recommendations (**CGPA $\ge$ 3.50 and All POs $\ge$ 60%**).
- **Critical PO Gap Detection**: Surfaces specific competency deficits with exact gap percentages:
  - *PO1: Engineering Knowledge (48.3% vs 60% Target → Deficit: -11.7% gap)*
  - *PO2: Problem Analysis (54.6% vs 60% Target → Deficit: -5.4% gap)*
  - *PO3: Design/Development of Solutions (55.0% vs 60% Target → Deficit: -5.0% gap)*
- **Data-Driven Career Guidance**: Generates personalized recommendations for specialization tracks or academic interventions based on empirical PO strengths and weaknesses.
- **Export PO Transcript**: Produces an official, print-ready PDF transcript of the student's Washington Accord competency profile.

---

## 📋 5. Washington Accord Student Course Survey Module

Replaces external Google Forms with an integrated, tamper-proof student feedback portal feeding directly into indirect attainment calculations.

- **Standardized 26-Question Bank**: Evaluates course learning outcomes and student achievement based on Washington Accord criteria.
- **5-Point Likert Scale**: Questions scored from **1 (Strongly Disagree)** to **5 (Strongly Agree)**.
- **Tokenized Public Evaluation Portal**: Generates secure, tokenized survey links allowing students to submit feedback anonymously from any device without authentication friction.
- **Automated Indirect CO Integration**: Survey submissions are aggregated mathematically to compute the **Indirect Course Outcome Attainment** score.

---

## 🛡️ 6. OBE Administrative Management & Governance Portal

The **Admin Panel** provides centralized institutional control over academic calendars, faculty accounts, and accreditation matrices.

```mermaid
graph TD
    Admin[Institutional Admin Portal] --> Teachers[Manage Teachers\nCreate, Reset Passwords, Live Status Monitor]
    Admin --> Sessions[Academic Sessions\nSpring, Summer, Fall Active Toggles]
    Admin --> Courses[Course Master Catalog\nCredits, Master CO Definitions]
    Admin --> POs[PO Management\n12 Washington Accord Definitions]
    Admin --> Batches[Batch Management\nStudent Cohorts & Intake Years]
    Admin --> Offerings[Course Offerings\nTeacher Assignment, Retakes, Replacements]
    Admin --> Requests[Teacher Requests Panel\nCO-PO Matrix Modification Governance]

    subgraph RequestWorkflow ["CO-PO Matrix Modification Workflow"]
        ReqSubmitted["Teacher Submits CO/PO Edit"] --> ReqReview["Status: In Review (Dean/HOD)"]
        ReqReview --> ViewDiff["Side-by-Side Diff Inspection"]
        ViewDiff --> Decision{"Admin Decision"}
        Decision -->|Approve| ReqApproved["Status: Approved\nMatrix Updated"]
        Decision -->|Reject| ReqRejected["Status: Rejected\nOriginal Preserved"]
    end

    Requests --> RequestWorkflow
```

### 6.1 Administrative Modules
- **Faculty Account Management**: Provision new teacher accounts (`@baiust.ac.bd`), reset passwords, and monitor real-time online/offline presence (auto-refreshing every 5 seconds).
- **Academic Session Control**: Configure academic years and semesters with active/completed status toggles.
- **Course Master Catalog**: Maintain institutional course codes, titles, credit hours, and default Course Outcomes.
- **Program Outcome Framework**: Manage Washington Accord criteria definitions.
- **Batch Directory**: Organize students into academic batches and intake cohorts.
- **Course Offerings & Faculty Reassignment**: Allocate courses to instructors by semester, batch, and section. Easily handle retake students and mid-semester faculty replacements.
- **Teacher Requests Panel (CO-PO Governance)**:
  - Review proposed edits submitted by teachers modifying Course Outcomes or the 12×12 matrix.
  - Inspect exact changes via the **View Changes Diff** modal.
  - Formal decision pipeline: **Pending**, **In Review (Dean/HOD)**, **Approved**, or **Rejected** with timestamped decision logs.

---

## 🧮 7. Mathematical Formulations

### 1. Direct Course Outcome (CO) Attainment
$$\text{CO Attainment}_i = \sum_{k=1}^{n} \left( \frac{\text{Student Mark}_k}{\text{Max Mark}_k} \times \frac{\text{Weightage}_k}{\text{Total Weightage}} \right) \times 100$$

### 2. Weighted Program Outcome (PO) Attainment
$$\text{PO Attainment}_j = \frac{\sum_{i=1}^{m} \left( \text{CO Attainment}_i \times \text{Weight}_{i,j} \right)}{\sum_{i=1}^{m} \text{Weight}_{i,j}}$$

### 3. Overall Combined Attainment
$$\text{Overall Attainment} = (80\% \times \text{Direct Attainment}) + (20\% \times \text{Indirect Survey Attainment})$$

---

## 🛠️ 8. Technology Stack Breakdown

| Category | Technology | Version / Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | `18.2.0` | Declarative UI and component state architecture |
| | Vite | `5.4.21` | High-speed frontend build and hot module replacement |
| | Tailwind CSS | `3.3.0` | Utility-first responsive styling and emerald design tokens |
| | Syncfusion RTE | `33.2.13` | Rich text authoring for examination papers |
| | KaTeX | `0.18.1` | Fast mathematical formula rendering |
| | Recharts | `2.10.3` | Interactive Bar, Radar, Pie, Area, and Line charts |
| | Lucide React | `0.294.0` | Modern SVG iconography |
| **Backend** | Node.js | `18.x / 20.x` | Asynchronous JavaScript server runtime |
| | Express.js | `5.2.1` | RESTful API routing, middleware, and request handling |
| | MongoDB & Mongoose | `9.6.0` | Document database for institutional persistence |
| | JSON Web Tokens | `9.0.3` | Secure tokenized authentication and role access |
| | Bcrypt.js | `3.0.3` | Salted password hashing |
| **ML Microservice** | Python | `3.10+` | Deep learning runtime |
| | FastAPI | `0.100+` | Asynchronous REST microservice with OpenAPI / Swagger docs |
| | PyTorch | `2.0+` (CUDA / CPU) | Tensor computation and neural model inference |
| | Sentence-Transformers | `all-MiniLM-L6-v2` | Sentence embeddings for CO mapping and paper similarity |
| | Hugging Face Transformers | `DistilBART-MNLI` | Zero-shot classification for Bloom's Taxonomy (C1–C6) |
| **Generative AI** | Google Gemini API | `Gemini 1.5 / Flash` | Generative question synthesis, text refinement, and code output analysis |

---

## 📁 9. Repository Directory Layout

```
.
├── server/                         # Express.js Application Server
│   ├── models/                     # Mongoose Schemas (User, Course, Assessment, Paper, Survey)
│   ├── routes/                     # API Routers (authRoutes, obeRoutes, uploadRoutes, notesRoutes)
│   ├── middleware/                 # JWT Auth, Upload handlers, Error interceptors
│   └── index.js                    # Express Gateway Server Entry Point
│
├── ml-service/                     # Python Deep Learning NLP Microservice
│   ├── core/                       # Configuration, Device detection (CUDA/CPU), Logger
│   ├── services/                   # Sentence-BERT & Zero-Shot inference engines
│   ├── routes/                     # FastAPI Endpoints (/suggest-metadata, /similarity, /notes)
│   ├── schemas/                    # Pydantic request & response models
│   ├── training/                   # Model fine-tuning & evaluation scripts
│   ├── requirements.txt            # Python dependencies (PyTorch, FastAPI, Transformers)
│   └── main.py                     # FastAPI Microservice Entry Point
│
├── src/                            # React 18 Single Page Application
│   ├── components/
│   │   ├── admin/                  # System Admin Panel (Users, Courses, Batches, Offerings)
│   │   ├── dashboard/              # Teacher Course Workspaces, Reference Notes Manager
│   │   ├── marks/                  # Question Paper Editor, Marks Spreadsheet, CO-PO Matrix
│   │   ├── reports/                # Radar/Bar Attainment Visuals, SWOT Analysis, CQI Reports
│   │   └── survey/                 # Washington Accord Aligned Student Survey Portal
│   ├── hooks/                      # useMLServiceWakeup (Activity tracking, Keep-alive)
│   ├── services/                   # apiService (Session GET cache), notesApi (Local search)
│   ├── App.jsx                     # Top-Level Router & Dynamic Authentication State
│   └── index.css                   # Tailwind Base Directives & Custom Emerald Design Tokens
│
├── public/                         # Logos, Favicons, and Static Assets
├── package.json                    # Node Scripts, Dependencies, and GitHub Pages Deployment
├── LICENSE                         # Proprietary Academic License Agreement
└── README.md                       # Comprehensive Platform Documentation
```

---

## 🚀 10. Installation & Local Development

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **Python**: `v3.10` or higher
- **MongoDB**: Local MongoDB community service or MongoDB Atlas connection URI

---

### Step 1: Clone Repository
```bash
git clone https://github.com/sarkarjoy86/Student-Outcome-Analyzer.git
cd Student-Outcome-Analyzer
```

### Step 2: Configure Client & Backend Environment
Create a `.env` file in the root project directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/obe_db
JWT_SECRET=your_jwt_secret_key_here
VITE_API_URL=http://localhost:5000
ML_SERVICE_URL=http://localhost:8000
```

Install Node.js dependencies:
```bash
npm install
```

---

### Step 3: Setup Python ML Microservice
Navigate to the `ml-service` directory and configure the virtual environment:

```bash
cd ml-service
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Linux / macOS
source venv/bin/activate
```

Install PyTorch and NLP dependencies:
```bash
# For NVIDIA GPUs with CUDA support (Recommended):
pip install torch --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt

# Or for standard CPU-only installation:
pip install torch -r requirements.txt
```

---

### Step 4: Launch the Full Application Suite
From the root project directory, launch all services concurrently:
```bash
npm run dev
```

The services will initialize at:
- 💻 **Frontend Web Client**: `http://localhost:5173` (or `http://localhost:3000`)
- ⚙️ **Backend Express Server**: `http://localhost:5000`
- 🧠 **ML FastAPI Service**: `http://localhost:8000` *(Interactive Swagger docs: `http://localhost:8000/docs`)*

---

## 🌐 11. Production Deployment

### Frontend (GitHub Pages)
The client application is automated for continuous deployment directly to GitHub Pages:
```bash
npm run deploy
```
*This command executes `npm run build` and publishes the production `dist/` directory to the `gh-pages` branch.*

### Backend & ML Microservice (Render / Cloud Container)
- **Node.js Server**: Configured for standard Node environments with persistent MongoDB Atlas integration.
- **Python ML Service**: Deployed as a lightweight Docker / Python web service on Render, utilizing the custom JIT wake-up hook and activity-based inactivity safeguards to run efficiently on free and standard cloud instances.

---

## 📄 12. License & Intellectual Property

**Copyright (c) 2026 Joy Sarkar & Development Team. All Rights Reserved.**

This software and its documentation are proprietary and confidential academic intellectual property developed as a Bachelor Capstone Project. Unauthorized copying, distribution, modification, reverse engineering, public deployment, or commercial exploitation is strictly prohibited without explicit written permission from the copyright holders. See `LICENSE` for complete terms.

---

<p align="center">
  <b>Developed by Joy Sarkar & His Team for Outcome-Based Education (OBE) Excellence & Accreditation Automation.</b>
</p>

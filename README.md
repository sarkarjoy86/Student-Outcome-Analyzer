# 🎓 OBE Student Outcome Analyzer

> **A Comprehensive Outcome-Based Education (OBE) Management & Analytics System**  
> *Aligned with Washington Accord Guidelines for Engineering & Higher Education Accreditations.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-brightgreen?style=for-the-badge&logo=github)](https://sarkarjoy86.github.io/Student-Outcome-Analyzer/)
[![React](https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_Tailwind-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express_%7C_MongoDB-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📌 Overview

The **OBE Student Outcome Analyzer** is a full-stack, enterprise-grade educational web application designed to automate, visualize, and streamline **Outcome-Based Education (OBE)** management. Built specifically for universities and higher education institutions, it replaces manual, error-prone Excel spreadsheets with automated calculations, real-time interactive charts, question paper generation, longitudinal student tracking, course surveys, and Continuous Quality Improvement (CQI) reports.

### 🌐 Live Web Application
👉 **[Click Here to Access the Live Application](https://sarkarjoy86.github.io/Student-Outcome-Analyzer/)**

---

## ✨ Key System Features

### 👑 1. Admin Management Portal
- **User Account Management**: Create, edit, activate/deactivate, and reset passwords for Teachers, Students, and System Administrators.
- **Academic Session Control**: Manage academic years and semesters (Spring, Summer, Fall) with active/completed status toggles.
- **Course Master Catalog**: Maintain master course definitions, course titles, credits, and default Course Outcomes (**CO1 to CO12**).
- **Program Outcomes (PO1 to PO12)**: Manage program outcomes aligned with Washington Accord criteria (*Engineering Knowledge, Problem Analysis, Design/Development, Ethics, Modern Tool Usage, etc.*).
- **Batch & Student Directory**: Group students into academic batches and maintain centralized student profiles.
- **Course Offering Assignments**: Assign courses to teachers by semester, batch, section (e.g., Section A, Section B), and academic year.
- **CO-PO Request Governance**: Review, approve, or reject teacher-submitted modifications to CO-PO matrices.

---

### 👨‍🏫 2. Teacher Dashboard & Course Workspaces
- **Course Overview Dashboard**: Live summary metrics (Total Enrolled Students, Pass Rates, KPI Status, Recent Course Activity Logs, Actionable Reminders).
- **Interactive 12x12 CO-PO Matrix**: Visual mapping matrix connecting Course Outcomes to Program Outcomes with weightage indicators.
- **Student Roster Management**: Enroll students manually or bulk-import student lists from Excel (`.xlsx`/`.xls`) files.
- **Flexible Assessment Configuration**: Define custom weightages for Class Tests (CTs), Midterm Examinations, Final Examinations, Assignments, Attendance, Performance, and Presentations.
- **Comprehensive Marks Entry Spreadsheet**: High-speed, Excel-like spreadsheet interface for entering marks question-by-question with instant auto-summing and validation.

---

### 📝 3. Question Archives & Assessment Paper Generator
- **Rich Text Editor**: Integrated `@syncfusion/ej2-react-richtexteditor` for composing complex question papers.
- **LaTeX Math Equation Support**: Native **KaTeX** rendering for inline and display mathematical formulas (`\( ... \)`, `$$ ... $$`).
- **Bloom's Taxonomy & CO-PO Alignment**: Tag individual questions with Bloom's Taxonomy cognitive levels, CO mapping, and maximum marks.
- **University Branding & Export**: Automatic inclusion of institutional headers, course codes, time limits, total marks, and **Print/PDF Download** capabilities.

---

### 📊 4. Real-Time Attainment & Analytics Engine
- **Direct CO Attainment**: Automated calculation of student percentage scores against configured KPI thresholds (e.g., 40% pass mark, 50% target KPI).
- **Indirect CO Attainment**: Integrated Student Course Survey module measuring student self-assessment.
- **Combined PO Attainment**: Weighted mathematical aggregation of Direct and Indirect attainment scores.
- **Interactive Visualizations (Recharts)**:
  - 📊 **Bar Charts**: Class CO & PO attainment distributions.
  - 🕸️ **Radar Charts**: Multi-dimensional Program Outcome coverage profiles.
  - 🥧 **Pie Charts**: Grade and score distribution breakdowns.
  - 📈 **Line Charts**: Comparative student outcome progress.

---

### 🧠 5. PO Recommendation & SWOT Analysis
- **Longitudinal Student Profiling**: Track individual student performance across multiple semesters and courses.
- **Data-Backed Career Recommendations**: Automated recommendation engine suggesting specialization tracks or academic intervention based on weak PO metrics.
- **Continuous Quality Improvement (CQI)**: Generate automated **SWOT Reports** (Strengths, Weaknesses, Opportunities, Threats) for academic audit and accreditation preparation.

---

### 📋 6. Course Evaluation & Survey Module
- **Washington Accord Aligned Surveys**: Pre-built and customizable course outcome survey questionnaires.
- **Public Feedback Portal**: Tokenized evaluation links for anonymous or authenticated student survey submission.
- **Analytics & Report Generation**: Visual feedback scores, rating breakdowns, and summary statistics.

---

### ⚡ 7. High-Performance Session Caching
- **Single Load Architecture**: Automatic session-level caching of API GET responses (`sessionStorage` + In-Memory Map).
- **Instant Tab Switching**: Instantaneous 0ms switching between dashboard tabs with zero redundant database queries or loading spinners.
- **Automatic Invalidation**: Write operations (`POST`, `PUT`, `DELETE`) automatically clear cache to ensure real-time data accuracy.

---

## 🛠️ Technology Stack

### **Frontend**
- **Core Framework**: React 18 (Vite build tool)
- **Styling**: Tailwind CSS, Vanilla CSS animations
- **Iconography**: Lucide React
- **Data Visualization**: Recharts
- **Math Rendering**: KaTeX
- **Rich Text Editing**: Syncfusion EJ2 React Rich Text Editor
- **Excel & Document Parsing**: XLSX (SheetJS), Mammoth
- **Canvas / Export**: html2canvas

### **Backend**
- **Runtime Engine**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Security & Authentication**: JSON Web Tokens (JWT), Bcrypt.js password hashing, CORS, Cookie Parser
- **Development Utility**: Nodemon, Concurrently

---

## 🧮 Calculation Logic & Formulas

### 1. Direct Course Outcome (CO) Attainment
$$\text{CO Score}_i = \sum_{k=1}^{n} \left( \frac{\text{Student Mark}_k}{\text{Max Mark}_k} \times \frac{\text{Assessment Max}_k}{\text{Total CO Max}} \right) \times 100$$

### 2. Direct Program Outcome (PO) Attainment
$$\text{PO Attainment}_j = \frac{\sum \left( \text{CO Attainment}_i \times \text{Mapping Weight}_{i,j} \right)}{\sum \text{Mapping Weight}_{i,j}}$$

### 3. Overall Combined Attainment
$$\text{Overall Attainment} = (80\% \times \text{Direct Attainment}) + (20\% \times \text{Indirect Survey Attainment})$$

---

## 📁 Repository Structure

```
.
├── server/                         # Express.js & MongoDB Backend
│   ├── models/                     # Mongoose Schema Definitions (User, Course, Marks, etc.)
│   ├── routes/                     # RESTful API Endpoints (Auth, OBE, Survey, Admin)
│   ├── middleware/                 # Auth & Error Handling Middlewares
│   └── index.js                    # Express Server Entry Point
│
├── src/                            # React 18 Frontend Application
│   ├── components/
│   │   ├── admin/                  # Admin Management Portal & System Control
│   │   ├── auth/                   # Authentication & Login Components
│   │   ├── course/                 # Assessment & CO-PO Setup Components
│   │   ├── dashboard/              # Teacher Dashboard & Overview Workspaces
│   │   ├── evaluation/             # Course Feedback & Analytics
│   │   ├── layout/                 # Navigation Sidebar, Headers, Profile Avatars
│   │   ├── marks/                  # Question Paper Editor & Spreadsheet Entry
│   │   ├── reports/                # SWOT, PO Recommendations & Attainment Reports
│   │   ├── students/               # Student Roster & Excel Import
│   │   └── survey/                 # Student Course Survey Portal
│   ├── context/                    # AuthContext & Global State Managers
│   ├── services/                   # apiService with Session GET Cache
│   ├── utils/                      # Calculation Helpers, Excel Parsers, Chart Downloads
│   ├── App.jsx                     # Core Application Component & Routing
│   └── main.jsx                    # React Virtual DOM Entry Point
│
├── public/                         # Static Assets & Logos
├── package.json                    # Project Dependencies & Deployment Scripts
└── README.md                       # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI

---

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sarkarjoy86/Student-Outcome-Analyzer.git
   cd Student-Outcome-Analyzer
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/obe_db
   JWT_SECRET=your_secret_jwt_key_here
   VITE_API_URL=http://localhost:5000
   ```

4. **Run the Development Application**:
   ```bash
   # Starts both Express backend server & Vite frontend client concurrently
   npm run dev
   ```
   - **Frontend App**: `http://localhost:3000` (or `http://localhost:5173`)
   - **Backend API**: `http://localhost:5000`

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both Node.js server and Vite client concurrently in development mode |
| `npm run build` | Compiles and builds production-ready static assets in `dist/` |
| `npm run preview` | Previews the compiled production build locally |
| `npm run deploy` | Builds the project and deploys the `dist/` directory to **GitHub Pages** |

---

## 🌐 Deployment to GitHub Pages

This project includes automated GitHub Pages deployment configuration via `gh-pages`:

```bash
npm run deploy
```
*This command executes `predeploy` (`npm run build`) and publishes the bundle directly to the `gh-pages` branch.*

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check out the **[Issues Page](https://github.com/sarkarjoy86/Student-Outcome-Analyzer/issues)**.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.

---

<p align="center">
  Developed with ❤️ by <b>Joy Sarkar</b> for Outcome-Based Education (OBE) Excellence.
</p>

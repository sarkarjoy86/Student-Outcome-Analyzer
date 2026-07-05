# Agent Prompt: Build OBE Course Outcome Attainment System

## Project Overview

Build a comprehensive full-stack React + Node.js + MongoDB application called "OBE Course Outcome Attainment System" for tracking and visualizing Course Outcome (CO) and Program Outcome (PO) attainment in Outcome-Based Education systems.

**Key Purpose**: Automate the entire process from student data upload through Excel file parsing, CO-PO mapping, assessment configuration, marks entry, and comprehensive reporting with advanced visualizations.

---

## Technology Stack

### Frontend

- **React 18** with **Vite 5.0.8** as build tool
- **Tailwind CSS 3.3.6** for styling
- **Recharts 2.10.3** for data visualization (bar, radar, pie, line charts)
- **Lucide React 0.294.0** for icons
- **XLSX 0.18.5** for Excel file parsing
- **html2canvas 1.4.1** for chart downloads

### Backend

- **Node.js** runtime
- **Express 5.2.1** as web framework
- **MongoDB** with **Mongoose 9.6.0** ODM
- **JWT (jsonwebtoken 9.0.3)** for authentication
- **bcryptjs 3.0.3** for password hashing
- **CORS 2.8.6** for cross-origin requests
- **dotenv 17.4.2** for environment variables

### Dev Tools

- **concurrently 9.2.1** to run server and client simultaneously
- **nodemon 3.1.14** for auto-reload during development

---

## Project Structure

### Root Configuration Files

- `package.json` - Main project dependencies and scripts
- `vite.config.js` - Vite configuration with proxy to backend API
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `index.html` - HTML entry point

### Server Directory (`server/`)

```
server/
├── index.js              (Main server file with Express setup)
├── package.json          (Backend dependencies)
├── config/               (Database and environment config)
├── lib/
│   └── db.js             (MongoDB connection setup)
├── middleware/
│   └── auth.js           (JWT authentication middleware)
├── models/
│   └── User.js           (User MongoDB schema)
├── routes/
│   └── authRoutes.js     (Authentication endpoints)
└── utils/
    └── auth.js           (JWT token utilities)
```

### Frontend Directory (`src/`)

```
src/
├── main.jsx              (React entry point)
├── App.jsx               (Root component with workflow state)
├── index.css             (Global styles)
├── components/
│   ├── ComprehensiveExcelUpload.jsx    (Step 1: File upload)
│   ├── CourseInfo.jsx                   (Step 2: Course details)
│   ├── COPOMapping.jsx                  (Step 3: CO-PO matrix)
│   ├── AssessmentConfig.jsx             (Step 4: Assessment setup)
│   ├── ComprehensiveMarksEntry.jsx      (Step 5: Marks entry)
│   ├── KPIConfig.jsx                    (Step 6: KPI settings)
│   ├── ComprehensiveReports.jsx         (Step 7: Reporting)
│   ├── Results.jsx                      (Report visualizations)
│   ├── ResultsDashboard.jsx             (Dashboard overview)
│   ├── Sidebar.jsx                      (Navigation)
│   ├── ProfileAvatar.jsx                (User profile)
│   ├── UploadComponent.jsx              (Reusable upload)
│   ├── auth/
│   │   └── AuthCard.jsx                 (Login/Register)
│   └── admin/
│       └── AdminDashboard.jsx           (Admin panel)
├── context/
│   └── AuthContext.jsx                  (Global auth state)
├── services/
│   └── localStorageService.js           (Data persistence)
├── utils/
│   ├── calculations.js                  (Basic calculations)
│   ├── comprehensiveCalculations.js     (Excel-formula calculations)
│   ├── excelParser.js                   (Excel parsing logic)
│   └── chartDownload.js                 (Export functionality)
└── config/
    └── (Optional Firebase config)
```

---

## 7-Step Workflow

### Step 1: Upload Students

- **Component**: ComprehensiveExcelUpload.jsx
- **Input**: Excel (.xlsx, .xls) or CSV file
- **Required Columns**: Student ID, Name (flexible column detection)
- **Output**: Array of students with ID and Name
- **Features**:
  - Automatic column detection for Student ID and Name
  - Fallback to localStorage if not configured
  - Auto-save to localStorage

### Step 2: Course Information

- **Component**: CourseInfo.jsx
- **Fields to Capture**:
  - Course Code
  - Course Title
  - Department
  - Academic Year
  - Semester
  - Section
- **Output**: courseInfo object
- **Features**: Auto-save after each field update

### Step 3: CO-PO Mapping

- **Component**: COPOMapping.jsx
- **Matrix**: 12x12 (Course Outcomes × Program Outcomes)
- **Features**:
  - Interactive cell clicking to toggle mappings
  - Display totals for each PO at bottom
  - Visual feedback on mapped cells
- **Output**: 12x12 boolean matrix
- **Auto-save**: On each cell click

### Step 4: Assessment Configuration

- **Component**: AssessmentConfig.jsx
- **Assessment Types**:
  1. Class Tests (CTs)
  2. Mid Term
  3. Final
  4. Assignments
  5. Attendance
  6. Performance
- **For Each Type**:
  - Input max marks
  - Allocate marks to each CO (CO1-CO12)
  - Total allocated marks must equal max marks
- **Output**: assessments array with full config
- **Auto-save**: After configuration

### Step 5: Marks Entry

- **Component**: ComprehensiveMarksEntry.jsx
- **Features**:
  - Tabbed interface (one tab per assessment type)
  - Grid showing all students and their marks
  - Input fields for each student's marks for that assessment
  - Real-time validation (marks ≤ max marks)
  - Auto-save on each entry
- **Output**: marksData object with structure: `{ studentId: { assessmentType: marks } }`

### Step 6: KPI Configuration

- **Component**: KPIConfig.jsx
- **Configuration Options**:
  - **Target Pass Marks**: Default 40% (percentage threshold)
  - **KPI for COs**: Default 50% (attainment target for CO)
  - **KPI for POs**: Default 50% (attainment target for PO)
- **Output**: kpiConfig object
- **Auto-save**: On value change

### Step 7: Reports & Visualization

- **Component**: ComprehensiveReports.jsx
- **Report Views**:
  1. **Overview**: Class-level statistics
     - Bar charts for CO and PO attainment (dual metrics: pass marks vs KPI)
     - Data tables with color coding (red/green)
     - Radar chart for PO visualization
  2. **Individual Student**: Single student details
     - Pie chart showing CO performance
     - Radar chart for PO mapping
     - Detailed metrics table
  3. **Compare Students**: Multi-student comparison
     - Line charts comparing students across COs
     - Comparative metrics table

- **Export Features**:
  - Download reports as JSON
  - Download visualizations as PNG images
  - Display all data in responsive tables

---

## Calculation Logic (Excel-Formula Based)

### CO Attainment Score

```
For each student and CO:
  CO Score = Sum of [
    for each assessment mapped to this CO:
      ((Student Mark / Assessment Max Mark)
       × (Assessment Max Mark / Total Max Marks for this CO))
  ] × 100

Result: CO scores as percentages (0-100)
```

### PO Attainment Score

```
For each student and PO:
  PO Score = Weighted Average of related CO scores
  Weight = Total marks allocated to each CO in assessments

Result: PO scores as percentages (0-100)
```

### Class-Level Metrics

```
% Above Pass Marks = (Count of students with score > Pass Marks threshold / Total students) × 100
% Above KPI = (Count of students with score > KPI threshold / Total students) × 100
```

**Implementation**: Create `comprehensiveCalculations.js` with these exact formulas.

---

## Data Structures

### Student Object

```json
{
  "id": "STU001",
  "name": "John Doe"
}
```

### Course Info Object

```json
{
  "code": "CS101",
  "title": "Data Structures",
  "department": "Computer Science",
  "academicYear": "2024-2025",
  "semester": "1",
  "section": "A"
}
```

### Assessment Object

```json
{
  "type": "CT",
  "maxMarks": 20,
  "coAllocations": {
    "CO1": 5,
    "CO2": 5,
    "CO3": 5,
    "CO4": 5
  }
}
```

### Marks Data

```json
{
  "STU001": {
    "CT": 18,
    "MidTerm": 35,
    "Final": 65,
    "Assignment": 8,
    "Attendance": 9,
    "Performance": 8
  }
}
```

### CO-PO Mapping (12x12 Matrix)

```json
[
  [true, false, true, ...],  // CO1 mappings
  [false, true, false, ...], // CO2 mappings
  ...
]
```

### KPI Config

```json
{
  "targetPassMarks": 40,
  "kpiCO": 50,
  "kpiPO": 50
}
```

---

## Data Persistence Strategy

1. **Browser localStorage** (Immediate)
   - Auto-save after each step
   - Survives page reloads
   - Fast local access
   - Use `localStorageService.js` for all operations

2. **MongoDB** (Optional)
   - Persistent storage
   - User-specific data
   - Historical tracking
   - Implement in routes if needed

3. **Firebase Firestore** (Optional)
   - Cloud-based backup
   - Real-time sync capability
   - Can be configured later

**Implementation**: Always save to localStorage. Optionally sync to MongoDB/Firebase.

---

## Authentication System

### Features Required

- **Registration**: Create new user account with email
- **Login**: Authenticate with email/password
- **JWT Tokens**: Secure token-based authentication
- **Protected Routes**: Only authenticated users can access features
- **Token Refresh**: Refresh tokens for extended sessions

### Backend Routes (in `server/routes/authRoutes.js`)

```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login user
POST /api/auth/verify       - Verify JWT token
POST /api/auth/refresh      - Refresh token
```

### User Model (MongoDB)

```json
{
  "_id": ObjectId,
  "name": "string",
  "email": "string (unique)",
  "password": "hashed string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Frontend Context (AuthContext.jsx)

- `user` object containing authenticated user info
- `authLoading` boolean for loading state
- `message` string for feedback messages
- `login()`, `register()`, `logout()` functions

---

## UI/UX Components

### Sidebar Navigation

- Step indicators (1-7)
- Current step highlight
- Navigation between steps (once previous steps completed)
- User profile section

### Chart Visualizations

- **Bar Charts**: CO/PO attainment with dual metrics
- **Radar Charts**: PO circular visualization
- **Pie Charts**: CO distribution for individual students
- **Line Charts**: Multi-student comparison
- All charts interactive with hover tooltips
- Export to PNG capability

### Forms & Input

- Responsive form layouts
- Input validation with error messages
- Auto-save feedback
- Tabbed interfaces for multiple sections
- Matrix-based interactions (CO-PO mapping)

---

## Key Implementation Notes

1. **Excel Parsing** (`excelParser.js`)
   - Handle both .xlsx and .csv formats
   - Automatic column detection (prioritize "name" keyword, exclude ID columns)
   - Handle edge cases and ambiguous headers
   - Extract numeric data correctly

2. **Responsive Design**
   - Mobile-first approach with Tailwind CSS
   - Responsive tables and charts
   - Mobile-friendly navigation

3. **Calculation Engine**
   - Match Excel formulas exactly
   - Handle edge cases (division by zero, no data)
   - Cache calculations for performance
   - Recalculate when data changes

4. **State Management**
   - Use React hooks (useState, useContext)
   - Centralized auth state in AuthContext
   - Component-level state for forms
   - Global data in App.jsx

5. **Error Handling**
   - Try-catch blocks for file operations
   - Validation before calculations
   - User-friendly error messages
   - Graceful fallbacks

---

## Environment Setup

### `.env` (Root Directory)

```
VITE_API_URL=http://localhost:5000/api
```

### `.env` (Server Directory)

```
MONGODB_URI=mongodb://localhost:27017/obe-system
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

---

## Scripts to Add to `package.json`

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "client": "vite",
    "server": "nodemon server/index.js",
    "build": "vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

---

## Deployment

- **Frontend**: Deploy to GitHub Pages or Vercel
- **Backend**: Deploy to Heroku, Railway, or similar
- **Database**: MongoDB Atlas (cloud) or self-hosted
- **Environment Variables**: Configure in deployment platform

---

## Testing Considerations

- Unit tests for calculation functions
- Integration tests for API endpoints
- E2E tests for complete workflow
- Test data: Sample Excel file with known students and marks

---

## Additional Features (Optional)

- Dark mode toggle
- Multi-language support
- Data import/export in multiple formats
- Collaborative features (multiple instructors)
- Historical data tracking
- Advanced filtering and search
- Role-based access control (Admin, Instructor, Student)

---

## Success Criteria

✓ All 7 workflow steps implemented and functional
✓ Excel parsing works with various file formats
✓ CO-PO mapping 12x12 matrix interactive
✓ Calculations match Excel formulas exactly
✓ Reports display all required visualizations
✓ Data persists in localStorage
✓ Authentication system working
✓ Responsive design on all devices
✓ Export functionality working
✓ No console errors in development

---

## Start Development

1. Clone/create project
2. Install dependencies: `npm install` + `npm install` (in server/)
3. Set up MongoDB and .env files
4. Run: `npm run dev`
5. Navigate to: http://localhost:3000
6. Follow the 7-step workflow to test

# OBE Course Outcome Attainment System

A comprehensive React application for tracking and visualizing Course Outcome (CO) and Program Outcome (PO) attainment in Outcome-Based Education (OBE) systems. This system automates the entire process from student data upload to comprehensive reporting, replacing manual Excel-based calculations.

## Features

- 📊 **Student List Upload**: Upload Excel (.xlsx, .xls) or CSV files containing Student ID and Name columns (fixed name extraction bug)
- 📚 **Course Information**: Input course details (Code, Title, Department, Academic Year, Semester, Section)
- 🔗 **CO-PO Mapping**: Interactive 12x12 matrix for mapping Course Outcomes to Program Outcomes
- ⚙️ **Assessment Configuration**: Configure multiple assessment types:
  - Class Tests (CTs)
  - Mid Term exams
  - Final exams
  - Assignments
  - Attendance
  - Performance
- 📝 **Comprehensive Marks Entry**: Tabbed interface for entering marks by assessment type with CO allocation
- 📈 **Automated Calculations**: Excel-formula-based calculations for CO and PO attainment percentages
- 📉 **Advanced Data Visualization**: 
  - Bar charts for CO/PO attainment
  - Radar charts for PO visualization
  - Pie charts for individual student CO performance
  - Line charts for student comparison
- 👥 **Individual Student Tracking**: View and compare individual student performance across COs and POs
- 📋 **Comprehensive Reports**: Detailed tables and visualizations matching Excel report format
- 💾 **Data Persistence**: Firebase integration with localStorage fallback for data storage
- 💾 **Report Export**: Download comprehensive reports as JSON

## Tech Stack

- **React 18** with Vite
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Recharts** for data visualization
- **XLSX** for Excel file reading

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

### Step 1: Upload Excel File
- Upload a comprehensive Excel file containing:
  - Assessment configuration table in upper rows (Assessment Type, Max Marks, CO mapping)
  - Student data table with Student ID, Name, and marks for all assessments
- The system will automatically extract:
  - Student information (ID and Name)
  - Assessment configuration (CTs, Mid Term, Final, Assignments, Attendance, Performance)
  - All student marks for each assessment
  - CO allocations for each assessment
- Data is automatically saved to localStorage

### Step 2: CO-PO Mapping
- Map Course Outcomes (CO1-CO12) to Program Outcomes (PO1-PO12)
- Click cells in the 12x12 matrix to create mappings
- View totals for each PO at the bottom
- Data is automatically saved

### Step 3: KPI Configuration
- Set Target Pass Marks (default: 40%)
- Set KPI for COs (default: 50%)
- Set KPI for POs (default: 50%)
- Data is automatically saved

### Step 4: View Reports
- **Overview**: Class-level CO and PO attainment charts and tables
- **Individual Student**: View individual student performance with pie charts and radar charts
- **Compare Students**: Compare multiple students using line charts
- Download comprehensive reports as JSON
- All data persists in localStorage (survives page reloads)

## Calculation Logic

### CO Attainment (Based on Excel Formulas)
- **CO Score for Student**: 
  ```
  Sum of ((Student Mark / Max Mark) × (Assessment Max / Total CO Max)) × 100
  ```
  - For each assessment mapped to a CO:
    - Calculate student's percentage: (Student Mark / Assessment Max Marks)
    - Calculate weight: (Assessment Max Marks / Total Max Marks for that CO)
    - Multiply percentage × weight
  - Sum all assessments and multiply by 100

### PO Attainment
- **PO Score for Student**: Weighted average of related CO scores
  - Weight is based on total marks allocated to each CO
  - Only COs mapped to the PO are included

### Class-Level Attainment
- **% Above Pass Marks**: (Count of students with score > Pass Marks / Total students) × 100
- **% Above KPI**: (Count of students with score > KPI / Total students) × 100

### Thresholds (Configurable)
- **Target Pass Marks**: Default 40% (configurable)
- **KPI for COs**: Default 50% (configurable)
- **KPI for POs**: Default 50% (configurable)

## File Structure

```
src/
  components/
    Sidebar.jsx                  # Navigation sidebar
    UploadComponent.jsx          # Student list upload (fixed name extraction)
    CourseInfo.jsx              # Course information input
    COPOMapping.jsx             # CO-PO mapping matrix (12x12)
    AssessmentConfig.jsx        # Assessment configuration
    ComprehensiveMarksEntry.jsx # Multi-tab marks entry system
    KPIConfig.jsx               # KPI configuration
    ComprehensiveReports.jsx   # Comprehensive reports with multiple chart types
  utils/
    comprehensiveCalculations.js # Excel-formula-based CO/PO calculation engine
  services/
    firebaseService.js          # Firebase data persistence service
  config/
    firebase.js                # Firebase configuration
  App.jsx                      # Main application component
  main.jsx                     # Application entry point
  index.css                    # Global styles
```

## Data Persistence

The system uses **localStorage** for data persistence. All data is automatically saved as you progress through the steps:
- Excel data extraction
- CO-PO mapping
- KPI configuration
- Report data

**Benefits:**
- No backend setup required
- Data persists across page reloads
- Works offline
- Fast and reliable

**Note**: Data is stored in browser localStorage. To clear data, clear your browser's local storage.

## Notes

- The system handles division by zero gracefully (using 0.00000001 as fallback)
- All calculations match Excel formulas exactly
- Data is automatically saved to localStorage as you progress (no backend required)
- The Excel parser automatically extracts assessment configuration and student marks
- Supports up to 12 Course Outcomes (CO1-CO12) and 12 Program Outcomes (PO1-PO12)
- Individual student data is tracked for detailed analysis and comparison
- Data persists across page reloads and browser sessions

## 🌐 Live Website

**The application is now deployed and live!**

- **URL**: https://sarkarjoy86.github.io/Student-Outcome-Analyzer/
- **Deployment Method**: GitHub Pages
- **Status**: ✅ Active and accessible

You can access the live website directly without needing to run the development server locally.

## License

MIT

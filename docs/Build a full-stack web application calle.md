Build a full-stack web application called "OBE Course Outcome Attainment System" for managing Outcome-Based Education (OBE) assessment and reporting.

Project goal:
Create a modern, responsive web application that allows teachers to manage students, course outcomes (COs), program outcomes (POs), assessments, marks, and generate detailed reports and visual analytics for CO/PO attainment.

Core purpose:
Replace manual Excel-based evaluation with a digital workflow that supports:

- student enrollment
- course and section management
- CO-PO mapping
- assessment setup
- marks entry
- KPI configuration
- report generation with charts and tables

Tech stack:

- Frontend: React.js with Vite
- Styling: Tailwind CSS
- Charts: Recharts
- Icons: Lucide React
- Excel handling: XLSX
- Backend: Node.js with Express
- Database: MongoDB with Mongoose
- Authentication: JWT + bcryptjs
- Environment variables: dotenv
- Deployment: optional Vercel/Render/GitHub Pages

Required features:

1. Authentication
   - Login and signup screens
   - JWT-based authentication
   - Password hashing with bcryptjs
   - Protected routes for authenticated users

2. Dashboard
   - Show a dashboard with course offerings
   - Allow creation of new academic course offerings
   - Allow selection of a course offering to continue the workflow

3. Student management
   - Add students manually
   - Upload student lists from Excel or CSV
   - Extract Student ID and Student Name automatically
   - Enroll students into a course offering

4. Course/section information
   - Capture course code, course title, department, academic year, semester, and section

5. CO-PO mapping
   - Provide an interactive matrix for mapping COs to POs
   - Support up to 12 COs and 12 POs
   - Allow toggling mapping cells on/off
   - Save mapping persistently

6. Assessment configuration
   - Support assessment types such as:
     - Class Tests (CTs)
     - Mid Term
     - Final
     - Assignments
     - Attendance
     - Performance
   - For each assessment, allow:
     - name
     - max marks
     - CO allocation

7. Marks entry
   - Provide an intuitive tabbed interface for entering marks
   - Each assessment type should have its own tab
   - Validate marks so they do not exceed max marks
   - Save marks for each student

8. KPI configuration
   - Set target pass marks
   - Set KPI for CO attainment
   - Set KPI for PO attainment
   - Default values: pass marks = 40%, CO KPI = 50%, PO KPI = 50%

9. Reports and analytics
   - Show class-level CO attainment
   - Show class-level PO attainment
   - Show individual student performance
   - Show comparison between students
   - Include charts such as:
     - bar charts
     - pie charts
     - radar charts
     - line charts
   - Show tables with color-coded attainment results

10. Data persistence

- Save data to MongoDB
- Use localStorage fallback if needed
- Ensure data survives refresh

Expected workflow:
Step 1: Student management
Step 2: Course information
Step 3: CO-PO mapping
Step 4: Assessment setup
Step 5: Marks entry
Step 6: KPI configuration
Step 7: Reports and results

Backend requirements:

- Create REST API endpoints for:
  - authentication
  - academic sessions
  - courses
  - course offerings
  - students
  - enrollments
  - assessments
  - marks
  - report data
- Use proper validation and error handling
- Implement secure JWT auth middleware

Database schema requirements:
Create MongoDB models for:

- User
- AcademicSession
- Course
- CourseOffering
- Student
- Enrollment
- Assessment
- Marks

Suggested data structures:

- Student: { id, name }
- CourseOffering: { course, teacher, semester, section, coPoMapping, targetPassMarks, kpiCO, kpiPO }
- Assessment: { courseOffering, type, name, maxMarks, co }
- Marks: { student, assessment, courseOffering, mark }

Calculation logic requirements:
Implement CO and PO attainment calculations similar to Excel-based weighted formulas:

- CO score for a student should be weighted based on assessment marks and the total marks allocated to that CO
- PO score should be derived from the related COs
- Class-level attainment should calculate the percentage of students above pass marks and above KPI

UI/UX requirements:

- Clean and professional design
- Responsive layout for desktop and mobile
- Step-by-step workflow with navigation
- Modern cards, gradients, and good spacing
- Clear validation messages and success/error feedback

Implementation notes:

- Follow a modular component-based architecture
- Keep the frontend organized into components, services, context, utils, and styles
- Use reusable components where possible
- Implement smooth state transitions between workflow steps
- Make the app feel like a practical academic management tool, not just a demo

Deliverables:

1. Complete frontend application
2. Complete backend API
3. MongoDB database models and routes
4. Authentication system
5. Excel/CSV import support
6. CO/PO assessment workflow
7. Charts and report generation
8. Working project structure ready to run locally

Important:

- Make the project production-ready in structure
- Use clear comments and maintainable code
- Ensure the app can be launched with a simple command
- Prioritize correctness of calculations and usability over unnecessary complexity

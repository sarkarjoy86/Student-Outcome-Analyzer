import React, { useState, useEffect, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie,
} from 'recharts';
import {
  Award, AlertTriangle, CheckCircle2, XCircle, Search, User, Users,
  GraduationCap, Save, TrendingUp, RefreshCw, ShieldAlert, Loader2,
  BookOpen, Check, Filter, ArrowUpDown, ChevronDown, ChevronUp, Eye,
  Layers, BarChart2, Lightbulb, Activity, Target, CheckCheck,
  ChevronRight, BookCheck, Info, Sparkles, Copy, Printer, Edit3, FileText,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { generateBatchLevelCQI } from '../../services/cqiAiService';
import BatchCQIFacultyMeetingModal from './BatchCQIFacultyMeetingModal';

const PO_NAMES = {
  PO1: 'Engineering knowledge', PO2: 'Problem analysis', PO3: 'Design/development of solutions',
  PO4: 'Investigation', PO5: 'Modern tool usage', PO6: 'The engineer and society',
  PO7: 'Environment & sustainability', PO8: 'Ethics', PO9: 'Individual work and teamwork',
  PO10: 'Communication', PO11: 'Project management and finance', PO12: 'Life-long learning',
};

const WA_CLUSTERS = [
  { label: 'Technical Foundations', short: 'Technical', pos: ['PO1','PO2','PO3','PO4'], bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', fill: '#6366f1', desc: 'Knowledge, Analysis, Design & Investigation' },
  { label: 'Modern Engineering & Society', short: 'Modern Practice', pos: ['PO5','PO6','PO7','PO8'], bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', fill: '#10b981', desc: 'Tools, Society, Environment & Ethics' },
  { label: 'Professional & Lifelong Skills', short: 'Professional', pos: ['PO9','PO10','PO11','PO12'], bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', fill: '#f59e0b', desc: 'Teamwork, Communication, Management & Learning' },
];

const CQI_REMEDIATION = {
  PO1: 'Strengthen theory-practice integration via lab-linked lectures and concept mapping exercises.',
  PO2: 'Introduce case-based problem solving workshops and reflective assignment rubrics.',
  PO3: 'Embed design projects in capstone/elective modules with iterative peer review cycles.',
  PO4: 'Incorporate mini-research investigations and student-led data analysis practicals.',
  PO5: 'Mandate hands-on tool labs (simulation software, IDEs, version control) with tool-specific grading rubrics.',
  PO6: 'Integrate engineering ethics case studies and societal impact assessments in project deliverables.',
  PO7: 'Add environmental impact analysis components to design projects and final reports.',
  PO8: 'Introduce professional ethics seminars, IEEE/ACM code of ethics modules, and reflective journals.',
  PO9: 'Mandate structured group projects with peer evaluation, clear role assignment, and conflict resolution protocols.',
  PO10: 'Require technical presentations, progress reports, and written documentation in all major assessments.',
  PO11: 'Incorporate project planning tools (Gantt charts, budget estimations) in capstone and design courses.',
  PO12: 'Promote self-directed learning through literature reviews, online certifications, and course reflections.',
};

const SECTION_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function computeProfileFromCourses(courses, threshold) {
  if (!courses || courses.length === 0) {
    return {
      cgpa: 0, overallPoAttainment: 0, recommendationScore: 0,
      recommendationStatus: 'No Courses Selected', weakPOs: [], strongPOs: [],
      totalCOsEvaluated: 0, totalCOsPassed: 0, coSuccessRate: 0,
      longitudinalPOs: Array.from({ length: 12 }, (_, i) => ({
        po: `PO${i + 1}`, name: PO_NAMES[`PO${i + 1}`], attainment: 0, threshold,
        isPassed: false, mappedCredits: 0, evaluatedCoursesCount: 0,
      })),
    };
  }
  let totalCreditPoints = 0, totalCredits = 0;
  let totalCOsEvaluated = 0, totalCOsPassed = 0;

  courses.forEach(c => {
    const cr = parseFloat(c.creditHours) || 3;
    const gp = parseFloat(c.gradePoint) || 0;
    totalCreditPoints += gp * cr; totalCredits += cr;

    if (Array.isArray(c.coAttainments) && c.coAttainments.length > 0) {
      c.coAttainments.forEach(co => {
        totalCOsEvaluated++;
        const coAtt = parseFloat(co.attainment) || 0;
        if (coAtt >= threshold) totalCOsPassed++;
      });
    } else if (c.totalCOCount) {
      totalCOsEvaluated += c.totalCOCount;
      totalCOsPassed += (c.achievedCOCount || 0);
    }
  });

  const coSuccessRate = totalCOsEvaluated > 0 ? Math.round((totalCOsPassed / totalCOsEvaluated) * 1000) / 10 : 0;
  const cgpa = totalCredits > 0 ? Math.round((totalCreditPoints / totalCredits) * 100) / 100 : 0;
  const poWS = {}, poCS = {}, poCC = {};
  for (let p = 1; p <= 12; p++) { poWS[`PO${p}`] = 0; poCS[`PO${p}`] = 0; poCC[`PO${p}`] = 0; }
  courses.forEach(c => {
    const cr = parseFloat(c.creditHours) || 3;
    const pa = c.poAttainments || {};
    Object.keys(pa).forEach(rawKey => {
      const k = rawKey.toUpperCase().replace(/\s+/g, '');
      if (poWS[k] !== undefined) {
        const v = parseFloat(pa[rawKey]) || 0;
        if (v > 0) { poWS[k] += v * cr; poCS[k] += cr; poCC[k]++; }
      }
    });
  });
  let sumPO = 0;
  const longitudinalPOs = [], weakPOs = [], strongPOs = [];
  for (let p = 1; p <= 12; p++) {
    const k = `PO${p}`;
    const w = poCS[k];
    const att = w > 0 ? Math.round((poWS[k] / w) * 10) / 10 : 0;
    sumPO += att;
    const isPassed = att >= threshold;
    const poObj = { po: k, name: PO_NAMES[k], attainment: att, threshold, isPassed, mappedCredits: w, evaluatedCoursesCount: poCC[k] };
    longitudinalPOs.push(poObj);
    if (!isPassed) {
      weakPOs.push({ po: k, attainment: att, description: PO_NAMES[k], gapPercentage: Math.round((threshold - att) * 10) / 10 });
    } else if (att >= threshold && w > 0) {
      strongPOs.push(poObj);
    }
  }
  strongPOs.sort((a, b) => b.attainment - a.attainment);
  const overallPoAttainment = Math.round((sumPO / 12) * 10) / 10;
  let recommendationStatus;
  if (cgpa >= 3.50 && weakPOs.length === 0) recommendationStatus = 'Eligible for Recommendation';
  else if (cgpa >= 3.50 && weakPOs.length > 0) recommendationStatus = 'Not Recommended (PO Gap Detected)';
  else if (cgpa < 3.50 && weakPOs.length === 0) recommendationStatus = 'Conditional (Low CGPA)';
  else recommendationStatus = 'Ineligible (Low CGPA & PO Gaps)';
  const cgpaNorm = (cgpa / 4.0) * 100;
  let recommendationScore = (0.60 * overallPoAttainment) + (0.40 * cgpaNorm) - (weakPOs.length * 5);
  recommendationScore = Math.max(0, Math.min(100, Math.round(recommendationScore * 10) / 10));
  return { cgpa, overallPoAttainment, recommendationScore, recommendationStatus, weakPOs, strongPOs, longitudinalPOs, totalCOsEvaluated, totalCOsPassed, coSuccessRate };
}

export default function PORecommendationMatrix({ offering = null, initialStudentList = [] }) {
  const [students, setStudents] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [facultyNotes, setFacultyNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('individual');
  const [courseFilterMode, setCourseFilterMode] = useState('all');
  const [selectedCourseCodes, setSelectedCourseCodes] = useState(new Set());
  const [expandedCourseCodes, setExpandedCourseCodes] = useState(new Set());
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('All');
  const [batchSort, setBatchSort] = useState({ key: 'studentId', dir: 'asc' });
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [showBatchRoster, setShowBatchRoster] = useState(false);
  const [batchCourseFilterMode, setBatchCourseFilterMode] = useState('all');
  const [batchSelectedCourseCodes, setBatchSelectedCourseCodes] = useState(new Set());
  const [aiCQILoading, setAiCQILoading] = useState(false);
  const [batchCQIResult, setBatchCQIResult] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [poEditText, setPoEditText] = useState('');
  const [customPORemediations, setCustomPORemediations] = useState({});
  const [isMasterTableExpanded, setIsMasterTableExpanded] = useState(false);
  const [isLongitudinalSummaryExpanded, setIsLongitudinalSummaryExpanded] = useState(false);

  const batchDisplay = typeof offering?.batch === 'object'
    ? (offering?.batch?.name || offering?.batch?.batchNum || 'Batch')
    : String(offering?.batch || 'Batch');

  const customRemedStorageKey = `BAETE_CUSTOM_PO_REMED_BATCH_${batchDisplay}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(customRemedStorageKey);
      if (saved) setCustomPORemediations(JSON.parse(saved));
    } catch (e) {}
  }, [customRemedStorageKey]);

  const handleSavePORemediation = (poCode) => {
    const updated = { ...customPORemediations, [poCode]: poEditText };
    setCustomPORemediations(updated);
    try {
      localStorage.setItem(customRemedStorageKey, JSON.stringify(updated));
    } catch (e) {}
    setEditingPO(null);
    setPoEditText('');
  };

  useEffect(() => { loadStudents(); }, [threshold, offering?._id]);
  useEffect(() => { setSelectedSection('ALL'); }, [offering?._id]);

  const loadStudents = async (autoSelectFirst = true) => {
    setLoading(true);
    try {
      const offeringId = offering?._id || '';
      const teacherId = offering?.teacher?._id || offering?.teacher || '';
      const res = await apiService.getPORecommendationStudents(threshold, offeringId, teacherId);
      let fetchedStudents = res?.students || [];
      console.log('[PORecommendation] Loaded students for offering:', offeringId, 'Total:', fetchedStudents.length, 'Sections:', res?.availableSections);
      setAvailableSections(res?.availableSections || []);
      if (initialStudentList && initialStudentList.length > 0) {
        const existingIds = new Set(fetchedStudents.map(s => String(s.id || s.studentId)));
        initialStudentList.forEach(init => {
          const initId = String(init._id || init.id || init.studentId);
          if (!existingIds.has(initId)) {
            fetchedStudents.push({ id: init._id || init.id, studentId: init.studentId || init.id, studentName: init.name || init.studentName, section: init.section || 'N/A', cgpa: 0, overallPoAttainment: 0, recommendationScore: 0, recommendationStatus: 'Pending', badgeColor: 'gray', weakPOCount: 0, completedCoursesCount: 0, poAttainments: {} });
          }
        });
      }
      setStudents(fetchedStudents);
      if (autoSelectFirst && fetchedStudents.length > 0) {
        const def = fetchedStudents.find(s => (s.studentName || '').toLowerCase().includes('joy sarkar')) || fetchedStudents[0];
        setSelectedStudentId(def.id || def.studentId);
      }
    } catch (err) {
      console.error('Failed to load PO recommendation students:', err);
      if (initialStudentList && initialStudentList.length > 0) {
        const fb = initialStudentList.map(init => ({ id: init._id || init.id, studentId: init.studentId || init.id, studentName: init.name || init.studentName, section: init.section || 'N/A', cgpa: 0, overallPoAttainment: 0, recommendationScore: 0, recommendationStatus: 'Pending', badgeColor: 'gray', poAttainments: {} }));
        setStudents(fb);
        if (autoSelectFirst && fb.length > 0) setSelectedStudentId(fb[0].id || fb[0].studentId);
      }
    } finally { setLoading(false); }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(s => (s.studentName || '').toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q));
  }, [students, searchTerm]);

  useEffect(() => {
    if (searchTerm.trim() && filteredStudents.length > 0) {
      if (!filteredStudents.find(s => (s.id || s.studentId) === selectedStudentId)) {
        setSelectedStudentId(filteredStudents[0].id || filteredStudents[0].studentId);
      }
    }
  }, [searchTerm, filteredStudents]);

  useEffect(() => {
    if (selectedStudentId && viewMode === 'individual') loadStudentProfile(selectedStudentId, threshold);
  }, [selectedStudentId, threshold, viewMode]);

  const loadStudentProfile = async (sId, thresh) => {
    setProfileLoading(true);
    try {
      const data = await apiService.getStudentPORecommendation(sId, thresh);
      setStudentProfile(data);
      setFacultyNotes(data.facultyNotes || '');
      setSelectedCourseCodes(new Set((data.completedCourses || []).map(c => c.courseCode)));
      setCourseFilterMode('all');
    } catch (err) { console.error('Failed to load student longitudinal PO profile:', err); }
    finally { setProfileLoading(false); }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await apiService.syncAllPORecommendations(threshold);
      setToastMsg(`Successfully updated longitudinal PO attainments for ${res.syncedCount || 'all'} students!`);
      await loadStudents(false);
      if (selectedStudentId) await loadStudentProfile(selectedStudentId, threshold);
      setTimeout(() => setToastMsg(''), 5000);
    } catch (err) { alert('Failed to sync: ' + err.message); }
    finally { setSyncingAll(false); }
  };

  const handleSelectStudent = s => { setSelectedStudentId(s.id || s.studentId); setSearchTerm(''); setShowSearchDropdown(false); };

  const handleSaveNotes = async () => {
    if (!studentProfile) return;
    setSavingNotes(true);
    try {
      const res = await apiService.savePORecommendation({ studentId: studentProfile.student.id || studentProfile.student.studentId, threshold, facultyNotes });
      if (res.ok) { setToastMsg('Faculty recommendation notes saved!'); setTimeout(() => setToastMsg(''), 4000); }
    } catch (err) { alert('Failed to save notes: ' + err.message); }
    finally { setSavingNotes(false); }
  };

  const getBadgeStyle = status => {
    const styles = {
      'Eligible for Recommendation': { bg: 'bg-emerald-100 border-emerald-300 text-emerald-900', icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />, titleColor: 'text-emerald-800' },
      'Not Recommended (PO Gap Detected)': { bg: 'bg-red-100 border-red-300 text-red-900', icon: <ShieldAlert className="w-8 h-8 text-red-600 flex-shrink-0" />, titleColor: 'text-red-800' },
      'Conditional (Low CGPA)': { bg: 'bg-amber-100 border-amber-300 text-amber-900', icon: <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />, titleColor: 'text-amber-800' },
    };
    return styles[status] || { bg: 'bg-rose-100 border-rose-300 text-rose-900', icon: <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />, titleColor: 'text-rose-800' };
  };

  const allCourses = studentProfile?.completedCourses || [];

  const handleCourseFilterMode = mode => {
    setCourseFilterMode(mode);
    if (mode === 'all') setSelectedCourseCodes(new Set(allCourses.map(c => c.courseCode)));
  };

  const toggleCourse = code => {
    setCourseFilterMode('custom');
    setSelectedCourseCodes(prev => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });
  };

  const filteredCourses = useMemo(() => allCourses.filter(c => selectedCourseCodes.has(c.courseCode)), [allCourses, selectedCourseCodes]);
  const computedProfile = useMemo(() => computeProfileFromCourses(filteredCourses, threshold), [filteredCourses, threshold]);
  const chartData = useMemo(() => computedProfile.longitudinalPOs.map(p => ({ po: p.po, attainment: p.attainment, threshold, isPassed: p.attainment >= threshold })), [computedProfile, threshold]);

  const toggleExpandCourse = code => {
    setExpandedCourseCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAllCourses = () => {
    if (expandedCourseCodes.size === allCourses.length && allCourses.length > 0) {
      setExpandedCourseCodes(new Set());
    } else {
      setExpandedCourseCodes(new Set(allCourses.map(c => c.courseCode)));
    }
  };

  const formatSemesterWithYear = c => {
    let sem = c?.semester || 'Spring';
    const yr = c?.academicYear || (offering?.academicYear ? String(offering.academicYear) : '') || (offering?.semester?.academicYear ? String(offering.semester.academicYear) : '');
    if (yr && yr !== 'N/A' && !sem.includes(String(yr))) {
      return `${sem} ${yr}`;
    }
    return sem;
  };

  // Robust Section list derived from availableSections and students
  const allSectionsList = useMemo(() => {
    const set = new Set();
    (availableSections || []).forEach(s => { if (s && s !== 'N/A') set.add(s); });
    students.forEach(st => { if (st.section && st.section !== 'N/A') set.add(st.section); });
    return Array.from(set).sort();
  }, [availableSections, students]);

  // Extract all unique courses present in the batch with rich outcome metrics
  const batchAvailableCourses = useMemo(() => {
    const courseMap = new Map();
    students.forEach(st => {
      (st.completedCourses || []).forEach(c => {
        if (!c.courseCode) return;
        if (!courseMap.has(c.courseCode)) {
          courseMap.set(c.courseCode, {
            courseCode: c.courseCode,
            courseTitle: c.courseTitle || 'N/A',
            semester: c.semester || 'Spring',
            academicYear: c.academicYear || '',
            creditHours: parseFloat(c.creditHours) || 3,
            studentsSet: new Set(),
            poAttainmentsList: [],
            coAttainmentsList: [],
            coTotalCounts: [],
            coAchievedCounts: [],
          });
        }
        const entry = courseMap.get(c.courseCode);
        const sid = String(st.id || st.studentId || '');
        if (sid) entry.studentsSet.add(sid);

        if (c.semester && entry.semester === 'Spring' && c.semester !== 'Spring') {
          entry.semester = c.semester;
        }
        if (c.academicYear && !entry.academicYear) {
          entry.academicYear = c.academicYear;
        }

        // CO Statistics
        if (Array.isArray(c.coAttainments) && c.coAttainments.length > 0) {
          entry.coTotalCounts.push(c.coAttainments.length);
          let passedThisStudent = 0;
          c.coAttainments.forEach(co => {
            const att = parseFloat(co.attainment);
            if (!isNaN(att)) {
              entry.coAttainmentsList.push(att);
              if (att >= threshold) passedThisStudent++;
            }
          });
          entry.coAchievedCounts.push(passedThisStudent);
        } else if (c.totalCOCount) {
          entry.coTotalCounts.push(c.totalCOCount);
          entry.coAchievedCounts.push(c.achievedCOCount || 0);
        }

        // PO Statistics
        if (c.poAttainments && typeof c.poAttainments === 'object') {
          const vals = Object.values(c.poAttainments).map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
          if (vals.length > 0) {
            entry.poAttainmentsList.push(vals.reduce((a, b) => a + b, 0) / vals.length);
          }
        }
      });
    });

    if (courseMap.size === 0 && offering?.course) {
      courseMap.set(offering.course.courseCode, {
        courseCode: offering.course.courseCode,
        courseTitle: offering.course.courseName,
        semester: offering.semester?.name || offering.semester?.semesterName || 'Spring',
        academicYear: offering.academicYear || offering.semester?.academicYear || '',
        creditHours: offering.course.creditHours || 3,
        studentsSet: new Set(students.map(s => String(s.id || s.studentId))),
        poAttainmentsList: [],
        coAttainmentsList: [],
        coTotalCounts: [],
        coAchievedCounts: [],
      });
    }

    return Array.from(courseMap.values())
      .map(c => {
        // Build semester string with academic year
        let semDisplay = c.semester || 'Spring';
        const yr = c.academicYear || (offering?.academicYear ? String(offering.academicYear) : '') || (offering?.semester?.academicYear ? String(offering.semester.academicYear) : '');
        if (yr && !semDisplay.includes(String(yr))) {
          semDisplay = `${semDisplay} ${yr}`;
        }

        // Total COs for this course
        const totalCOs = c.coTotalCounts.length > 0 ? Math.max(...c.coTotalCounts) : 4;

        // Average CO Attainment across all evaluated student-CO pairs
        const avgCO = c.coAttainmentsList.length > 0
          ? Math.round((c.coAttainmentsList.reduce((a, b) => a + b, 0) / c.coAttainmentsList.length) * 10) / 10
          : 0;

        // CO Pass Rate (% of student CO evaluations meeting threshold)
        const totalEvaluations = c.coTotalCounts.reduce((a, b) => a + b, 0);
        const passedEvaluations = c.coAchievedCounts.reduce((a, b) => a + b, 0);
        const coPassRate = totalEvaluations > 0
          ? Math.round((passedEvaluations / totalEvaluations) * 1000) / 10
          : (avgCO >= threshold ? 100 : 0);

        // Average PO Attainment for this course
        const avgPO = c.poAttainmentsList.length > 0
          ? Math.round((c.poAttainmentsList.reduce((a, b) => a + b, 0) / c.poAttainmentsList.length) * 10) / 10
          : 0;

        return {
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          semester: semDisplay,
          creditHours: c.creditHours,
          studentsCount: c.studentsSet.size || students.length,
          totalCOs,
          avgCO,
          coPassRate,
          avgPO,
        };
      })
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [students, offering, threshold]);

  // Sync batch selected courses on initial load or mode switch
  useEffect(() => {
    if (batchAvailableCourses.length > 0 && batchCourseFilterMode === 'all') {
      setBatchSelectedCourseCodes(new Set(batchAvailableCourses.map(c => c.courseCode)));
    }
  }, [batchAvailableCourses, batchCourseFilterMode]);

  // Dynamically recalculate each student's PO profile against batchSelectedCourseCodes
  const recalculatedBatchStudents = useMemo(() => {
    if (!batchSelectedCourseCodes || batchSelectedCourseCodes.size === 0) {
      return students.map(st => ({
        ...st,
        cgpa: 0,
        overallPoAttainment: 0,
        recommendationScore: 0,
        recommendationStatus: 'No Courses Selected',
        badgeColor: 'gray',
        weakPOCount: 12,
        poAttainments: {},
      }));
    }
    const allAvailable = new Set(batchAvailableCourses.map(c => c.courseCode));
    const allSelected = allAvailable.size > 0 && Array.from(allAvailable).every(code => batchSelectedCourseCodes.has(code));
    if (allSelected) {
      return students;
    }

    return students.map(st => {
      if (!st.completedCourses || st.completedCourses.length === 0) return st;
      const matched = st.completedCourses.filter(c => batchSelectedCourseCodes.has(c.courseCode));
      const profile = computeProfileFromCourses(matched, threshold);
      const poAtts = {};
      profile.longitudinalPOs.forEach(p => { poAtts[p.po] = p.attainment; });
      return {
        ...st,
        cgpa: profile.cgpa,
        overallPoAttainment: profile.overallPoAttainment,
        recommendationScore: profile.recommendationScore,
        recommendationStatus: profile.recommendationStatus,
        badgeColor: profile.recommendationStatus.includes('Eligible') ? 'green' : (profile.recommendationStatus.includes('Conditional') ? 'yellow' : 'red'),
        weakPOCount: profile.weakPOs.length,
        poAttainments: poAtts,
        completedCoursesCount: matched.length,
      };
    });
  }, [students, batchSelectedCourseCodes, batchAvailableCourses, threshold]);

  // Batch section filter applied over recalculated batch students
  const activeBatchStudents = useMemo(() => {
    if (selectedSection === 'ALL') return recalculatedBatchStudents;
    return recalculatedBatchStudents.filter(s => s.section === selectedSection);
  }, [recalculatedBatchStudents, selectedSection]);

  // Batch stats recomputed from activeBatchStudents
  const batchStats = useMemo(() => {
    if (!activeBatchStudents.length) return null;
    const n = activeBatchStudents.length;
    const avgCGPA = activeBatchStudents.reduce((s, st) => s + (st.cgpa || 0), 0) / n;
    const avgPOAtt = activeBatchStudents.reduce((s, st) => s + (st.overallPoAttainment || 0), 0) / n;
    const eligibleCount = activeBatchStudents.filter(st => st.recommendationStatus === 'Eligible for Recommendation').length;
    const eligibilityRate = (eligibleCount / n) * 100;
    const poSums = {}, poCounts = {}, poPassCounts = {};
    for (let p = 1; p <= 12; p++) { poSums[`PO${p}`] = 0; poCounts[`PO${p}`] = 0; poPassCounts[`PO${p}`] = 0; }
    activeBatchStudents.forEach(st => {
      const pa = st.poAttainments || {};
      Object.keys(pa).forEach(rawK => {
        const k = rawK.toUpperCase().replace(/\s+/g, '');
        if (poSums[k] !== undefined) {
          const v = typeof pa[rawK] === 'number' ? pa[rawK] : parseFloat(pa[rawK]) || 0;
          poSums[k] += v; poCounts[k]++;
          if (v >= threshold) poPassCounts[k]++;
        }
      });
    });
    const batchChartData = Array.from({ length: 12 }, (_, i) => {
      const k = `PO${i + 1}`;
      const avgAtt = poCounts[k] > 0 ? Math.round((poSums[k] / poCounts[k]) * 10) / 10 : 0;
      const passRate = poCounts[k] > 0 ? Math.round((poPassCounts[k] / poCounts[k]) * 1000) / 10 : 0;
      return { po: k, avgAttainment: avgAtt, passRate, threshold };
    });
    const commonWeakPOs = [...batchChartData].sort((a, b) => a.avgAttainment - b.avgAttainment).slice(0, 3);
    const clusterStats = WA_CLUSTERS.map(cl => {
      const clD = batchChartData.filter(d => cl.pos.includes(d.po));
      const clAvg = clD.length ? Math.round((clD.reduce((s, d) => s + d.avgAttainment, 0) / clD.length) * 10) / 10 : 0;
      return { ...cl, avgAttainment: clAvg };
    });
    const tiers = {
      exemplary: activeBatchStudents.filter(s => s.overallPoAttainment >= 75).length,
      competent: activeBatchStudents.filter(s => s.overallPoAttainment >= 50 && s.overallPoAttainment < 75).length,
      developing: activeBatchStudents.filter(s => s.overallPoAttainment >= 40 && s.overallPoAttainment < 50).length,
      atRisk: activeBatchStudents.filter(s => s.overallPoAttainment < 40).length,
    };
    // Per-section breakdown
    const sectionBreakdown = {};
    activeBatchStudents.forEach(st => {
      const sec = st.section || 'N/A';
      if (!sectionBreakdown[sec]) {
        sectionBreakdown[sec] = { count: 0, poSums: {}, poCounts: {} };
        for (let p = 1; p <= 12; p++) { sectionBreakdown[sec].poSums[`PO${p}`] = 0; sectionBreakdown[sec].poCounts[`PO${p}`] = 0; }
      }
      sectionBreakdown[sec].count++;
      const pa = st.poAttainments || {};
      Object.keys(pa).forEach(rawK => {
        const k = rawK.toUpperCase().replace(/\s+/g, '');
        if (sectionBreakdown[sec].poSums[k] !== undefined) {
          const v = typeof pa[rawK] === 'number' ? pa[rawK] : parseFloat(pa[rawK]) || 0;
          sectionBreakdown[sec].poSums[k] += v; sectionBreakdown[sec].poCounts[k]++;
        }
      });
    });
    const sectionNames = Object.keys(sectionBreakdown).sort();
    const crossSectionData = Array.from({ length: 12 }, (_, i) => {
      const k = `PO${i + 1}`;
      const row = { po: k };
      sectionNames.forEach(sec => {
        const sd = sectionBreakdown[sec];
        row[`sec_${sec}`] = sd.poCounts[k] > 0 ? Math.round((sd.poSums[k] / sd.poCounts[k]) * 10) / 10 : 0;
      });
      row.batchMean = poCounts[k] > 0 ? Math.round((poSums[k] / poCounts[k]) * 10) / 10 : 0;
      return row;
    });
    const cqiItems = batchChartData.filter(d => d.avgAttainment < threshold).sort((a, b) => a.avgAttainment - b.avgAttainment).map(d => {
      const aiRemed = batchCQIResult?.poRemediations?.[d.po];
      const customText = customPORemediations[d.po];
      const isZero = d.avgAttainment === 0;
      const remediation = customText || aiRemed?.remediation || CQI_REMEDIATION[d.po] || 'Review and realign course delivery for this outcome.';
      const allocatedCourses = aiRemed?.allocatedCourses || [];
      return {
        po: d.po,
        name: PO_NAMES[d.po],
        avgAttainment: d.avgAttainment,
        passRate: d.passRate,
        isZero,
        gap: Math.round((threshold - d.avgAttainment) * 10) / 10,
        remediation,
        allocatedCourses,
      };
    });
    return { n, avgCGPA, avgPOAtt, eligibilityRate, eligibleCount, batchChartData, commonWeakPOs, clusterStats, tiers, crossSectionData, sectionNames, cqiItems };
  }, [activeBatchStudents, threshold, batchCQIResult, customPORemediations]);

  const handleGenerateBatchCQI = async (forceRegenerate = false) => {
    if (!batchStats?.batchChartData) return;
    setAiCQILoading(true);
    try {
      const res = await generateBatchLevelCQI({
        batchId: batchDisplay,
        section: selectedSection,
        threshold,
        batchChartData: batchStats.batchChartData,
        clusterStats: batchStats.clusterStats,
        completedCourses: batchAvailableCourses,
        forceRegenerate,
      });
      setBatchCQIResult(res);
    } catch (err) {
      console.error('[PORecommendation] Error generating batch CQI:', err);
    } finally {
      setAiCQILoading(false);
    }
  };

  useEffect(() => {
    if (batchStats?.batchChartData && batchStats.batchChartData.length > 0 && !batchCQIResult) {
      handleGenerateBatchCQI(false);
    }
  }, [batchStats?.batchChartData, threshold, selectedSection]);

  const batchRoster = useMemo(() => {
    let list = [...activeBatchStudents];
    if (batchSearch.trim()) { const q = batchSearch.toLowerCase(); list = list.filter(s => (s.studentName || '').toLowerCase().includes(q) || (s.studentId || '').toLowerCase().includes(q)); }
    if (batchStatusFilter !== 'All') {
      list = list.filter(s => {
        if (batchStatusFilter === 'Eligible') return s.recommendationStatus === 'Eligible for Recommendation';
        if (batchStatusFilter === 'PO Gap') return s.recommendationStatus === 'Not Recommended (PO Gap Detected)';
        if (batchStatusFilter === 'Low CGPA') return s.recommendationStatus === 'Conditional (Low CGPA)';
        if (batchStatusFilter === 'Ineligible') return s.recommendationStatus?.startsWith('Ineligible');
        return true;
      });
    }
    const { key, dir } = batchSort;
    list.sort((a, b) => { const av = a[key] ?? ''; const bv = b[key] ?? ''; if (typeof av === 'number') return dir === 'asc' ? av - bv : bv - av; return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); });
    return list;
  }, [activeBatchStudents, batchSearch, batchStatusFilter, batchSort]);

  const handleBatchSort = key => setBatchSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const SortIcon = ({ colKey }) => {
    if (batchSort.key !== colKey) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return batchSort.dir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1 text-green-700" /> : <ChevronDown className="w-3 h-3 inline ml-1 text-green-700" />;
  };

  const statusPill = status => {
    const m = { 'Eligible for Recommendation':'bg-emerald-100 text-emerald-800', 'Not Recommended (PO Gap Detected)':'bg-red-100 text-red-800', 'Conditional (Low CGPA)':'bg-amber-100 text-amber-800', 'Ineligible (Low CGPA & PO Gaps)':'bg-rose-100 text-rose-800' };
    return m[status] || 'bg-gray-100 text-gray-700';
  };

  const handleViewProfile = s => { setSelectedStudentId(s.id || s.studentId); setViewMode('individual'); };

  const tierPieData = batchStats ? [
    { name: 'Exemplary (≥75%)', value: batchStats.tiers.exemplary, fill: '#10b981' },
    { name: 'Competent (50–74%)', value: batchStats.tiers.competent, fill: '#3b82f6' },
    { name: 'Developing (40–49%)', value: batchStats.tiers.developing, fill: '#f59e0b' },
    { name: 'At-Risk (<40%)', value: batchStats.tiers.atRisk, fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* ══ Header ══ */}
      <div className="no-print bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
              <Award className="w-6 h-6 text-green-700 flex-shrink-0" />PO Recommendation System
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {offering ? (<>Showing allocated students for course: <strong className="text-green-800 font-extrabold">{offering.course?.courseCode} - {offering.course?.courseName}</strong> ({students.length} enrolled across all sections)</>) : (<>Aggregates Program Outcome (PO1&#8211;PO12) attainment across all completed courses in the student's entire Bachelor's program.</>)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
            <button onClick={handleSyncAll} disabled={syncingAll} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs text-xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer border border-emerald-800/20">
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
              <span>{syncingAll ? 'Recalculating...' : 'Sync & Recalculate All'}</span>
            </button>
          </div>
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('individual')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer border ${viewMode === 'individual' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-900/20 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'}`}>
            <User className="w-4 h-4" />Individual Student View
          </button>
          <button onClick={() => setViewMode('batch')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer border ${viewMode === 'batch' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-900/20 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'}`}>
            <Users className="w-4 h-4" />Batch Overview
            {students.length > 0 && <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${viewMode === 'batch' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{students.length}</span>}
          </button>
        </div>
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {viewMode === 'individual' && (
            <div className="md:col-span-4 relative">
              <label className="block text-xs font-bold text-gray-700 mb-1">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search ID or Name..." value={searchTerm} onFocus={() => setShowSearchDropdown(true)} onChange={e => { setSearchTerm(e.target.value); setShowSearchDropdown(true); }} onKeyDown={e => { if (e.key === 'Enter' && filteredStudents.length > 0) handleSelectStudent(filteredStudents[0]); }} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium" />
              </div>
              {showSearchDropdown && searchTerm.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? <div className="p-3 text-xs text-gray-500 font-medium">No matching students</div> : filteredStudents.map(s => (
                    <div key={s.id || s.studentId} onClick={() => handleSelectStudent(s)} className="p-2.5 hover:bg-green-50 cursor-pointer flex items-center justify-between transition">
                      <div><div className="text-xs font-extrabold text-gray-900">{s.studentId} - {s.studentName}</div><div className="text-[11px] text-gray-500">CGPA: {(s.cgpa || 0).toFixed(2)} | PO Avg: {s.overallPoAttainment || 0}%</div></div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{s.recommendationStatus || 'Pending'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {viewMode === 'individual' && (
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-gray-700 mb-1">Select Student Profile ({filteredStudents.length} Students)</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full py-2 px-3 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
                {filteredStudents.length === 0 ? <option value="">No matching students found</option> : filteredStudents.map(s => <option key={s.id || s.studentId} value={s.id || s.studentId}>{s.studentId} - {s.studentName} | CGPA: {(s.cgpa || 0).toFixed(2)} | PO Avg: {s.overallPoAttainment || 0}% | [{s.recommendationStatus || 'Pending'}]</option>)}
              </select>
            </div>
          )}
          <div className={viewMode === 'batch' ? 'md:col-span-5' : 'md:col-span-3'}>
            <label className="block text-xs font-bold text-gray-700 mb-1">PO Target Threshold: <span className="text-green-700 font-extrabold">{threshold}%</span></label>
            <div className="flex items-center gap-2">
              <input type="range" min="10" max="100" step="5" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-full accent-green-700 cursor-pointer" />
              <span className="text-xs font-bold text-gray-500">{threshold}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BATCH VIEW ═══ */}
      {viewMode === 'batch' && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white p-12 rounded-2xl shadow-md flex flex-col items-center justify-center"><Loader2 className="animate-spin text-green-700 w-12 h-12 mb-4" /><p className="text-gray-700 font-bold text-lg">Loading Batch Data...</p></div>
          ) : !batchStats ? (
            <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-500 font-medium">No student data available for batch analytics.</div>
          ) : (
            <>
              {/* Batch Banner */}
              <div className="bg-gradient-to-r from-gray-900 via-green-950 to-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg border-2 border-green-300/30"><Users className="w-8 h-8 text-white" /></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">Batch Overview</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-green-200 font-medium">
                        {offering && <><span>Course: <strong className="text-white">{offering.course?.courseCode}</strong></span><span>•</span></>}
                        <span>Total: <strong className="text-white">{students.length}</strong></span>
                        <span>•</span>
                        <span>Showing: <strong className="text-white">{batchStats.n} ({selectedSection === 'ALL' ? 'All Sections' : `Section ${selectedSection}`})</strong></span>
                        <span>•</span>
                        <span>Threshold: <strong className="text-amber-300">{threshold}%</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center"><div className="text-xs text-green-300 font-bold uppercase tracking-wider">Batch CGPA</div><div className="text-2xl font-black text-amber-300">{batchStats.avgCGPA.toFixed(2)}</div></div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center"><div className="text-xs text-green-300 font-bold uppercase tracking-wider">Eligible</div><div className="text-2xl font-black text-emerald-300">{batchStats.eligibilityRate.toFixed(0)}%</div></div>
                  </div>
                </div>
                {allSectionsList.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-white/10 relative z-10 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-green-300 uppercase tracking-wider mr-1">Section Filter:</span>
                    <button onClick={() => setSelectedSection('ALL')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${selectedSection === 'ALL' ? 'bg-white text-emerald-900 border-white shadow-sm' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>All Sections ({recalculatedBatchStudents.length})</button>
                    {allSectionsList.map(sec => (
                      <button key={sec} onClick={() => setSelectedSection(sec)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${selectedSection === sec ? 'bg-white text-emerald-900 border-white shadow-sm' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        Section {sec} ({recalculatedBatchStudents.filter(s => s.section === sec).length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"><div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batch Avg CGPA</span><GraduationCap className="w-5 h-5 text-indigo-600" /></div><div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{batchStats.avgCGPA.toFixed(2)}</span><span className="text-xs text-gray-500 font-semibold">/ 4.00</span></div><div className="mt-2 text-xs font-bold"><span className={`px-2 py-0.5 rounded-full ${batchStats.avgCGPA >= 3.5 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>{batchStats.avgCGPA >= 3.5 ? 'Strong Performance' : 'Needs Improvement'}</span></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"><div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batch PO Avg</span><TrendingUp className="w-5 h-5 text-emerald-600" /></div><div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-black text-gray-900">{batchStats.avgPOAtt.toFixed(1)}%</span></div><div className="mt-2 text-xs font-semibold text-gray-600">Across 12 Program Outcomes</div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"><div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eligibility Rate</span><Award className="w-5 h-5 text-amber-500" /></div><div className="mt-2 flex items-baseline gap-2"><span className={`text-3xl font-black ${batchStats.eligibilityRate >= 50 ? 'text-emerald-700' : 'text-red-600'}`}>{batchStats.eligibilityRate.toFixed(0)}%</span></div><div className="mt-2 text-xs font-semibold text-gray-600">{batchStats.eligibleCount} of {batchStats.n} students eligible</div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"><div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Most Weak POs</span><ShieldAlert className="w-5 h-5 text-red-600" /></div><div className="mt-2 space-y-1">{batchStats.commonWeakPOs.map(p => (<div key={p.po} className="flex items-center justify-between"><span className="text-xs font-extrabold text-red-700">{p.po}</span><span className="text-xs font-bold text-gray-600">{p.avgAttainment}% avg</span></div>))}</div></div>
              </div>

              {/* Primary Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h4 className="text-lg font-black text-gray-900 mb-1">Batch PO Competency Radar</h4>
                  <p className="text-xs text-gray-500 mb-4">Mean batch attainment across PO1&#8211;PO12 vs {threshold}% threshold</p>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={batchStats.batchChartData.map(d => ({ ...d, threshold }))}>
                    <PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="po" tick={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" />
                    <Radar name="Batch Avg Attainment (%)" dataKey="avgAttainment" stroke="#16a34a" fill="#22c55e" fillOpacity={0.4} />
                    <Radar name={`Threshold (${threshold}%)`} dataKey="threshold" stroke="#dc2626" fill="#ef4444" fillOpacity={0.1} strokeDasharray="4 4" />
                    <Tooltip formatter={(val, name) => [`${val}%`, name]} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                  </RadarChart></ResponsiveContainer></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h4 className="text-lg font-black text-gray-900 mb-1">Batch PO Pass Rate</h4>
                  <p className="text-xs text-gray-500 mb-4">% of students achieving at least {threshold}% in each PO</p>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={batchStats.batchChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="po" tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip formatter={(val, name) => [`${val}%`, name === 'passRate' ? 'Pass Rate' : 'Avg Attainment']} labelFormatter={label => `${label}: ${PO_NAMES[label] || label}`} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '50% Pass Rate', fill: '#dc2626', fontSize: 10, fontWeight: 700, position: 'top' }} />
                    <Bar dataKey="passRate" name="Pass Rate (%)" radius={[6, 6, 0, 0]}>{batchStats.batchChartData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.passRate >= 50 ? '#16a34a' : '#dc2626'} />)}</Bar>
                  </BarChart></ResponsiveContainer></div>
                </div>
              </div>

              {/* BAETE Header */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-gray-900 text-white rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center"><Layers className="w-5 h-5 text-indigo-300" /></div>
                  <div><h3 className="text-base font-black tracking-tight">BAETE / Washington Accord Accreditation Analytics</h3><p className="text-xs text-indigo-300 font-medium">OBE-SAR Criteria 3 &amp; 4 — Batch Competency &amp; Continuous Quality Improvement</p></div>
                </div>
              </div>

              {/* WA Clusters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl"><Layers size={16} /></div>
                  <div><h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Washington Accord Competency Clusters</h4><p className="text-xs text-gray-500 font-medium">Average attainment by WA cluster domain vs {threshold}% threshold</p></div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {batchStats.clusterStats.map(cl => (
                    <div key={cl.label} className={`rounded-xl border-2 ${cl.border} ${cl.bg} p-4`}>
                      <div className={`text-xs font-black uppercase tracking-wider ${cl.text} mb-1`}>{cl.short}</div>
                      <div className="text-lg font-black text-gray-900">{cl.avgAttainment}%</div>
                      <div className="text-[11px] text-gray-500 font-medium mb-2">{cl.desc}</div>
                      <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden border border-gray-200">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(cl.avgAttainment, 100)}%`, backgroundColor: cl.fill }} />
                      </div>
                      <div className={`mt-2 text-[11px] font-bold ${cl.avgAttainment >= threshold ? 'text-emerald-700' : 'text-red-600'}`}>{cl.avgAttainment >= threshold ? '✓ Cluster Attained' : `✗ ${(threshold - cl.avgAttainment).toFixed(1)}% below target`}</div>
                      <div className={`mt-0.5 text-[10px] font-medium ${cl.text}`}>{cl.pos.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier Distribution + Cross-Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><Activity size={16} /></div>
                    <div><h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Student Attainment Tier Distribution</h4><p className="text-xs text-gray-500 font-medium">Performance bands based on overall PO attainment</p></div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'Exemplary', sub: '≥ 75%', count: batchStats.tiers.exemplary, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
                        { label: 'Competent', sub: '50–74%', count: batchStats.tiers.competent, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
                        { label: 'Developing', sub: '40–49%', count: batchStats.tiers.developing, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
                        { label: 'At-Risk', sub: '< 40%', count: batchStats.tiers.atRisk, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
                      ].map(tier => (
                        <div key={tier.label} className={`rounded-xl border ${tier.border} ${tier.bg} p-3 text-center`}>
                          <div className={`text-2xl font-black ${tier.text}`}>{tier.count}</div>
                          <div className={`text-xs font-bold ${tier.text}`}>{tier.label}</div>
                          <div className="text-[10px] text-gray-500 font-medium">{tier.sub}</div>
                          <div className="text-[11px] font-semibold text-gray-600 mt-0.5">{batchStats.n > 0 ? Math.round((tier.count / batchStats.n) * 100) : 0}% of batch</div>
                        </div>
                      ))}
                    </div>
                    {tierPieData.length > 0 && (
                      <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={tierPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>{tierPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Pie><Tooltip formatter={(val, name) => [val, name]} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px' }} /><Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} /></PieChart></ResponsiveContainer></div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl"><BarChart2 size={16} /></div>
                    <div><h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Cross-Section Attainment Comparison</h4><p className="text-xs text-gray-500 font-medium">{batchStats.sectionNames.length <= 1 ? 'Select All Sections to compare sections' : `${batchStats.sectionNames.join(' vs ')} vs Batch Mean`}</p></div>
                  </div>
                  <div className="p-5">
                    {batchStats.sectionNames.length <= 1 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-gray-400 gap-2"><Users className="w-10 h-10 opacity-30" /><p className="text-sm font-semibold text-center">Switch to <strong>All Sections</strong> filter to see cross-section comparison</p></div>
                    ) : (
                      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={batchStats.crossSectionData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="po" tick={{ fontSize: 10, fontWeight: 700, fill: '#4b5563' }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                        <Tooltip formatter={(val, name) => [`${val}%`, name === 'batchMean' ? 'Batch Mean' : `Section ${name.replace('sec_', '')}`]} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px' }} />
                        <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="3 3" />
                        {batchStats.sectionNames.map((sec, i) => <Bar key={sec} dataKey={`sec_${sec}`} name={`Section ${sec}`} fill={SECTION_COLORS[i % SECTION_COLORS.length]} radius={[3, 3, 0, 0]} />)}
                        <Bar dataKey="batchMean" name="Batch Mean" fill="#6b7280" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      </BarChart></ResponsiveContainer></div>
                    )}
                  </div>
                </div>
              </div>

              {/* PO Attainment Master Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div
                  onClick={() => setIsMasterTableExpanded(prev => !prev)}
                  className={`p-5 bg-gray-50 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-100/70 transition-colors select-none ${isMasterTableExpanded ? 'border-b border-gray-200' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-xl"><Target size={16} /></div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">PO Competency Attainment Master Table</h4>
                      <p className="text-xs text-gray-500 font-medium">BAETE SAR reporting table — mean attainment, pass rate &amp; benchmark status per PO</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsMasterTableExpanded(prev => !prev); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 transition-colors cursor-pointer"
                    title={isMasterTableExpanded ? 'Collapse Master Table' : 'Expand Master Table'}
                  >
                    {isMasterTableExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
                {isMasterTableExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                        <tr><th className="py-3 px-4">PO</th><th className="py-3 px-4">Competency Description (WA)</th><th className="py-3 px-4">Cluster</th><th className="py-3 px-4 text-center">Batch Mean (%)</th><th className="py-3 px-4 text-center">Pass Rate (%)</th><th className="py-3 px-4 text-center">Benchmark</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchStats.batchChartData.map(d => {
                          const cluster = WA_CLUSTERS.find(c => c.pos.includes(d.po));
                          const attained = d.avgAttainment >= threshold;
                          return (
                            <tr key={d.po} className={attained ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50'}>
                              <td className="py-2.5 px-4 font-black text-gray-900">{d.po}</td>
                              <td className="py-2.5 px-4 text-gray-700">{PO_NAMES[d.po]}</td>
                              <td className="py-2.5 px-4">{cluster && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cluster.bg} ${cluster.text} border ${cluster.border}`}>{cluster.short}</span>}</td>
                              <td className="py-2.5 px-4 text-center"><span className={`font-black text-sm ${attained ? 'text-emerald-700' : 'text-red-600'}`}>{d.avgAttainment}%</span></td>
                              <td className="py-2.5 px-4 text-center"><span className={`font-bold ${d.passRate >= 50 ? 'text-emerald-700' : 'text-red-600'}`}>{d.passRate}%</span></td>
                              <td className="py-2.5 px-4 text-center">{attained ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Attained</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800"><ShieldAlert className="w-3 h-3" /> Needs CQI</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CQI Action Matrix */}
              {batchStats.cqiItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
                  <div className="p-5 border-b border-orange-200 bg-orange-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl flex-shrink-0 mt-0.5">
                        <Lightbulb size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-orange-950 uppercase tracking-wider">
                          BAETE CQI — Continuous Quality Improvement Action Matrix
                        </h4>
                        <p className="text-xs text-orange-800 font-medium mt-0.5">
                          {batchStats.cqiItems.length} PO{batchStats.cqiItems.length !== 1 ? 's' : ''} below {threshold}% threshold — pedagogical remediation &amp; curriculum gap recommendations
                        </p>
                      </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center no-print">
                      <button
                        onClick={() => handleGenerateBatchCQI(true)}
                        disabled={aiCQILoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Re-analyze batch PO attainments and generate tailored pedagogical remediations"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${aiCQILoading ? 'animate-spin' : ''}`} />
                        {aiCQILoading ? 'Generating Remediation...' : 'Generate Remediation'}
                      </button>

                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-950 text-white shadow-xs transition-all active:scale-95 cursor-pointer border border-indigo-800/30"
                        title="Open BAETE Criterion 3 & 9 Faculty CQI Review Meeting Report"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-300" />
                        View Faculty CQI Report
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-orange-100">
                    {batchStats.cqiItems.map(item => (
                      <div key={item.po} className="p-4 flex flex-col md:flex-row gap-4 hover:bg-orange-50/40 transition-colors">
                        <div className="flex-shrink-0 flex items-start gap-3 md:w-64">
                          <div className={`w-12 h-12 rounded-xl text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs ${item.isZero ? 'bg-amber-600' : 'bg-red-600'}`}>
                            {item.po}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-gray-900 leading-tight">{item.name}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-sm font-black ${item.isZero ? 'text-amber-700' : 'text-red-600'}`}>
                                {item.avgAttainment}%
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">Target: {threshold}%</span>
                              {item.isZero ? (
                                <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                  Unmapped (0%)
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                                  -{item.gap}% gap
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium mt-1">
                              Pass Rate: {item.passRate}% of students
                            </div>
                          </div>
                        </div>

                        {/* Remediation & Course Allocation Box */}
                        <div className={`flex-1 rounded-xl p-3.5 border transition-all ${item.isZero ? 'bg-amber-50/80 border-amber-300/80' : 'bg-orange-50/60 border-orange-200'}`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${item.isZero ? 'text-amber-900' : 'text-orange-900'}`}>
                              {item.isZero ? 'Curriculum Gap Analysis & Course Allocation (BAETE Criterion 4)' : 'CQI Pedagogical Recommendation (BAETE Criterion 9)'}
                            </span>
                            
                            <div className="flex items-center gap-2 no-print">
                              {editingPO === item.po ? (
                                <button
                                  onClick={() => handleSavePORemediation(item.po)}
                                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                                >
                                  <Save size={11} /> Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPO(item.po);
                                    setPoEditText(item.remediation);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                  title="Edit custom recommendation text for this PO"
                                >
                                  <Edit3 size={11} /> Edit
                                </button>
                              )}
                            </div>
                          </div>

                          {editingPO === item.po ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={poEditText}
                                onChange={e => setPoEditText(e.target.value)}
                                rows={3}
                                className="w-full text-xs p-2 rounded-lg border border-orange-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingPO(null)}
                                  className="text-[11px] font-bold text-gray-500 hover:text-gray-700 px-2 py-0.5"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-800 font-medium leading-relaxed">
                              {item.remediation}
                            </p>
                          )}

                          {/* Allocated Courses Recommendation for 0% / Unmapped PO */}
                          {item.isZero && item.allocatedCourses && item.allocatedCourses.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-[10px] font-extrabold text-amber-950 uppercase tracking-wider">
                                Recommended Course Basket:
                              </span>
                              {item.allocatedCourses.map((cName, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-amber-900 border border-amber-300 shadow-2xs"
                                >
                                  {cName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Completed Courses & Batch Outcome Breakdown Filter */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-green-700" />
                        Completed Courses &amp; Batch Outcome Breakdown
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Select courses to include in batch-wide PO attainment calculation — metrics update instantly
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-500">Filter:</span>
                      <button
                        onClick={() => {
                          setBatchCourseFilterMode('all');
                          setBatchSelectedCourseCodes(new Set(batchAvailableCourses.map(c => c.courseCode)));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${batchCourseFilterMode === 'all' ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs' : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'}`}
                      >
                        All Courses ({batchAvailableCourses.length})
                      </button>
                      <button
                        onClick={() => setBatchCourseFilterMode('custom')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${batchCourseFilterMode === 'custom' ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs' : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'}`}
                      >
                        Custom Selection
                      </button>
                      {batchCourseFilterMode === 'custom' && (
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {batchSelectedCourseCodes.size} of {batchAvailableCourses.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={batchSelectedCourseCodes.size === batchAvailableCourses.length && batchAvailableCourses.length > 0}
                            onChange={e => {
                              setBatchCourseFilterMode('custom');
                              setBatchSelectedCourseCodes(e.target.checked ? new Set(batchAvailableCourses.map(c => c.courseCode)) : new Set());
                            }}
                            className="accent-green-700 w-4 h-4 cursor-pointer"
                            title="Select / Deselect All Courses"
                          />
                        </th>
                        <th className="py-3 px-4">COURSE CODE</th>
                        <th className="py-3 px-4">COURSE TITLE</th>
                        <th className="py-3 px-4 text-center">SEMESTER</th>
                        <th className="py-3 px-4 text-center">CREDITS</th>
                        <th className="py-3 px-4 text-center">STUDENTS</th>
                        <th className="py-3 px-4 text-center">TOTAL COs</th>
                        <th className="py-3 px-4 text-center">AVG CO ATTAINMENT</th>
                        <th className="py-3 px-4 text-right">AVG PO ATTAINMENT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      {batchAvailableCourses.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-sm text-gray-400 font-semibold">
                            No completed courses found for batch students.
                          </td>
                        </tr>
                      ) : (
                        batchAvailableCourses.map((c, idx) => {
                          const isSel = batchSelectedCourseCodes.has(c.courseCode);
                          return (
                            <tr
                              key={idx}
                              onClick={() => {
                                setBatchCourseFilterMode('custom');
                                setBatchSelectedCourseCodes(prev => {
                                  const n = new Set(prev);
                                  if (n.has(c.courseCode)) n.delete(c.courseCode);
                                  else n.add(c.courseCode);
                                  return n;
                                });
                              }}
                              className={`cursor-pointer transition-colors ${isSel ? 'hover:bg-emerald-50/70' : 'opacity-50 bg-gray-50 hover:opacity-70'}`}
                            >
                              <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={() => {
                                    setBatchCourseFilterMode('custom');
                                    setBatchSelectedCourseCodes(prev => {
                                      const n = new Set(prev);
                                      if (n.has(c.courseCode)) n.delete(c.courseCode);
                                      else n.add(c.courseCode);
                                      return n;
                                    });
                                  }}
                                  className="accent-green-700 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4 font-black text-green-800">{c.courseCode}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{c.courseTitle}</td>
                              <td className="py-3 px-4 text-center text-gray-700 font-bold">{c.semester}</td>
                              <td className="py-3 px-4 text-center font-bold">{c.creditHours}</td>
                              <td className="py-3 px-4 text-center text-gray-600 font-bold">{c.studentsCount} students</td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-gray-100 text-gray-800 border border-gray-300">
                                  {c.totalCOs} COs
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`font-black text-sm ${c.avgCO >= threshold ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {c.avgCO > 0 ? `${c.avgCO}%` : 'N/A'}
                                  </span>
                                  {c.coPassRate > 0 && (
                                    <span className="text-[10px] text-gray-500 font-bold">
                                      {c.coPassRate}% pass rate
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-black">
                                <span className={c.avgPO >= threshold ? 'text-emerald-700' : 'text-red-600'}>
                                  {c.avgPO > 0 ? `${c.avgPO}%` : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {batchCourseFilterMode !== 'all' && (
                  <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-amber-700" />
                      <span>Course filter active: metrics &amp; charts reflect only the <strong>{batchSelectedCourseCodes.size}</strong> selected course{batchSelectedCourseCodes.size !== 1 ? 's' : ''}. Deselected courses are dimmed.</span>
                    </div>
                    <button
                      onClick={() => {
                        setBatchCourseFilterMode('all');
                        setBatchSelectedCourseCodes(new Set(batchAvailableCourses.map(c => c.courseCode)));
                      }}
                      className="text-xs font-bold text-emerald-800 underline hover:text-emerald-900 cursor-pointer"
                    >
                      Reset to All Courses
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Student Performance Roster */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button type="button" onClick={() => setShowBatchRoster(prev => !prev)} className="w-full p-5 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors border-b border-gray-200 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-xl"><Users size={18} /></div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">STUDENT PERFORMANCE ROSTER</h4>
                      <p className="text-xs text-gray-500 font-medium">{showBatchRoster ? 'Click to collapse student roster breakdown' : 'Click to expand student roster breakdown'} — {batchStats.n} students in view</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{showBatchRoster ? 'Expanded' : 'Collapsed'}</span>
                    {showBatchRoster ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                  </div>
                </button>
                {showBatchRoster && (
                  <>
                    <div className="p-4 border-b border-gray-100 bg-white">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <p className="text-xs text-gray-500 font-semibold">Full batch eligibility breakdown — click <strong>View</strong> to inspect individual profiles</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative"><Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" /><input type="text" placeholder="Search student..." value={batchSearch} onChange={e => setBatchSearch(e.target.value)} className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500" /></div>
                          {['All','Eligible','PO Gap','Low CGPA','Ineligible'].map(f => <button key={f} onClick={() => setBatchStatusFilter(f)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${batchStatusFilter === f ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>{f}</button>)}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                          <tr>
                            {[{key:'studentId',label:'Student ID'},{key:'studentName',label:'Name'},{key:'section',label:'Section'},{key:'cgpa',label:'CGPA'},{key:'overallPoAttainment',label:'PO Avg'},{key:'weakPOCount',label:'Weak POs'},{key:'recommendationScore',label:'Rec. Score'},{key:'recommendationStatus',label:'Status'}].map(col => <th key={col.key} onClick={() => handleBatchSort(col.key)} className="py-3 px-4 cursor-pointer select-none hover:bg-gray-200 transition-colors">{col.label} <SortIcon colKey={col.key} /></th>)}
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium">
                          {batchRoster.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-sm text-gray-400 font-semibold">No students match the current filters.</td></tr> : batchRoster.map(s => (
                            <tr key={s.id || s.studentId} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 font-black text-green-800">{s.studentId}</td>
                              <td className="py-3 px-4 text-gray-900 font-semibold">{s.studentName}</td>
                              <td className="py-3 px-4"><span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">{s.section || 'N/A'}</span></td>
                              <td className="py-3 px-4 font-black text-gray-900"><span className={s.cgpa >= 3.5 ? 'text-emerald-700' : 'text-amber-700'}>{(s.cgpa || 0).toFixed(2)}</span></td>
                              <td className="py-3 px-4 font-bold text-gray-800">{s.overallPoAttainment || 0}%</td>
                              <td className="py-3 px-4 text-center"><span className={`font-extrabold text-base ${(s.weakPOCount || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{s.weakPOCount || 0}</span></td>
                              <td className="py-3 px-4 font-black text-gray-900">{s.recommendationScore || 0}<span className="text-xs text-gray-400 font-semibold">/100</span></td>
                              <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusPill(s.recommendationStatus)}`}>{s.recommendationStatus || 'Pending'}</span></td>
                              <td className="py-3 px-4 text-center"><button onClick={() => handleViewProfile(s)} className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border border-emerald-200"><Eye className="w-3.5 h-3.5" /> View</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {batchRoster.length > 0 && <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-medium">Showing {batchRoster.length} of {batchStats.n} students {selectedSection !== 'ALL' ? `(Section ${selectedSection})` : '(All Sections)'}</div>}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ INDIVIDUAL VIEW ═══ */}
      {viewMode === 'individual' && (
        <>
          {profileLoading ? (
            <div className="bg-white p-12 rounded-2xl shadow-md flex flex-col items-center justify-center"><Loader2 className="animate-spin text-green-700 w-12 h-12 mb-4" /><p className="text-gray-700 font-bold text-lg">Fetching Pre-calculated Longitudinal PO Profile...</p><p className="text-xs text-gray-500 mt-1">Reading dedicated StudentLongitudinalPO collection from MongoDB</p></div>
          ) : !studentProfile ? (
            <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-500 font-medium">Select a student to inspect their Faculty Recommendation Eligibility Profile.</div>
          ) : (
            <div className="space-y-6 printable-area">
              {/* Print header */}
              <div className="hidden print:block text-center border-b-2 border-green-800 pb-4 mb-6">
                <h1 className="text-2xl font-black text-green-900 tracking-wide uppercase">Faculty Recommendation & PO Attainment Transcript</h1>
                <p className="text-sm font-bold text-gray-700 mt-1">Longitudinal Program Outcome Evaluation - Bachelor of Science Degree</p>
                <p className="text-xs text-gray-500 mt-0.5">Issued on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {/* Student banner */}
              <div className="bg-gradient-to-r from-gray-900 via-green-950 to-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg border-2 border-green-300/30"><User className="w-9 h-9 text-white" /></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{studentProfile.student.studentName}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-green-200 font-medium">
                        <span>ID: <strong className="text-white">{studentProfile.student.studentId}</strong></span><span>&#8226;</span>
                        <span>Batch: <strong className="text-white">{studentProfile.student.batch}</strong></span><span>&#8226;</span>
                        <span>Section: <strong className="text-white">{studentProfile.student.section}</strong></span><span>&#8226;</span>
                        <span>Completed Courses: <strong className="text-white">{studentProfile.completedCourses ? studentProfile.completedCourses.length : 0}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center"><div className="text-xs text-green-300 font-bold uppercase tracking-wider">CGPA</div><div className="text-2xl font-black text-amber-300">{computedProfile.cgpa.toFixed(2)}</div></div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center"><div className="text-xs text-green-300 font-bold uppercase tracking-wider">Overall PO</div><div className="text-2xl font-black text-emerald-300">{computedProfile.overallPoAttainment}%</div></div>
                  </div>
                </div>
              </div>
              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cumulative GPA</span><GraduationCap className="w-5 h-5 text-indigo-600" /></div>
                  <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{computedProfile.cgpa.toFixed(2)}</span><span className="text-xs text-gray-500 font-semibold">/ 4.00</span></div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">{computedProfile.cgpa >= 3.5 ? <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> High CGPA (≥3.50)</span> : <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Below 3.50 Threshold</span>}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall PO Avg</span><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-black text-gray-900">{computedProfile.overallPoAttainment}%</span></div>
                  <div className="mt-2 text-xs font-semibold text-gray-600">{selectedCourseCodes.size < allCourses.length ? `From ${selectedCourseCodes.size} selected course${selectedCourseCodes.size !== 1 ? 's' : ''}` : 'Across 12 Program Outcomes'}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">CO Mastery Rate</span><CheckCheck className="w-5 h-5 text-teal-600" /></div>
                  <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{computedProfile.totalCOsPassed}</span><span className="text-xs text-gray-500 font-semibold">/ {computedProfile.totalCOsEvaluated} COs</span></div>
                  <div className="mt-2 text-xs font-bold">{computedProfile.totalCOsEvaluated > 0 ? (computedProfile.totalCOsPassed === computedProfile.totalCOsEvaluated ? <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 100% Course Outcomes Mastered</span> : <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{computedProfile.coSuccessRate}% CO Success Rate</span>) : <span className="text-gray-400">No COs evaluated</span>}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PO Gaps (&lt;{threshold}%)</span><ShieldAlert className="w-5 h-5 text-red-600" /></div>
                  <div className="mt-2 flex items-baseline gap-2"><span className={`text-3xl font-black ${computedProfile.weakPOs.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{computedProfile.weakPOs.length}</span><span className="text-xs text-gray-500 font-semibold">/ 12 POs weak</span></div>
                  <div className="mt-2 text-xs font-bold">{computedProfile.weakPOs.length === 0 ? <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">All Mapped POs Satisfied</span> : <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{computedProfile.weakPOs.length} Weak PO Competenc{computedProfile.weakPOs.length === 1 ? 'y' : 'ies'}</span>}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recommendation Score</span><Award className="w-5 h-5 text-amber-500" /></div>
                  <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-gray-900">{computedProfile.recommendationScore}</span><span className="text-xs text-gray-500 font-semibold">/ 100</span></div>
                  <div className="mt-2"><div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${computedProfile.recommendationScore}%` }} /></div></div>
                </div>
              </div>
              {/* Status banner */}
              {(() => {
                const badge = getBadgeStyle(computedProfile.recommendationStatus);
                return (
                  <div className={`p-6 rounded-2xl border-2 shadow-md ${badge.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                    <div className="flex items-start gap-4">{badge.icon}<div>
                      <div className="text-xs font-extrabold uppercase tracking-widest text-gray-600">Faculty Recommendation Eligibility Status</div>
                      <h4 className={`text-2xl font-black ${badge.titleColor} mt-0.5`}>{computedProfile.recommendationStatus}</h4>
                      <p className="text-sm font-medium mt-1 text-gray-800">
                        {computedProfile.recommendationStatus === 'Eligible for Recommendation' && `Student has demonstrated exceptional longitudinal attainment in all 12 Program Outcomes (at least ${threshold}%) and maintains a high CGPA (at least 3.50). Fully eligible for teacher recommendation.`}
                        {computedProfile.recommendationStatus === 'Not Recommended (PO Gap Detected)' && 'RULE ENFORCED: Although student has a high CGPA (at least 3.50), teacher recommendation is restricted due to Program Outcome competency gaps below target threshold.'}
                        {computedProfile.recommendationStatus === 'Conditional (Low CGPA)' && 'Student meets PO competency thresholds across all mapped outcomes, but CGPA is below 3.50. Faculty review recommended before issuance.'}
                        {computedProfile.recommendationStatus === 'Ineligible (Low CGPA & PO Gaps)' && 'Student does not meet the minimum CGPA requirement (3.50) and exhibits Program Outcome competency gaps.'}
                        {computedProfile.recommendationStatus === 'No Courses Selected' && 'Please select at least one course to evaluate recommendation eligibility.'}
                      </p>
                    </div></div>
                    <div className="flex-shrink-0 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl text-center border border-gray-300"><span className="text-xs font-bold text-gray-600 block">Required Criteria</span><span className="text-xs font-extrabold text-gray-900">CGPA ≥ 3.50 & All POs ≥ {threshold}%</span></div>
                  </div>
                );
              })()}
              {/* Standout Strengths & Competency Highlights */}
              {computedProfile.strongPOs.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border-2 border-emerald-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-6 h-6 text-emerald-700" />
                    <h4 className="text-lg font-black text-emerald-950">Demonstrated Academic Strengths &amp; High Competencies ({computedProfile.strongPOs.length})</h4>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium mb-4">
                    The student has excelled above the {threshold}% target in the following Program Outcomes across accredited coursework:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {computedProfile.strongPOs.slice(0, 6).map((s) => (
                      <div key={s.po} className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                          {s.po}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-gray-900 truncate">{s.name}</div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-emerald-700">{s.attainment}%</span>
                            <span className="text-xs font-bold text-gray-400">Target: {threshold}%</span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                            +{Math.round((s.attainment - threshold) * 10) / 10}% above threshold ({s.mappedCredits} cr evaluated)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Weak PO alert */}
              {computedProfile.weakPOs.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-6 h-6 text-red-600" /><h4 className="text-lg font-black text-red-900">Critical Program Outcome (PO) Gaps Detected ({computedProfile.weakPOs.length})</h4></div>
                  <p className="text-xs text-red-800 font-medium mb-4">The following Program Outcomes fall below the required minimum threshold of <strong className="font-extrabold">{threshold}%</strong> attainment:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {computedProfile.weakPOs.map(w => (
                      <div key={w.po} className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0">{w.po}</div>
                        <div className="flex-1 min-w-0"><div className="text-xs font-extrabold text-gray-900 truncate">{w.description}</div><div className="flex items-baseline gap-2 mt-1"><span className="text-lg font-black text-red-600">{w.attainment}%</span><span className="text-xs font-bold text-gray-400">Target: {threshold}%</span></div><div className="text-[11px] font-extrabold text-red-700 mt-0.5">Deficit: -{w.gapPercentage}% gap</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Student CQI Advisory Remediation */}
              {computedProfile.weakPOs.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/40 rounded-2xl border border-amber-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                        <Lightbulb size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                          Individual Student CQI Advisory &amp; Recovery Roadmap
                        </h4>
                        <p className="text-xs text-amber-800 font-medium">
                          Pedagogical interventions for {computedProfile.studentName || 'this student'} to remediate {computedProfile.weakPOs.length} deficit Program Outcome(s)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Academic Advising Protocol
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {computedProfile.weakPOs.map(w => {
                      const advice = CQI_REMEDIATION[w.po] || 'Complete targeted problem-solving tutorials and hands-on lab projects to satisfy competency benchmarks.';
                      return (
                        <div key={w.po} className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                                {w.po}
                              </span>
                              <span className="text-[11px] font-bold text-rose-600">
                                Current: {w.attainment}% (Gap: -{w.gapPercentage}%)
                              </span>
                            </div>
                            <div className="text-xs font-extrabold text-gray-900 mb-1">{w.description}</div>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">{advice}</p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-gray-100 text-[10px] font-bold text-amber-700 flex items-center justify-between">
                            <span>Advising Directive:</span>
                            <span>Target ≥ {threshold}% in upcoming semester</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h4 className="text-lg font-black text-gray-900 mb-1">PO Competency Profile (Radar)</h4>
                  <p className="text-xs text-gray-500 mb-4">Student attainment vs {threshold}% target threshold across PO1&#8211;PO12</p>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="po" tick={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" />
                    <Radar name="Student PO Attainment (%)" dataKey="attainment" stroke="#16a34a" fill="#22c55e" fillOpacity={0.4} />
                    <Radar name={`Threshold (${threshold}%)`} dataKey="threshold" stroke="#dc2626" fill="#ef4444" fillOpacity={0.1} strokeDasharray="4 4" />
                    <Tooltip formatter={(val, name) => [`${val}%`, name]} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                  </RadarChart></ResponsiveContainer></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h4 className="text-lg font-black text-gray-900 mb-1">PO1&#8211;PO12 Attainment Breakdown</h4>
                  <p className="text-xs text-gray-500 mb-4">Color-coded attainment scores (Green ≥ {threshold}%, Red &lt; {threshold}%)</p>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="po" tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip formatter={val => [`${val}%`, 'Attainment']} labelFormatter={label => `${label}: ${PO_NAMES[label] || label}`} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Threshold (${threshold}%)`, fill: '#dc2626', fontSize: 11, fontWeight: 700, position: 'top' }} />
                    <Bar dataKey="attainment" radius={[6, 6, 0, 0]}>{chartData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.attainment >= threshold ? '#16a34a' : '#dc2626'} />)}</Bar>
                  </BarChart></ResponsiveContainer></div>
                </div>
              </div>
              {/* PO detail table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div
                  onClick={() => setIsLongitudinalSummaryExpanded(prev => !prev)}
                  className={`p-5 bg-gray-50 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-100/70 transition-colors select-none ${isLongitudinalSummaryExpanded ? 'border-b border-gray-200' : ''}`}
                >
                  <div>
                    <h4 className="text-base font-black text-gray-900">PO1&#8211;PO12 Longitudinal Attainment Summary</h4>
                    <p className="text-xs text-gray-500">Credit-weighted average across selected course offerings</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsLongitudinalSummaryExpanded(prev => !prev); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 transition-colors cursor-pointer"
                    title={isLongitudinalSummaryExpanded ? 'Collapse Summary Table' : 'Expand Summary Table'}
                  >
                    {isLongitudinalSummaryExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
                {isLongitudinalSummaryExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                        <tr><th className="py-3 px-4">PO Code</th><th className="py-3 px-4">Outcome Competency Description</th><th className="py-3 px-4 text-center">Mapped Credits</th><th className="py-3 px-4 text-center">Evaluated Courses</th><th className="py-3 px-4 text-right">Student Attainment (%)</th><th className="py-3 px-4 text-center">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium">
                        {computedProfile.longitudinalPOs.map(p => (
                          <tr key={p.po} className={p.isPassed ? 'hover:bg-gray-50' : 'bg-red-50/50 hover:bg-red-50'}>
                            <td className="py-3 px-4 font-black text-gray-900">{p.po}</td>
                            <td className="py-3 px-4 text-gray-800 font-semibold">{p.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-gray-600">{p.mappedCredits || 0} credits</td>
                            <td className="py-3 px-4 text-center font-bold text-gray-600">{p.evaluatedCoursesCount || 0} courses</td>
                            <td className="py-3 px-4 text-right font-black text-base"><span className={p.isPassed ? 'text-emerald-700' : 'text-red-600'}>{p.attainment}%</span></td>
                            <td className="py-3 px-4 text-center">{p.isPassed ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Satisfied</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800"><XCircle className="w-3.5 h-3.5" /> Gap (-{(threshold - p.attainment).toFixed(1)}%)</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* Course filter and expandable CO drilldowns */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <BookCheck className="w-5 h-5 text-emerald-700" />
                        Completed Courses &amp; Course Outcomes (CO) Drilldown
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">Click "Inspect COs" to drill down into specific Course Outcomes, marks attainment %, and mapped POs</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={expandAllCourses}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-700" />
                        {expandedCourseCodes.size === allCourses.length && allCourses.length > 0 ? 'Collapse All COs' : 'Expand All COs'}
                      </button>
                      <span className="text-xs font-bold text-gray-500">Filter:</span>
                      {[{ mode: 'all', label: `All Courses (${allCourses.length})` }, { mode: 'custom', label: 'Custom Selection' }].map(opt => (
                        <button key={opt.mode} onClick={() => handleCourseFilterMode(opt.mode)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${courseFilterMode === opt.mode ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'}`}>{opt.label}</button>
                      ))}
                      {courseFilterMode === 'custom' && <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{selectedCourseCodes.size} selected</span>}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 w-10">
                          <input type="checkbox" checked={selectedCourseCodes.size === allCourses.length && allCourses.length > 0} onChange={e => { setCourseFilterMode('custom'); setSelectedCourseCodes(e.target.checked ? new Set(allCourses.map(c => c.courseCode)) : new Set()); }} className="accent-green-700 w-4 h-4 cursor-pointer" title="Select / Deselect All" />
                        </th>
                        <th className="py-3 px-4">Course Code &amp; Title</th>
                        <th className="py-3 px-4 text-center">Semester</th>
                        <th className="py-3 px-4 text-center">Credits</th>
                        <th className="py-3 px-4 text-right">Marks (%)</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4 text-center">CO Attainment</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      {allCourses.map((c, idx) => {
                        const isSel = selectedCourseCodes.has(c.courseCode);
                        const isExpanded = expandedCourseCodes.has(c.courseCode);
                        const cTotalCO = Array.isArray(c.coAttainments) && c.coAttainments.length > 0 ? c.coAttainments.length : (c.totalCOCount || 0);
                        const cPassedCO = Array.isArray(c.coAttainments) && c.coAttainments.length > 0 ? c.coAttainments.filter(co => (parseFloat(co.attainment) || 0) >= threshold).length : (c.achievedCOCount || 0);
                        const cRate = cTotalCO > 0 ? Math.round((cPassedCO / cTotalCO) * 100) : 0;

                        return (
                          <React.Fragment key={c.courseCode || idx}>
                            <tr
                              onClick={() => toggleCourse(c.courseCode)}
                              className={`cursor-pointer transition-colors ${isSel ? (isExpanded ? 'bg-emerald-50/40' : 'hover:bg-emerald-50/70') : 'opacity-50 bg-gray-50 hover:opacity-70'}`}
                            >
                              <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isSel} onChange={() => toggleCourse(c.courseCode)} className="accent-green-700 w-4 h-4 cursor-pointer" />
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-black text-green-900">{c.courseCode}</div>
                                <div className="text-xs text-gray-700 font-medium">{c.courseTitle}</div>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-700 font-bold">{formatSemesterWithYear(c)}</td>
                              <td className="py-3 px-4 text-center font-bold text-gray-800">{c.creditHours} cr</td>
                              <td className="py-3 px-4 text-right font-bold text-gray-900">{c.percentage}%</td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-gray-100 text-gray-800 border border-gray-300">
                                  {c.letterGrade}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {cTotalCO > 0 ? (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${cRate === 100 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : cRate >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    {cPassedCO} / {cTotalCO} COs ({cRate}%)
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 font-semibold italic">Course-level</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleExpandCourse(c.courseCode)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${isExpanded ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs' : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'}`}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  {isExpanded ? 'Hide COs' : 'Inspect COs'}
                                </button>
                              </td>
                            </tr>
                            {/* Accordion Drawer for Course Outcomes */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90">
                                <td colSpan={8} className="p-4 sm:p-5 border-b border-gray-200">
                                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-800 text-white">{c.courseCode}</span>
                                          <h5 className="font-extrabold text-gray-900 text-sm">{c.courseTitle} — Evaluated Course Outcomes (CO)</h5>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">Passing benchmark: {threshold}%. CO scores aggregate credit-weighted Program Outcome (PO) performance.</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">CO Pass Rate: <strong className="text-emerald-700 font-black">{cPassedCO} of {cTotalCO} Achieved ({cRate}%)</strong></span>
                                      </div>
                                    </div>

                                    {Array.isArray(c.coAttainments) && c.coAttainments.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-gray-100/70 text-gray-600 uppercase font-bold tracking-wider border-b border-gray-200">
                                            <tr>
                                              <th className="py-2.5 px-3 w-16">CO Code</th>
                                              <th className="py-2.5 px-3">Official Learning Outcome Competency</th>
                                              <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                                              <th className="py-2.5 px-3 w-44">Attainment %</th>
                                              <th className="py-2.5 px-3 text-center">Target Status</th>
                                              <th className="py-2.5 px-3">Mapped POs</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 font-medium">
                                            {c.coAttainments.map((co, coIdx) => {
                                              const coAtt = parseFloat(co.attainment) || 0;
                                              const passed = coAtt >= threshold;
                                              return (
                                                <tr key={coIdx} className={`hover:bg-gray-50/80 transition ${passed ? '' : 'bg-red-50/30'}`}>
                                                  <td className="py-2.5 px-3 font-black text-gray-900">
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200 font-black">{co.co}</span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-gray-700 font-medium max-w-md">
                                                    {co.description || `Course Outcome ${co.co} competency`}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                                                    {co.obtainedMarks ?? 0} / {co.maxMarks ?? 0}
                                                  </td>
                                                  <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                      <span className={`font-black text-xs w-12 text-right ${passed ? 'text-emerald-700' : 'text-red-600'}`}>{coAtt}%</span>
                                                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full transition-all duration-300 ${passed ? 'bg-emerald-600' : 'bg-red-500'}`}
                                                          style={{ width: `${Math.min(100, Math.max(0, coAtt))}%` }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center">
                                                    {passed ? (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Satisfied
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] bg-red-100 text-red-800">
                                                        <XCircle className="w-3 h-3 text-red-600" /> Deficit (-{(threshold - coAtt).toFixed(1)}%)
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2.5 px-3">
                                                    {Array.isArray(co.mappedPOs) && co.mappedPOs.length > 0 ? (
                                                      <div className="flex flex-wrap gap-1">
                                                        {co.mappedPOs.map(poCode => (
                                                          <span
                                                            key={poCode}
                                                            className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px]"
                                                            title={PO_NAMES[poCode] || poCode}
                                                          >
                                                            {poCode}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <span className="text-gray-400 text-xs italic">Course-level</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 rounded-lg">
                                        Detailed question-level CO breakdowns are pending assessment marks ingestion for this specific offering, but overall course grade ({c.percentage}%) and mapped PO weights are fully reflected in calculations.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {courseFilterMode !== 'all' && <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 font-semibold flex items-center gap-2"><Filter className="w-3.5 h-3.5" />Course filter active: metrics above reflect only the {selectedCourseCodes.size} selected course{selectedCourseCodes.size !== 1 ? 's' : ''}. Deselected courses are dimmed.</div>}
              </div>
              {/* Faculty notes */}
              <div className="no-print bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex items-center justify-between"><h4 className="text-lg font-black text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-green-700" />Faculty Endorsement &amp; Review Remarks</h4></div>
                <textarea rows={3} placeholder="Enter faculty endorsement notes, qualitative review, or recommendation remarks..." value={facultyNotes} onChange={e => setFacultyNotes(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                <div className="flex justify-end"><button onClick={handleSaveNotes} disabled={savingNotes} className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 border border-emerald-950/20"><Save className="w-4 h-4" />{savingNotes ? 'Saving...' : 'Save Recommendation Remarks'}</button></div>
              </div>
              {/* Print sign-off */}
              <div className="hidden print:block border-t-2 border-gray-300 pt-8 mt-12">
                <div className="grid grid-cols-2 gap-12 text-center text-xs font-bold text-gray-800">
                  <div><div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-600">{studentProfile.facultyNotes ? `Faculty Remarks: "${studentProfile.facultyNotes}"` : '___________________________________________'}</div><p className="mt-8 font-black uppercase text-gray-900">Faculty Academic Evaluator</p><p className="text-[10px] text-gray-500">Department of Computer Science &amp; Engineering</p></div>
                  <div><div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-600">Status: <strong className="uppercase text-green-900">{computedProfile.recommendationStatus}</strong></div><p className="mt-8 font-black uppercase text-gray-900">Head of Department / Program Director</p><p className="text-[10px] text-gray-500">Outcome-Based Education (OBE) Board</p></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* BAETE CQI Faculty Meeting Report Modal */}
      <BatchCQIFacultyMeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        batchId={batchDisplay}
        section={selectedSection}
        threshold={threshold}
        cqiReport={batchCQIResult}
        completedCoursesCount={batchAvailableCourses.length}
      />
    </div>
  );
}
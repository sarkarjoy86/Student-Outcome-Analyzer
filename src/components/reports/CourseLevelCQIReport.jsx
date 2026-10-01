import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, RefreshCw, Copy, Check, FileDown, Edit3, Save,
  AlertTriangle, CheckCircle2, BookOpen, Layers, Target, Award,
  ChevronDown, ChevronUp, FileText, ArrowRight, Lightbulb, ShieldAlert
} from 'lucide-react';
import { generateCourseLevelCQI, getNextSemester } from '../../services/cqiAiService';
import { exportCourseCQIWord } from '../../services/cqiWordExportService';

export default function CourseLevelCQIReport({
  offering = null,
  courseCode = 'Course',
  courseTitle = 'Course Title',
  semesterName = 'Semester',
  academicYear = '',
  sectionName = 'A',
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  activeCOs = [],
  activePOs = [],
  calculations = {},
  coDescriptions = {},
  poDescriptions = {},
}) {
  const [loading, setLoading] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [cqiData, setCqiData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  const offeringId = offering?._id || offering?.id || `${courseCode}_${semesterName}_${academicYear}`;
  const notesStorageKey = `BAETE_CQI_NOTES_${offeringId}`;
  const nextTerm = getNextSemester(semesterName, academicYear);

  // Load custom notes from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(notesStorageKey);
      if (savedNotes) {
        setCustomNotes(savedNotes);
      }
    } catch (e) {}
  }, [notesStorageKey]);

  // Initial load / fetch of CQI Report
  const loadCQIReport = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const res = await generateCourseLevelCQI({
        offeringId,
        courseCode,
        courseTitle,
        semesterName,
        academicYear,
        sectionName,
        targetPassMarks,
        kpiCO,
        kpiPO,
        activeCOs,
        activePOs,
        calculations,
        coDescriptions,
        poDescriptions,
        forceRegenerate,
        customTeacherNotes: customNotes,
      });
      setCqiData(res);
      if (!customNotes && res.meetingMinutesDraft) {
        setCustomNotes(res.meetingMinutesDraft);
      }
    } catch (err) {
      console.error('[CourseLevelCQIReport] Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCQIReport(false);
  }, [courseCode, semesterName, academicYear, targetPassMarks, kpiCO, kpiPO, activeCOs.length, activePOs.length]);

  // Quick summary calculation for status badges
  const stats = useMemo(() => {
    const coAtt = calculations?.coAttainment || {};
    const poAtt = calculations?.poAttainment || {};
    const deficitCOs = activeCOs.filter(co => (coAtt[co]?.kpiPercentage || 0) < kpiCO);
    const deficitPOs = activePOs.filter(po => (poAtt[po]?.kpiPercentage || 0) < kpiPO);
    return {
      deficitCOsCount: deficitCOs.length,
      deficitPOsCount: deficitPOs.length,
      isAllMet: deficitCOs.length === 0 && deficitPOs.length === 0,
    };
  }, [calculations, activeCOs, activePOs, kpiCO, kpiPO]);

  // Dynamic Headings & Conditioning based on Attainment Status:
  // Scenario A (Deficit): at least one CO or PO unmet
  // Scenario B (Proactive/High-Performing): all COs and POs attained
  const isAllAttained = cqiData?.allAttained !== undefined ? Boolean(cqiData.allAttained) : stats.isAllMet;

  const section1Title = isAllAttained
    ? '1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS'
    : '1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)';

  const section1Sublabel = isAllAttained
    ? 'IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:'
    : 'IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:';

  // Handle Save Notes
  const handleSaveNotes = () => {
    try {
      localStorage.setItem(notesStorageKey, customNotes);
      setIsEditingNotes(false);
    } catch (e) {
      console.warn('Could not save notes:', e);
    }
  };

  // Handle Copy Report to Clipboard
  const handleCopyReport = () => {
    if (!cqiData) return;
    const text = `=====================================================
BAETE CRITERION 9.2: COURSE CQI & CLOSING-THE-LOOP ACTION REPORT
Course: ${courseCode} - ${courseTitle}
Semester: ${semesterName} ${academicYear} | Section: ${sectionName}
Subsequent Target Semester: ${nextTerm}
Benchmarks: Pass Mark ≥ ${targetPassMarks}% · Course KPI ≥ ${kpiCO}% · Program KPI ≥ ${kpiPO}%
Date: ${new Date().toLocaleDateString()}
=====================================================

${section1Title}:
${cqiData.summary}

${section1Sublabel}
${(cqiData.rootCauses || []).map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

2. PEDAGOGICAL REMEDIATIONS & INTERVENTIONS:
${(cqiData.remediations || []).map(rem => `  - [${rem.code}] ${rem.title} (${rem.category || 'Intervention'}):
    ${rem.action}`).join('\n\n')}

3. ACTION DIRECTIVES FOR NEXT OFFERING (${nextTerm}):
${(cqiData.actionPlanForNextSemester || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

4. CLOSING-THE-LOOP TARGET:
${cqiData.closingTheLoopTarget || `Achieve target threshold in ${nextTerm}.`}

5. COURSE ASSESSMENT COMMITTEE (CAC) DISCUSSION MINUTES:
${customNotes || cqiData.meetingMinutesDraft || 'None'}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Direct High-Fidelity Word (.doc) Export via cqiWordExportService
  const handleExportWord = () => {
    if (!cqiData) return;
    setExportingWord(true);
    try {
      exportCourseCQIWord({
        courseCode,
        courseTitle,
        semesterName,
        academicYear,
        sectionName,
        nextTerm,
        targetPassMarks,
        kpiCO,
        kpiPO,
        cqiData,
        customNotes,
        allAttained: isAllAttained,
      });
    } catch (err) {
      console.error('[CourseLevelCQIReport] Error generating Word document:', err);
    } finally {
      setTimeout(() => setExportingWord(false), 800);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-emerald-50/15 to-teal-50/20 rounded-2xl shadow-xl border border-emerald-200/90 overflow-hidden my-6 transition-all duration-300">
      {/* ══ Header ══ */}
      <div className="p-5 bg-gradient-to-r from-emerald-950 via-green-900 to-teal-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/40">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 flex-shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                BAETE Criterion 9.2
              </span>
              <span className="text-xs font-semibold text-emerald-100/90">
                Course Review &amp; Closing-the-Loop Action Matrix
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1">
              Continuous Quality Improvement (CQI) Action Plan — {courseCode}
            </h3>
            <p className="text-xs text-emerald-200/80 font-medium">
              Benchmarks: Pass Mark ≥ {targetPassMarks}% · Course KPI ≥ {kpiCO}% · Program KPI ≥ {kpiPO}%
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center no-print">
          <button
            onClick={() => loadCQIReport(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer border border-emerald-400/30"
            title="Re-analyze CO/PO attainment and generate fresh pedagogical recommendations via Gemini AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing with AI...' : 'Regenerate CQI'}
          </button>

          <button
            onClick={handleCopyReport}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
            title="Copy formatted CQI report to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={handleExportWord}
            disabled={exportingWord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Download Course CQI Action Report directly as Microsoft Word (.doc)"
          >
            <FileDown className={`w-3.5 h-3.5 ${exportingWord ? 'animate-bounce' : ''}`} />
            {exportingWord ? 'Exporting Word...' : 'Word (.doc)'}
          </button>

          <button
            onClick={() => setExpanded(prev => !prev)}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={expanded ? 'Collapse CQI module' : 'Expand CQI module'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ══ Body ══ */}
      {expanded && (
        <div className="p-5 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${stats.deficitCOsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`p-2 rounded-lg ${stats.deficitCOsCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Target size={18} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">Course Outcomes (COs)</div>
                <div className="text-sm font-black text-gray-900">
                  {stats.deficitCOsCount > 0 ? (
                    <span className="text-rose-700 font-extrabold">{stats.deficitCOsCount} CO(s) Below KPI</span>
                  ) : (
                    <span className="text-emerald-700 font-extrabold">All Active COs Met KPI</span>
                  )}
                </div>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${stats.deficitPOsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`p-2 rounded-lg ${stats.deficitPOsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Award size={18} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">Program Outcomes (POs)</div>
                <div className="text-sm font-black text-gray-900">
                  {stats.deficitPOsCount > 0 ? (
                    <span className="text-amber-800 font-extrabold">{stats.deficitPOsCount} PO(s) Require Remediation</span>
                  ) : (
                    <span className="text-emerald-700 font-extrabold">All Mapped POs Met KPI</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-teal-50 border-teal-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                <ShieldAlert size={18} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">BAETE Loop Status</div>
                <div className="text-sm font-black text-teal-950">
                  {stats.isAllMet ? 'Closing-the-Loop Verified' : 'Action Plan Mandated'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & RCA / Continuous Enhancement */}
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-800" />
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {section1Title}
              </h4>
            </div>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              {cqiData?.summary || 'Analyzing course outcomes and generating evidence-based continuous quality improvement directives...'}
            </p>

            {cqiData?.rootCauses && cqiData.rootCauses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900 mb-1.5">
                  {section1Sublabel}
                </div>
                <ul className="space-y-1">
                  {cqiData.rootCauses.map((rc, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                      <span>{rc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section 2: Course Pedagogical Remediations Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                  2. Targeted Pedagogical Remediations &amp; Interventions
                </h4>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold">
                BAETE Criterion 9 Action Matrix
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(cqiData?.remediations || []).map((rem, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-emerald-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {rem.code}
                      </span>
                      {rem.category && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {rem.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-extrabold text-gray-900 mb-1">
                      {rem.title}
                    </div>
                    <p className="text-xs text-gray-700 font-medium leading-relaxed">
                      {rem.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Action Plan for Next Semester & Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    3. Action Directives for Next Offering ({nextTerm})
                  </h4>
                </div>
              </div>
              <ul className="space-y-1.5 mt-2">
                {(cqiData?.actionPlanForNextSemester || [
                  `Update syllabus problem-solving modules with Bloom's taxonomy scaffolding in ${nextTerm}.`,
                  `Introduce tutorial sessions focusing on identified low-attaining units in ${nextTerm}.`,
                  `Refine laboratory grading rubrics with direct performance thresholds.`,
                ]).map((act, i) => (
                  <li key={i} className="text-xs text-gray-700 font-medium flex items-start gap-2">
                    <span className="text-emerald-700 font-black text-xs">{i + 1}.</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-xl p-4 border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    4. Closing-the-Loop Target &amp; Verification
                  </h4>
                </div>
                <p className="text-xs text-gray-800 font-semibold leading-relaxed">
                  {cqiData?.closingTheLoopTarget || `Aim to elevate student attainment across all evaluated outcomes above the prescribed KPI benchmark in ${nextTerm}.`}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-gray-600 font-semibold">
                <span>Verification Authority:</span>
                <span className="text-emerald-950 font-bold">Course Assessment Committee (CAC)</span>
              </div>
            </div>
          </div>

          {/* Section 5: Course Assessment Committee (CAC) Review & Pedagogical Discussion Minutes */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
                  5. Course Assessment Committee (CAC) Review &amp; Pedagogical Discussion Minutes
                </h4>
              </div>
              <div className="flex items-center gap-2 no-print">
                {isEditingNotes ? (
                  <button
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Save size={13} /> Save Minutes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit / Paste Minutes
                  </button>
                )}
              </div>
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <p className="text-[11px] text-stone-500">
                  Document formal Course Assessment Committee (CAC) deliberations, instructor reflections, and continuous improvement commitments for this course offering.
                </p>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  rows={6}
                  placeholder="Paste teacher CQI notes, meeting decisions, or customized action items..."
                  className="w-full text-xs font-mono p-3 rounded-lg border border-stone-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            ) : (
              <pre className="text-xs font-mono text-stone-800 bg-white p-3.5 rounded-lg border border-stone-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {customNotes || cqiData?.meetingMinutesDraft || 'No custom meeting notes added yet. Click "Edit / Paste Minutes" to document faculty deliberations.'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

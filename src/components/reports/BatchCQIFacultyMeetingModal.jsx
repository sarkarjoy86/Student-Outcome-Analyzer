import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, FileDown, Edit3, Save, FileText,
  Calendar, Layers, CheckCircle2, ShieldAlert, Award,
  Users, Building, Target, Sparkles, BookOpen
} from 'lucide-react';
import { exportBatchCQIWord } from '../../services/cqiWordExportService';

export default function BatchCQIFacultyMeetingModal({
  isOpen,
  onClose,
  batchId = 'Batch',
  section = 'ALL',
  threshold = 50,
  cqiReport = null,
  completedCoursesCount = 0,
}) {
  const [copied, setCopied] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');

  const displayBatch = typeof batchId === 'object'
    ? (batchId?.name || batchId?.batchNum || 'Batch')
    : String(batchId || 'Batch');

  const storageKey = `BAETE_BATCH_CQI_MEETING_NOTES_${displayBatch}_${section}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMeetingNotes(saved);
      } else if (cqiReport?.facultyMeetingReport?.officialMinutesText) {
        setMeetingNotes(cqiReport.facultyMeetingReport.officialMinutesText);
      }
    } catch (e) {}
  }, [storageKey, cqiReport]);

  if (!isOpen || !cqiReport) return null;

  const r = cqiReport.facultyMeetingReport || {};
  const meta = r.meetingMetadata || {};

  const handleSaveNotes = () => {
    try {
      localStorage.setItem(storageKey, meetingNotes);
      setIsEditingNotes(false);
    } catch (e) {
      console.warn('Failed saving meeting notes:', e);
    }
  };

  const handleCopyFullReport = () => {
    const fullText = `================================================================================
BAETE CRITERION 3 & 9: CONTINUOUS QUALITY IMPROVEMENT (CQI) FACULTY REVIEW & ACTION REPORT
Department of Computer Science and Engineering
Bangladesh Army International University of Science and Technology (BAIUST), Cumilla
================================================================================
Batch: ${displayBatch} | Section: ${section} | Evaluated Courses: ${completedCoursesCount}
Evaluation Benchmark Threshold: ${threshold}% | Date: ${meta.date || new Date().toLocaleDateString()}
Committee: ${meta.committee || 'Departmental Academic Committee (DAC) & Course Assessment Committee (CAC)'}
================================================================================

1. EXECUTIVE EVALUATION SUMMARY:
${r.executiveSummary || 'N/A'}

2. ROOT CAUSE ANALYSIS (RCA) BY WASHINGTON ACCORD CLUSTERS:
${(r.rootCauseAnalysis || []).map((rc, i) => `  ${i + 1}. [${rc.cluster}]
     - Finding: ${rc.finding}
     - Pedagogical Action: ${rc.action}`).join('\n\n')}

3. CURRICULUM REALIGNMENT ROADMAP (UNMAPPED / DEFICIT PO ALLOCATIONS):
${(r.curriculumRealignmentPlan || []).map((cr, i) => `  ${i + 1}. ${cr.po} (${cr.name || ''}) [${cr.status}]:
     ${cr.recommendation}`).join('\n\n')}

4. CLOSING-THE-LOOP IMPLEMENTATION TIMELINE & FACULTY RESPONSIBILITIES:
${(r.closingTheLoopTimeline || []).map((tl, i) => `  ${i + 1}. ${tl.phase}
     - Milestone: ${tl.milestone}
     - Responsible Body: ${tl.responsible}`).join('\n\n')}

5. OFFICIAL MINUTES OF MEETING & FACULTY DELIBERATION NOTES:
${meetingNotes || r.officialMinutesText || 'No custom minutes entered.'}
================================================================================`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Direct High-Fidelity Word Export via cqiWordExportService
  const handleExportWord = () => {
    if (!cqiReport) return;
    setExportingWord(true);
    try {
      exportBatchCQIWord({
        batchId: displayBatch,
        section,
        threshold,
        completedCoursesCount,
        cqiReport,
        meetingNotes,
      });
    } catch (err) {
      console.error('[BatchCQIFacultyMeetingModal] Error generating Word document:', err);
    } finally {
      setTimeout(() => setExportingWord(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-gray-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ══ Modal Header ══ */}
        <div className="p-6 bg-gradient-to-r from-gray-950 via-emerald-950 to-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
              <Building className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  BAETE SAR Criteria 3 &amp; 9
                </span>
                <span className="text-xs font-semibold text-emerald-200/90">
                  OBE Closing-the-Loop Protocol
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1.5">
                BAETE CQI Faculty Review &amp; Closing-the-Loop Action Report
              </h3>
              <p className="text-xs text-emerald-200/80 font-medium">
                Department of Computer Science and Engineering · BAIUST, Cumilla
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 self-end sm:self-center no-print">
            <button
              onClick={handleCopyFullReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-xs"
              title="Copy complete formatted report text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Full Report!' : 'Copy Report'}
            </button>

            <button
              onClick={handleExportWord}
              disabled={exportingWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Download official report directly as Microsoft Word (.doc)"
            >
              <FileDown className={`w-4 h-4 ${exportingWord ? 'animate-bounce' : ''}`} />
              {exportingWord ? 'Exporting Word...' : 'Word (.doc)'}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close dialog"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ══ Modal Body (Scrollable) ══ */}
        <div className="p-6 overflow-y-auto space-y-6 text-gray-800 text-xs font-medium">
          
          {/* Metadata Card */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Committee</div>
              <div className="font-extrabold text-gray-900 mt-0.5">{meta.committee || 'DAC / CAC'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Cohort / Batch</div>
              <div className="font-extrabold text-gray-900 mt-0.5">Batch {displayBatch} ({section === 'ALL' ? 'All Sections' : `Sec ${section}`})</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Threshold Benchmark</div>
              <div className="font-extrabold text-emerald-950 mt-0.5">{threshold}% Target</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Review Date</div>
              <div className="font-extrabold text-gray-900 mt-0.5">{meta.date || new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-800" />
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                1. Executive Summary &amp; Attainment Synthesis
              </h4>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed font-normal">
              {r.executiveSummary || 'Cumulative review of direct program outcome attainment against Washington Accord accreditation benchmarks.'}
            </p>
          </div>

          {/* Section 2: Root Cause Analysis */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                2. Root Cause Analysis (RCA) by WA Competency Clusters
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(r.rootCauseAnalysis || []).map((rc, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
                  <div className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                    {rc.cluster}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    <strong className="text-gray-800">Finding:</strong> {rc.finding}
                  </div>
                  <div className="text-[11px] text-emerald-900 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 font-semibold">
                    <strong className="text-emerald-950">Intervention:</strong> {rc.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Curriculum Realignment Roadmap for Unmapped POs */}
          {r.curriculumRealignmentPlan && r.curriculumRealignmentPlan.length > 0 && (
            <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-amber-950">
                    3. Curriculum Realignment Roadmap (Unmapped POs / 0% Attainment)
                  </h4>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 border border-amber-300">
                  BAETE Criterion 4 Deficiency Rectification
                </span>
              </div>
              <div className="space-y-2.5">
                {r.curriculumRealignmentPlan.map((cr, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-xl border border-amber-200/80 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0 mt-0.5">
                      {cr.po}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-gray-900">
                        {cr.name ? `${cr.po} - ${cr.name}` : cr.po} · <span className="text-rose-600 font-extrabold">{cr.status}</span>
                      </div>
                      <p className="text-xs text-gray-700 font-normal leading-relaxed">
                        {cr.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Closing-the-Loop Implementation Timeline & Faculty Responsibilities */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                4. Closing-the-Loop Implementation Timeline &amp; Responsibilities
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Implementation Phase</th>
                    <th className="py-2.5 px-3">Target Milestone / Deliverable</th>
                    <th className="py-2.5 px-3">Responsible Authority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(r.closingTheLoopTimeline || []).map((tl, i) => (
                    <tr key={i} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-3 font-black text-emerald-950">{tl.phase}</td>
                      <td className="py-2.5 px-3 text-gray-700">{tl.milestone}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">{tl.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Minutes of Meeting & Faculty Discussion Notes (Editable & Persistent) */}
          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-700" />
                <h4 className="text-sm font-black uppercase tracking-wider text-stone-900">
                  5. Departmental Meeting Minutes &amp; Faculty Discussion Notes
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
                  Teachers can type or paste minutes from departmental review meetings. Saved notes persist locally and are included in the official print and copy exports.
                </p>
                <textarea
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  rows={8}
                  placeholder="Paste departmental meeting minutes or faculty discussion notes..."
                  className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            ) : (
              <pre className="text-xs font-mono text-stone-800 bg-white p-4 rounded-xl border border-stone-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {meetingNotes || r.officialMinutesText || 'Click "Edit / Paste Minutes" to record discussion minutes from the faculty review meeting.'}
              </pre>
            )}
          </div>
        </div>

        {/* ══ Modal Footer ══ */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between no-print">
          <div className="text-[11px] text-gray-500 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for inclusion in BAETE Self-Assessment Report (Criterion 9 CQI File)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-gray-800 hover:bg-gray-900 text-white transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

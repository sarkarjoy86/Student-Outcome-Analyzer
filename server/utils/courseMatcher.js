/**
 * Smart Course Normalization & Fuzzy Matcher Utility
 * Supports flexible matching between DB courses and archived question datasets:
 * - Code matching (e.g., "CSE 319" === "CSE-319" === "CSE319")
 * - Title normalization (& vs and, singular/plural, punctuation, case-insensitive)
 * - Known Department course renaming / alias mapping (e.g. "Engineering Ethics" <-> "Ethics and Management")
 */

export function normalizeCourseCode(code = '') {
  if (!code || typeof code !== 'string') return ''
  return code.toUpperCase().replace(/[\s\-_]/g, '').trim()
}

export function extractCodeNumber(code = '') {
  if (!code) return ''
  const m = String(code).match(/\d{3}/)
  return m ? m[0] : ''
}

export function extractCleanCourseTitle(rawName = '') {
  if (!rawName || typeof rawName !== 'string') return ''
  let cleaned = rawName.trim()
  // If formatted as "CSE 113: Discrete Mathematics", extract title after colon
  if (cleaned.includes(':')) {
    cleaned = cleaned.split(':').slice(1).join(':').trim()
  } else if (/^[A-Z]{2,4}\s*[-]?\s*\d{3}\s+/.test(cleaned)) {
    // If formatted as "CSE 113 Discrete Mathematics"
    cleaned = cleaned.replace(/^[A-Z]{2,4}\s*[-]?\s*\d{3}\s+/, '').trim()
  }
  return cleaned
}

export function normalizeCourseTitle(title = '') {
  if (!title || typeof title !== 'string') return ''
  let s = extractCleanCourseTitle(title).toLowerCase()

  // Standardize conjunctions and symbols
  s = s.replace(/&/g, ' and ')
  s = s.replace(/[\-_/,:;()[\]{}'"!]/g, ' ')

  // Stem common plural engineering course words to singular
  const stemWords = [
    [/\bstructures\b/g, 'structure'],
    [/\balgorithms\b/g, 'algorithm'],
    [/\bcommunications\b/g, 'communication'],
    [/\bnetworks\b/g, 'network'],
    [/\bmethods\b/g, 'method'],
    [/\bsystems\b/g, 'system'],
    [/\btechnologies\b/g, 'technology'],
    [/\bpatterns\b/g, 'pattern'],
    [/\bactivities\b/g, 'activity'],
    [/\blanguages\b/g, 'language'],
    [/\bmathematics\b/g, 'math']
  ]
  stemWords.forEach(([regex, repl]) => {
    s = s.replace(regex, repl)
  })

  // Normalize multi-spaces
  return s.replace(/\s+/g, ' ').trim()
}

// Canonical Aliases for courses that underwent syllabus renaming or department code changes
const ALIAS_GROUPS = [
  ['engineering ethic', 'ethic and management', 'ethic'],
  ['computer algorithm and complexity', 'computer algorithm', 'algorithm'],
  ['research methodology and complex engineering activity', 'research methodology'],
  ['microprocessor assembly language and computer interfacing', 'microprocessor and assembly language', 'computer interfacing'],
  ['management information system', 'management of information system'],
  ['system analysis design and development', 'system analysis and design'],
  ['discrete math', 'discrete mathematics']
]

export function areTitlesAliasMatching(normA, normB) {
  if (!normA || !normB) return false
  for (const group of ALIAS_GROUPS) {
    const hasA = group.some(alias => normA.includes(alias) || alias.includes(normA))
    const hasB = group.some(alias => normB.includes(alias) || alias.includes(normB))
    if (hasA && hasB) return true
  }
  return false
}

/**
 * Checks if two course representations match using the Smart OR-Logic:
 * Matches if:
 * 1. Normalized course code matches (e.g., "CSE-211" == "CSE 211")
 * 2. Course code 3-digit number matches (e.g. 211 == 211)
 * 3. Normalized titles match or have high token containment
 * 4. Known aliases match
 */
export function isCourseMatch(targetCourse = {}, candidateCourse = {}) {
  const targetCodeKey = normalizeCourseCode(targetCourse.code || targetCourse.courseCode || '')
  const candidateCodeKey = normalizeCourseCode(candidateCourse.code || candidateCourse.courseCode || '')

  // 1. Direct Code Key Match (e.g. "CSE211" === "CSE211")
  if (targetCodeKey && candidateCodeKey && targetCodeKey === candidateCodeKey) {
    return true
  }

  // 2. 3-digit course number match if department prefix is similar
  const targetNum = extractCodeNumber(targetCodeKey)
  const candNum = extractCodeNumber(candidateCodeKey)
  if (targetNum && candNum && targetNum === candNum) {
    return true
  }

  // 3. Title Normalization & Token Matching
  const targetNorm = normalizeCourseTitle(targetCourse.name || targetCourse.courseName || targetCourse.title || '')
  const candNorm = normalizeCourseTitle(candidateCourse.name || candidateCourse.courseName || candidateCourse.title || '')

  if (targetNorm && candNorm) {
    if (targetNorm === candNorm) return true
    if (targetNorm.includes(candNorm) || candNorm.includes(targetNorm)) return true

    // Check token overlap
    const targetTokens = new Set(targetNorm.split(' ').filter(w => w.length > 2))
    const candTokens = new Set(candNorm.split(' ').filter(w => w.length > 2))
    if (targetTokens.size > 0 && candTokens.size > 0) {
      let common = 0
      targetTokens.forEach(t => { if (candTokens.has(t)) common++ })
      const overlap = common / Math.min(targetTokens.size, candTokens.size)
      if (overlap >= 0.75) return true
    }

    // 4. Known Aliases Match
    if (areTitlesAliasMatching(targetNorm, candNorm)) {
      return true
    }
  }

  return false
}

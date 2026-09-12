/**
 * Smart Code Formatter & Auto-Orientation Utility
 * Designed for University Exam Paper Code Snippet Generation & Question Analysis.
 * Formats single-line squished or poorly indented code (C++, C, Python, Java, Pseudocode)
 * into beautifully indented, line-by-line formatted blocks with 4-space indentation.
 */

/**
 * Checks if a code snippet is crammed into a single line or poorly formatted.
 */
export function isCodeLikelySingleLine(codeStr = '') {
  if (!codeStr || typeof codeStr !== 'string') return false
  const trimmed = codeStr.trim()
  const lines = trimmed.split('\n').filter(l => l.trim().length > 0)
  
  if (lines.length <= 2) {
    const semicolonCount = (trimmed.match(/;/g) || []).length
    const braceCount = (trimmed.match(/[{}]/g) || []).length
    const colonCount = (trimmed.match(/:/g) || []).length

    if (semicolonCount >= 2 || braceCount >= 2) return true
    if (colonCount >= 2 && /\b(def|class|if|else|elif|for|while|Algorithm)\b/i.test(trimmed)) return true
    if (/\b(class|struct|public:|private:|#include|void|int|for|while|if|def|Algorithm)\b/i.test(trimmed) && (semicolonCount >= 1 || braceCount >= 1 || colonCount >= 1)) {
      return true
    }
  }
  return false
}

/**
 * Smart formatter for C / C++ / Java code.
 */
export function formatCppCode(rawCode = '') {
  if (!rawCode || typeof rawCode !== 'string') return ''

  let text = rawCode.trim()

  // Tokenize while respecting quotes and parenthesis (especially for(...) loops)
  let result = ''
  let inString = false
  let stringChar = ''
  let isEscaped = false
  let parenDepth = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (isEscaped) {
      result += ch
      isEscaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      isEscaped = true
      continue
    }

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true
      stringChar = ch
      result += ch
      continue
    }

    if (inString && ch === stringChar) {
      inString = false
      result += ch
      continue
    }

    if (inString) {
      result += ch
      continue
    }

    // Inside normal code (not inside string literal)
    if (ch === '(') {
      parenDepth++
      result += ch
      continue
    }
    if (ch === ')') {
      if (parenDepth > 0) parenDepth--
      result += ch

      // If we just closed a for/if/while header and it's followed by a statement (not '{')
      let look = i + 1
      while (look < text.length && /\s/.test(text[look])) look++
      if (parenDepth === 0 && look < text.length && text[look] !== '{' && text[look] !== ';' && text[look] !== ')') {
        const before = text.slice(Math.max(0, i - 40), i + 1)
        if (/\b(for|if|while)\s*\(.*\)$/.test(before.trim())) {
          result += '\n'
        }
      }
      continue
    }

    // Block opener '{'
    if (ch === '{') {
      if (result.length > 0 && !/\s$/.test(result)) {
        result += ' '
      }
      result += '{\n'
      continue
    }

    // Block closer '}'
    if (ch === '}') {
      if (result.length > 0 && !/\n\s*$/.test(result)) {
        result += '\n'
      }
      result += '}'
      // Check if followed by semicolon (like '};')
      let lookAhead = i + 1
      while (lookAhead < text.length && /\s/.test(text[lookAhead])) {
        lookAhead++
      }
      if (lookAhead < text.length && text[lookAhead] === ';') {
        result += ';'
        i = lookAhead
      }
      result += '\n'
      continue
    }

    // Statement terminator ';'
    if (ch === ';') {
      result += ';'
      if (parenDepth === 0) {
        result += '\n'
      }
      continue
    }

    // Access specifiers: public:, private:, protected:
    const remaining = text.slice(i)
    const specifierMatch = remaining.match(/^(public|private|protected)\s*:/i)
    if (specifierMatch && parenDepth === 0) {
      if (result.length > 0 && !/\n\s*$/.test(result)) {
        result += '\n'
      }
      result += specifierMatch[1] + ':\n'
      i += specifierMatch[0].length - 1
      continue
    }

    // Preprocessor directive '#include' or '#define'
    if (ch === '#' && (result.length === 0 || /\n\s*$/.test(result))) {
      result += '#'
      continue
    }

    result += ch
  }

  // Step 2: Line cleanup & spacing normalization
  const rawLines = result.split('\n')
  const formattedLines = []
  let indentLevel = 0
  let hangingIndentNext = false

  for (let rawLine of rawLines) {
    let line = rawLine.trim()
    if (!line) continue

    // Normalize spaces within line
    line = line.replace(/\s+/g, ' ')

    // Fix control structures spacing: for (...), if (...), while (...)
    line = line.replace(/\b(for|if|while|switch)\s*\(/g, '$1 (')

    // Fix stream operators << and >> spacing
    line = line.replace(/\s*<<\s*/g, ' << ')
    line = line.replace(/\s*>>\s*/g, ' >> ')

    // Fix arrow -> and scope ::
    line = line.replace(/\s*->\s*/g, '->')
    line = line.replace(/\s*::\s*/g, '::')

    // Fix increment/decrement ++ and --
    line = line.replace(/(\w+)\s*\+\+/g, '$1++')
    line = line.replace(/\+\+\s*(\w+)/g, '++$1')
    line = line.replace(/(\w+)\s*--/g, '$1--')
    line = line.replace(/--\s*(\w+)/g, '--$1')

    // Fix commas and semicolons
    line = line.replace(/\s*,\s*/g, ', ')
    line = line.replace(/\s*;\s*/g, '; ')
    line = line.replace(/;\s*$/, ';')

    // Clean brackets
    line = line.replace(/\s*\{/g, ' {')

    // Comparison & arithmetic spacing (avoid breaking #include <iostream>)
    if (!line.startsWith('#') && !line.includes('<iostream>') && !line.includes('<vector>') && !line.includes('<string>') && !line.includes('<stdio.h>')) {
      line = line.replace(/([a-zA-Z0-9_\]])\s*([<>=!]=?|\+|\-)\s*([a-zA-Z0-9_\(\[])/g, '$1 $2 $3')
    }

    // Dedent for closing braces
    if (line.startsWith('}') || line.startsWith('};')) {
      indentLevel = Math.max(0, indentLevel - 1)
      hangingIndentNext = false
    }

    // Access specifiers: public:, private:, protected:
    const isSpecifier = /^(public|private|protected):/i.test(line)
    let effectiveIndent = isSpecifier ? Math.max(0, indentLevel - 1) : indentLevel
    if (hangingIndentNext && !line.startsWith('}') && !line.startsWith('{')) {
      effectiveIndent += 1
      hangingIndentNext = false
    }

    const prefix = '    '.repeat(effectiveIndent)
    formattedLines.push(prefix + line)

    // Check if this line is a control statement without braces (e.g. for(...) or if(...) without '{')
    if (/\b(for|if|while)\s*\(.*\)$/.test(line) && !line.endsWith('{') && !line.endsWith(';')) {
      hangingIndentNext = true
    }

    // Indent for opening braces
    if (line.endsWith('{')) {
      indentLevel++
      hangingIndentNext = false
    }
  }

  return formattedLines.join('\n')
}

/**
 * Smart formatter for Python code.
 * Intelligently separates single-line squished Python code using colons, semicolons, and keywords,
 * then constructs rigorous 4-space Python indentation blocks.
 */
export function formatPythonCode(rawCode = '') {
  if (!rawCode || typeof rawCode !== 'string') return ''
  let text = rawCode.trim()

  // First pass: tokenize and split statements into logical lines
  let result = ''
  let inString = false
  let stringChar = ''
  let isEscaped = false
  let parenDepth = 0
  let bracketDepth = 0
  let braceDepth = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (isEscaped) {
      result += ch
      isEscaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      isEscaped = true
      continue
    }

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true
      stringChar = ch
      result += ch
      continue
    }

    if (inString && ch === stringChar) {
      inString = false
      result += ch
      continue
    }

    if (inString) {
      result += ch
      continue
    }

    // Depth tracking
    if (ch === '(') { parenDepth++; result += ch; continue; }
    if (ch === ')') { if (parenDepth > 0) parenDepth--; result += ch; continue; }
    if (ch === '[') { bracketDepth++; result += ch; continue; }
    if (ch === ']') { if (bracketDepth > 0) bracketDepth--; result += ch; continue; }
    if (ch === '{') { braceDepth++; result += ch; continue; }
    if (ch === '}') { if (braceDepth > 0) braceDepth--; result += ch; continue; }

    // Semicolon outside parens/quotes -> newline
    if (ch === ';') {
      result += '\n'
      continue
    }

    // Check for 'else:', 'elif ', 'except', 'finally:', 'def ', 'class ' preceded by code
    const remaining = text.slice(i)
    const midBlockMatch = remaining.match(/^(else\s*:|elif\b|except\b|finally\s*:|def\s+[A-Za-z0-9_]+|class\s+[A-Za-z0-9_]+)/)
    if (midBlockMatch && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      const prevNonSpace = result.trimEnd().slice(-1)
      if (prevNonSpace && prevNonSpace !== '\n' && prevNonSpace !== ':') {
        result += '\n'
      }
    }

    // Check for colon ':' outside dicts, slices, or parens
    if (ch === ':') {
      result += ':'
      if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        let look = i + 1
        while (look < text.length && (text[look] === ' ' || text[look] === '\t')) look++
        if (look < text.length && text[look] !== '\n' && text[look] !== '#' && text[look] !== '\r') {
          result += '\n'
        }
      }
      continue
    }

    result += ch
  }

  // Second pass: line by line indentation with class and block tracking
  const rawLines = result.split('\n')
  const formattedLines = []
  let indentLevel = 0
  let insideClass = false

  for (let rawLine of rawLines) {
    let line = rawLine.trim()
    if (!line) continue

    // Normalize spacing
    line = line.replace(/\s+/g, ' ')
    line = line.replace(/:\s*$/, ':')

    // Dedent for block continuations
    if (/^(elif\b|else:|except\b|finally:)/.test(line)) {
      indentLevel = Math.max(insideClass ? 1 : 0, indentLevel - 1)
    } else if (/^class\b/.test(line)) {
      // Classes in exam papers are top-level
      indentLevel = 0
      insideClass = true
    } else if (/^def\b/.test(line)) {
      // Methods inside classes are indented 1 level, standalone functions at 0
      indentLevel = insideClass ? 1 : 0
    }

    const prefix = '    '.repeat(indentLevel)
    formattedLines.push(prefix + line)

    if (line.endsWith(':')) {
      indentLevel++
    }
  }

  return formattedLines.join('\n')
}

/**
 * Smart formatter for Pseudocode and Algorithms.
 * Formats Algorithm, Procedure, Function, while/for loops, if-then-else, and begin/end constructs.
 */
export function formatPseudocode(rawCode = '') {
  if (!rawCode || typeof rawCode !== 'string') return ''
  let text = rawCode.trim()

  // First pass: token-based line splitting
  let result = ''
  let inString = false
  let stringChar = ''
  let isEscaped = false
  let parenDepth = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (isEscaped) {
      result += ch
      isEscaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      isEscaped = true
      continue
    }

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true
      stringChar = ch
      result += ch
      continue
    }

    if (inString && ch === stringChar) {
      inString = false
      result += ch
      continue
    }

    if (inString) {
      result += ch
      continue
    }

    if (ch === '(') { parenDepth++; result += ch; continue; }
    if (ch === ')') { if (parenDepth > 0) parenDepth--; result += ch; continue; }

    // Semicolon outside parens -> newline
    if (ch === ';') {
      result += ';\n'
      continue
    }

    // Split before keywords if preceded by code on the same line
    const remaining = text.slice(i)
    const kwMatch = remaining.match(/^(else\s+if\b|else\b|end\s+if\b|end\s+while\b|end\s+for\b|end\b|until\b|return\b)/i)
    if (kwMatch && parenDepth === 0) {
      const prev = result.trimEnd().slice(-1)
      if (prev && prev !== '\n' && prev !== ':' && prev !== ';') {
        result += '\n'
      }
    }

    // Colon after Algorithm/do/then -> newline
    if (ch === ':') {
      result += ':'
      let look = i + 1
      while (look < text.length && (text[look] === ' ' || text[look] === '\t')) look++
      if (look < text.length && text[look] !== '\n' && text[look] !== '\r') {
        result += '\n'
      }
      continue
    }

    result += ch
  }

  // Second pass: Indentation computation
  const rawLines = result.split('\n')
  const formattedLines = []
  let indentLevel = 0

  for (let rawLine of rawLines) {
    let line = rawLine.trim()
    if (!line) continue

    // Normalize spaces
    line = line.replace(/\s+/g, ' ')

    // Dedent for block continuations and closers
    if (/^(else\s+if\b|else\b|elif\b|end\b|until\b)/i.test(line)) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const prefix = '    '.repeat(indentLevel)
    formattedLines.push(prefix + line)

    // Indent for block openers
    if (/:$/.test(line) || /\b(do|then|begin)$/i.test(line)) {
      indentLevel++
    }
  }

  return formattedLines.join('\n')
}

/**
 * Universal smart format dispatcher by language.
 */
export function smartFormatCode(codeStr = '', language = 'cpp') {
  const lang = (language || 'cpp').toLowerCase()
  if (lang === 'python') {
    return formatPythonCode(codeStr)
  }
  if (lang === 'pseudocode' || lang === 'algo' || lang === 'algorithm') {
    return formatPseudocode(codeStr)
  }
  return formatCppCode(codeStr)
}

/**
 * Analyzes question text to detect if it contains an embedded code snippet.
 */
export function detectEmbeddedCodeInQuestion(questionText = '') {
  if (!questionText || typeof questionText !== 'string') {
    return { hasCode: false, promptText: questionText, codeSnippet: '', language: 'cpp' }
  }

  let text = questionText.trim()
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim()
  }

  const codeStarters = [
    { pattern: /\bclass\s+[A-Za-z0-9_]+(\s*:\s*[A-Za-z0-9_,\s]+)?\s*\{/i, lang: 'cpp' },
    { pattern: /\bstruct\s+[A-Za-z0-9_]+\s*\{/i, lang: 'cpp' },
    { pattern: /#include\s*<[A-Za-z0-9_.]+>/i, lang: 'cpp' },
    { pattern: /\b(int|void|float|double)\s+main\s*\([^)]*\)\s*\{/i, lang: 'cpp' },
    { pattern: /\bint\*\s+[A-Za-z0-9_]+\s*=/i, lang: 'cpp' },
    { pattern: /\b(for|while)\s*\([^)]+\)\s*\{?/i, lang: 'cpp' },
    { pattern: /\bdef\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*:/i, lang: 'python' },
    { pattern: /\bAlgorithm\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*:/i, lang: 'pseudocode' }
  ]

  let earliestMatch = null
  let detectedLang = 'cpp'

  for (const starter of codeStarters) {
    const match = text.match(starter.pattern)
    if (match && match.index !== undefined) {
      if (earliestMatch === null || match.index < earliestMatch.index) {
        earliestMatch = match
        detectedLang = starter.lang
      }
    }
  }

  if (earliestMatch && earliestMatch.index !== undefined) {
    const splitIndex = earliestMatch.index
    const promptPart = text.slice(0, splitIndex).trim()
    let rawCodePart = text.slice(splitIndex).trim()
    let trailingPrompt = ''

    const trailingPatterns = [
      /\s*(Identify\s+the\s+error.*)$/i,
      /\s*(What\s+is\s+the\s+output.*)$/i,
      /\s*(Find\s+the\s+output.*)$/i,
      /\s*(Justify\s+your\s+answer.*)$/i,
      /\s*(Explain\s+the\s+result.*)$/i
    ]

    for (const tp of trailingPatterns) {
      const tMatch = rawCodePart.match(tp)
      if (tMatch && tMatch.index !== undefined && tMatch.index > 15) {
        trailingPrompt = tMatch[1].trim()
        rawCodePart = rawCodePart.slice(0, tMatch.index).trim()
        break
      }
    }

    const formattedCode = smartFormatCode(rawCodePart, detectedLang)
    let fullPrompt = promptPart
    if (trailingPrompt) {
      fullPrompt = fullPrompt ? `${fullPrompt} ${trailingPrompt}` : trailingPrompt
    }

    return {
      hasCode: true,
      promptText: fullPrompt || 'Answer the following question based on the code below:',
      codeSnippet: formattedCode,
      rawCode: rawCodePart,
      language: detectedLang
    }
  }

  return {
    hasCode: false,
    promptText: text,
    codeSnippet: '',
    language: 'cpp'
  }
}

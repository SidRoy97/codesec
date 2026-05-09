import { Issue } from '../types';

// Shape of a single rule: regex + what to say
interface Rule {
  id:          string;
  pattern:     RegExp;
  message:     string;
  severity:    Issue['severity'];
  category:    Issue['category'];
  suggestion?: string;
}

// Each rule is self-contained — add new ones at the bottom, nothing else changes (Open/Closed)
const RULES: Rule[] = [

  // eval() can run any string as code — open door for attackers
  { id: 'js:no-eval',
    pattern: /\beval\s*\(/g,
    severity: 'error', category: 'security',
    message: 'eval() runs arbitrary code and is a security risk.',
    suggestion: 'Use JSON.parse() for data, or restructure to avoid dynamic execution.' },

  // innerHTML renders HTML — if value includes user input, scripts can run
  { id: 'js:no-inner-html',
    pattern: /\.innerHTML\s*=/g,
    severity: 'warning', category: 'security',
    message: 'innerHTML can cause XSS if the value includes user input.',
    suggestion: 'Use textContent for plain text, or sanitize with DOMPurify.' },

  // Credentials committed to version control leak to anyone with repo access
  { id: 'js:no-hardcoded-secret',
    pattern: /(?:password|secret|api_?key|token|auth)\s*=\s*['"`][^'"`]{4,}['"`]/gi,
    severity: 'error', category: 'security',
    message: 'Possible hardcoded secret detected.',
    suggestion: 'Move to environment variables or a secrets manager.' },

  // console.log left in = noise in production and leaks internal info
  { id: 'js:no-console',
    pattern: /\bconsole\.(log|warn|error|debug)\s*\(/g,
    severity: 'hint', category: 'code-smell',
    message: 'console statement left in — remove before shipping.',
    suggestion: 'Use a logging library like winston or pino.' },

  // debugger stops execution in production — always a bug to ship this
  { id: 'js:no-debugger',
    pattern: /\bdebugger\b/g,
    severity: 'error', category: 'code-smell',
    message: 'debugger statement left in code.' },

  // == coerces types silently: "0" == false is true, === would catch it
  { id: 'js:eqeq',
    pattern: /[^!=<>]==[^=>]|[^!=<>]!=[^=>]/g,
    severity: 'warning', category: 'code-smell',
    message: 'Use === or !== to avoid silent type coercion bugs.' },

  // var is function-scoped, leaks out of blocks — const/let are safer
  { id: 'js:no-var',
    pattern: /\bvar\s+/g,
    severity: 'warning', category: 'code-smell',
    message: 'Use const or let instead of var.',
    suggestion: 'const if value never changes, let if it does.' },

  // Empty catch blocks hide errors — we never know something went wrong
  { id: 'js:empty-catch',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: 'warning', category: 'code-smell',
    message: 'Empty catch block silently swallows errors.',
    suggestion: 'Log the error or explain in a comment why ignoring is safe.' },

  // TODOs are fine temporarily — but track them in the issue tracker not the code
  { id: 'js:todo',
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi,
    severity: 'info', category: 'code-smell',
    message: 'TODO/FIXME comment — move this to your issue tracker.' },

  // Magic numbers have no context — future readers won't know what 86400 means
  { id: 'js:magic-number',
    pattern: /(?<![.\w])(?!0\b|1\b|-1\b)\d{3,}(?!\s*[)\]},;:])/g,
    severity: 'hint', category: 'code-smell',
    message: 'Magic number — name it so the intent is clear.',
    suggestion: 'const SECONDS_PER_DAY = 86400;' },
];

// Run every rule against every line and return all matches as Issues
export function runJavaScriptRules(lines: string[]): Issue[] {
  const issues: Issue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip pure comment lines to avoid false positives (except TODO lines)
    if (line.trim().startsWith('//') && !/TODO|FIXME|HACK|XXX/i.test(line)) continue;

    for (const rule of RULES) {
      // Reset regex state — global flag keeps position between calls without this
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(line)) !== null) {
        issues.push({
          id:         `${rule.id}:${i}:${match.index}`,
          message:    rule.message,
          severity:   rule.severity,
          category:   rule.category,
          line:       i,
          column:     match.index,
          endLine:    i,
          endColumn:  match.index + match[0].length,
          rule:       rule.id,
          suggestion: rule.suggestion,
          source:     'static',
        });
      }
    }
  }

  // Multi-line check: functions over 50 lines are hard to reason about
  issues.push(...detectLongFunctions(lines));
  return issues;
}

// Flag functions that are too long to fit in your head at once
function detectLongFunctions(lines: string[]): Issue[] {
  const issues: Issue[] = [];
  let fnStart = -1;
  let depth = 0;
  let startDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    // Detect a function opening
    if (fnStart === -1 && /\bfunction\b|\=\>\s*\{/.test(lines[i])) {
      fnStart = i;
      startDepth = depth;
    }

    // Count braces to track nesting
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }

    // When brace depth returns to where the function opened, we're done
    if (fnStart !== -1 && depth <= startDepth) {
      const len = i - fnStart;
      if (len > 50) {
        issues.push({
          id: `js:long-fn:${fnStart}`, message: `Function is ${len} lines — split it up.`,
          severity: 'warning', category: 'code-smell', line: fnStart, column: 0,
          rule: 'js:long-function', suggestion: 'Aim for under 30 lines per function.', source: 'static',
        });
      }
      fnStart = -1;
    }
  }
  return issues;
}
import { Issue } from '../types';

interface Rule {
  id: string; pattern: RegExp;
  message: string; severity: Issue['severity']; category: Issue['category']; suggestion?: string;
}

const RULES: Rule[] = [

  // Credentials committed to any repo — public or private — are a leak risk
  { id: 'java:hardcoded-secret', pattern: /(?:password|secret|apiKey|token)\s*=\s*"[^"]{4,}"/gi,
    severity: 'error', category: 'security',
    message: 'Possible hardcoded secret.', suggestion: 'Use environment variables or Vault.' },

  // String concatenation in SQL = injection vulnerability, same as every language
  { id: 'java:sql-injection', pattern: /Statement\s+\w+.*executeQuery\s*\([^)]*\+/g,
    severity: 'error', category: 'security',
    message: 'String-concat SQL query is vulnerable to injection.',
    suggestion: 'Use PreparedStatement with parameterized queries.' },

  // java.util.Random output is predictable — not suitable for security
  { id: 'java:insecure-random', pattern: /\bnew\s+Random\s*\(\s*\)/g,
    severity: 'warning', category: 'security',
    message: 'java.util.Random is not cryptographically secure.',
    suggestion: 'Use java.security.SecureRandom for anything security-related.' },

  // System.out belongs in main() and scripts, not production services
  { id: 'java:system-out', pattern: /System\.out\.(print|println|printf)\s*\(/g,
    severity: 'hint', category: 'code-smell',
    message: 'System.out found — use a logger in production.',
    suggestion: 'Use SLF4J: logger.info("message")' },

  // Silent catch blocks hide bugs and make debugging a nightmare
  { id: 'java:empty-catch', pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: 'warning', category: 'code-smell',
    message: 'Empty catch block silently swallows the exception.',
    suggestion: 'Log it or add a comment explaining why ignoring is safe.' },

  // Catching Throwable also catches OutOfMemoryError — almost always wrong
  { id: 'java:catch-throwable', pattern: /catch\s*\(\s*Throwable\s/g,
    severity: 'warning', category: 'code-smell',
    message: 'Catching Throwable also catches OutOfMemoryError.',
    suggestion: 'Catch Exception or specific exception types.' },

  // Public mutable fields break encapsulation and make change propagation hard
  { id: 'java:public-field', pattern: /^\s*public\s+(?!static\s+final|class|interface|enum|void)\w+\s+\w+\s*;/g,
    severity: 'warning', category: 'code-smell',
    message: 'Public mutable field breaks encapsulation.',
    suggestion: 'Make private and add getter/setter.' },

  // instanceof returns false for null so the null check is wasted code
  { id: 'java:null-before-instanceof', pattern: /\w+\s*!=\s*null\s*&&\s*\w+\s+instanceof/g,
    severity: 'hint', category: 'code-smell',
    message: 'Null check before instanceof is redundant.' },

  // Track these in your issue tracker
  { id: 'java:todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi, severity: 'info', category: 'code-smell',
    message: 'TODO/FIXME — move to your issue tracker.' },
];

export function runJavaRules(lines: string[]): Issue[] {
  const issues: Issue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') && !/TODO|FIXME|HACK|XXX/i.test(line)) continue;

    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        issues.push({
          id: `${rule.id}:${i}:${match.index}`, message: rule.message,
          severity: rule.severity, category: rule.category,
          line: i, column: match.index, endLine: i, endColumn: match.index + match[0].length,
          rule: rule.id, suggestion: rule.suggestion, source: 'static',
        });
      }
    }
  }
  return issues;
}
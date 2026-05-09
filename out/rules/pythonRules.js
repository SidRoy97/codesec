"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPythonRules = runPythonRules;
const RULES = [
    // exec() in Python is as dangerous as eval() in JS
    { id: 'py:no-exec', pattern: /\bexec\s*\(/g, severity: 'error', category: 'security',
        message: 'exec() executes arbitrary code — major security risk.' },
    // pickle can execute code when deserializing untrusted data
    { id: 'py:no-pickle', pattern: /\bpickle\.(load|loads)\s*\(/g, severity: 'error', category: 'security',
        message: 'pickle.load() can execute arbitrary code on untrusted input.',
        suggestion: 'Use json.load() instead.' },
    // shell=True passes through the OS shell — classic injection vector
    { id: 'py:subprocess-shell', pattern: /subprocess\.\w+\s*\([^)]*shell\s*=\s*True/g,
        severity: 'error', category: 'security',
        message: 'subprocess with shell=True is vulnerable to command injection.',
        suggestion: 'Pass a list of args and use shell=False.' },
    // Credentials in source get committed and leaked
    { id: 'py:hardcoded-secret', pattern: /(?:password|secret|api_?key|token)\s*=\s*['"][^'"]{4,}['"]/gi,
        severity: 'error', category: 'security',
        message: 'Possible hardcoded secret.', suggestion: 'Use os.environ or a secrets manager.' },
    // % formatting in SQL = injection vulnerability
    { id: 'py:sql-injection', pattern: /cursor\.(execute|executemany)\s*\([^)]*%[^)]*\)/g,
        severity: 'error', category: 'security',
        message: 'String-formatted SQL is vulnerable to injection.',
        suggestion: 'Use parameterized queries: cursor.execute(sql, (param,))' },
    // Bare except catches SystemExit and KeyboardInterrupt — almost always wrong
    { id: 'py:bare-except', pattern: /\bexcept\s*:/g, severity: 'warning', category: 'code-smell',
        message: 'Bare except: catches everything including SystemExit.',
        suggestion: 'Specify exception type: except ValueError:' },
    // Mutable defaults are shared across ALL calls to the function
    { id: 'py:mutable-default', pattern: /def\s+\w+\s*\([^)]*=\s*(\[\]|\{\}|list\(\)|dict\(\))/g,
        severity: 'error', category: 'code-smell',
        message: 'Mutable default argument shared across all calls.',
        suggestion: 'Use None as default, then: if arg is None: arg = []' },
    // print() is fine for scripts but noisy in production apps
    { id: 'py:print', pattern: /^\s*print\s*\(/g, severity: 'hint', category: 'code-smell',
        message: 'print() found — use the logging module in production.',
        suggestion: 'Replace with logging.info() or logging.debug()' },
    // Wildcard import makes it impossible to know where names come from
    { id: 'py:wildcard-import', pattern: /^\s*from\s+\w+\s+import\s+\*/g, severity: 'warning', category: 'code-smell',
        message: 'Wildcard import pollutes the namespace.',
        suggestion: 'Import only what you need: from module import SpecificThing' },
    // global variables make functions hard to test in isolation
    { id: 'py:global', pattern: /^\s*global\s+\w+/g, severity: 'warning', category: 'code-smell',
        message: 'global variable usage — hard to test.', suggestion: 'Pass as parameter or use a class.' },
    // Track these in your issue tracker, not buried in code
    { id: 'py:todo', pattern: /#\s*(TODO|FIXME|HACK|XXX)/gi, severity: 'info', category: 'code-smell',
        message: 'TODO/FIXME comment — move to your issue tracker.' },
];
function runPythonRules(lines) {
    const issues = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('#') && !/TODO|FIXME|HACK|XXX/i.test(line))
            continue;
        for (const rule of RULES) {
            rule.pattern.lastIndex = 0;
            let match;
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

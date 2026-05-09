"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReactRules = runReactRules;
// React rules — each one is an independent object, easy to add or remove
const RULES = [
    // --- Rules of Hooks: these break React's rendering model ---
    // Hooks in if-blocks run a different number of times depending on the condition
    { id: 'react:hook-in-condition', pattern: /if\s*\([^)]*\)\s*\{[^}]*use[A-Z]\w+\s*\(/g,
        severity: 'error', category: 'code-smell',
        message: 'Hook called inside a condition — violates Rules of Hooks.',
        suggestion: 'Move the hook to top level. Use conditional logic inside the hook.' },
    // Same problem in loops — hook call count must be the same every render
    { id: 'react:hook-in-loop', pattern: /(?:for|while)\s*\([^)]*\)\s*\{[^}]*use[A-Z]\w+\s*\(/g,
        severity: 'error', category: 'code-smell',
        message: 'Hook called inside a loop — violates Rules of Hooks.' },
    // async callback returns a Promise, useEffect needs a function or void
    { id: 'react:async-effect', pattern: /useEffect\s*\(\s*async\s*\(/g,
        severity: 'error', category: 'code-smell',
        message: 'async useEffect callback returns a Promise instead of a cleanup function.',
        suggestion: 'Define async function inside and call it:\nuseEffect(() => { const run = async () => {}; run(); }, []);' },
    // --- useEffect pitfalls ---
    // No dep array = runs after every single render, usually unintentional
    { id: 'react:effect-no-deps', pattern: /useEffect\s*\(\s*\(\s*\)\s*=>/g,
        severity: 'warning', category: 'code-smell',
        message: 'useEffect with no dependency array runs after every render.',
        suggestion: 'Add [] to run once, or [dep] to run when dep changes.' },
    // Timers/listeners without a cleanup function are a memory leak
    { id: 'react:missing-cleanup', pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*(?:setInterval|setTimeout|addEventListener)\s*\(/g,
        severity: 'warning', category: 'code-smell',
        message: 'useEffect sets up timer/listener but may be missing cleanup.',
        suggestion: 'Return cleanup: return () => clearInterval(id)' },
    // --- State mutations: React can't see in-place changes ---
    // Directly assigning to state bypasses React's update queue entirely
    { id: 'react:direct-state-mutation', pattern: /this\.state\.\w+\s*=/g,
        severity: 'error', category: 'code-smell',
        message: 'Direct state mutation — React won\'t re-render.',
        suggestion: 'Use setState() or the useState setter.' },
    // push/splice mutate the array in-place — React sees the same reference
    { id: 'react:array-mutation', pattern: /(?:state|this\.state)\.\w+\.(?:push|pop|splice|sort|reverse)\s*\(/g,
        severity: 'error', category: 'code-smell',
        message: 'Mutating state array in-place won\'t trigger a re-render.',
        suggestion: 'Return a new array: setState(prev => [...prev, item])' },
    // --- Key prop issues ---
    // Index as key breaks list reconciliation when items reorder
    { id: 'react:key-as-index', pattern: /\.map\s*\(\s*\([^,)]+,\s*(\w+)\)\s*=>[^)]*key\s*=\s*\{?\s*\1\s*\}?/g,
        severity: 'warning', category: 'code-smell',
        message: 'Using array index as key causes bugs when list reorders.',
        suggestion: 'Use a stable unique id: key={item.id}' },
    // --- Re-render traps ---
    // New function reference on every render = child re-renders every time
    { id: 'react:inline-fn', pattern: /\bon[A-Z]\w+\s*=\s*\{(?:\s*\([^)]*\)\s*=>|\s*function\s*\()/g,
        severity: 'hint', category: 'code-smell',
        message: 'Inline function prop creates new reference every render.',
        suggestion: 'Wrap with useCallback() or define outside JSX.' },
    // style={{}} creates a new object every render, child sees "new" styles always
    { id: 'react:inline-style', pattern: /\bstyle\s*=\s*\{\s*\{/g,
        severity: 'hint', category: 'code-smell',
        message: 'Inline style object recreated every render.',
        suggestion: 'Define as const outside component or use useMemo().' },
    // --- Security ---
    // XSS risk if HTML is user-supplied and not sanitized first
    { id: 'react:dangerous-html', pattern: /dangerouslySetInnerHTML\s*=\s*\{/g,
        severity: 'error', category: 'security',
        message: 'dangerouslySetInnerHTML can cause XSS if content is not sanitized.',
        suggestion: 'Sanitize with DOMPurify: { __html: DOMPurify.sanitize(html) }' },
    // --- Deprecated APIs ---
    // String refs were removed in React 19 — useRef() is the replacement
    { id: 'react:string-ref', pattern: /\bref\s*=\s*["'`]\w+["'`]/g,
        severity: 'error', category: 'code-smell',
        message: 'String refs removed in React 19. Use useRef() instead.' },
    // These lifecycle names were deprecated in 16.3 and fire a console warning
    { id: 'react:will-mount', pattern: /componentWillMount\s*\(\s*\)/g,
        severity: 'error', category: 'code-smell',
        message: 'componentWillMount is deprecated. Use componentDidMount.' },
    { id: 'react:will-receive-props', pattern: /componentWillReceiveProps\s*\(/g,
        severity: 'error', category: 'code-smell',
        message: 'componentWillReceiveProps is deprecated. Use getDerivedStateFromProps.' },
    // Context value as inline object = all consumers re-render on every parent render
    { id: 'react:context-inline', pattern: /\bvalue\s*=\s*\{\s*\{[^}]*\}\s*\}/g,
        severity: 'warning', category: 'code-smell',
        message: 'Inline context value recreated every render — all consumers re-render.',
        suggestion: 'Memoize: const val = useMemo(() => ({ ... }), [deps])' },
];
function runReactRules(lines) {
    const issues = [];
    for (let i = 0; i < lines.length; i++) {
        // Skip pure comment lines to avoid false positives
        if (lines[i].trim().startsWith('//'))
            continue;
        for (const rule of RULES) {
            // Reset regex state — global flag keeps position between calls without this
            rule.pattern.lastIndex = 0;
            let match;
            while ((match = rule.pattern.exec(lines[i])) !== null) {
                issues.push({
                    id: `${rule.id}:${i}:${match.index}`, message: rule.message,
                    severity: rule.severity, category: rule.category,
                    line: i, column: match.index, endLine: i,
                    endColumn: match.index + match[0].length,
                    rule: rule.id, suggestion: rule.suggestion, source: 'static',
                });
            }
        }
    }
    // Multi-line checks that need the full file context
    issues.push(...detectStateSprawl(lines));
    issues.push(...detectMissingDepArrays(lines));
    return issues;
}
// 6+ useState in one component — useReducer would be cleaner and more testable
function detectStateSprawl(lines) {
    const issues = [];
    const text = lines.join('\n');
    // Use exec loop instead of matchAll — works at all TypeScript targets
    const pattern = /(?:function|const)\s+([A-Z]\w*)\s*[=(]/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        // Convert character offset to line number
        const compStartLine = text.slice(0, match.index).split('\n').length - 1;
        // Look at the next 200 lines of the component body
        const body = lines.slice(compStartLine, compStartLine + 200).join('\n');
        const count = (body.match(/\buseState\s*\(/g) ?? []).length;
        if (count >= 6) {
            issues.push({
                id: `react:state-sprawl:${compStartLine}`, line: compStartLine, column: 0,
                message: `"${match[1]}" has ${count} useState calls — consider useReducer.`,
                severity: 'warning', category: 'code-smell', rule: 'react:state-sprawl',
                suggestion: 'useReducer is easier to test and reason about with 5+ related state vars.',
                source: 'static',
            });
        }
    }
    return issues;
}
// useCallback or useMemo without a dep array means memoization never fires
function detectMissingDepArrays(lines) {
    const issues = [];
    for (let i = 0; i < lines.length; i++) {
        // Only check lines that actually contain these hooks
        if (!/useCallback\s*\(|useMemo\s*\(/.test(lines[i]))
            continue;
        const hook = lines[i].includes('useCallback') ? 'useCallback' : 'useMemo';
        // Look ahead up to 10 lines to find the closing dep array
        const chunk = lines.slice(i, i + 10).join('\n');
        if (!new RegExp(`${hook}\\s*\\([^)]*,\\s*\\[`).test(chunk)) {
            issues.push({
                id: `react:no-deps:${i}`, line: i, column: lines[i].indexOf(hook),
                message: `${hook} without a dependency array — memoization never kicks in.`,
                severity: 'warning', category: 'code-smell', rule: 'react:no-deps',
                suggestion: `Add deps: ${hook}(fn, [dep1, dep2])`,
                source: 'static',
            });
        }
    }
    return issues;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexityScanner = void 0;
// Keywords that add +1 to cyclomatic complexity per language
const BRANCHES = {
    javascript: [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+.+:/g, /\bcatch\s*\(/g, /&&|\|\|/g, /\?\s*[^:]/g],
    python: [/\bif\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bexcept\b/g, /\band\b|\bor\b/g],
    java: [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+.+:/g, /\bcatch\s*\(/g, /&&|\|\|/g],
};
// Single job: count decision points per function and flag ones above the threshold
class ComplexityScanner {
    constructor(config) {
        this.config = config;
        this.name = 'ComplexityScanner';
    }
    scan(document) {
        const threshold = this.config.getComplexityThreshold();
        const patterns = BRANCHES[this.normalizeLang(document.languageId)] ?? BRANCHES['javascript'];
        const lines = Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);
        const issues = [];
        for (let i = 0; i < lines.length; i++) {
            // Only score lines that look like function declarations
            if (!/function|def |=>/.test(lines[i]))
                continue;
            let score = 1; // every function starts at complexity 1
            for (const p of patterns) {
                p.lastIndex = 0;
                score += (lines[i].match(p) ?? []).length;
            }
            if (score > threshold) {
                issues.push({
                    id: `complexity:${i}`, line: i, column: 0,
                    message: `High cyclomatic complexity (${score}) — threshold is ${threshold}.`,
                    severity: score > threshold * 2 ? 'error' : 'warning',
                    category: 'complexity', rule: 'complexity:cyclomatic',
                    suggestion: 'Break this into smaller focused functions.',
                    source: 'static',
                });
            }
        }
        return issues;
    }
    // Average complexity across all lines — used by the dashboard
    getAverageComplexity(document) {
        const patterns = BRANCHES[this.normalizeLang(document.languageId)] ?? BRANCHES['javascript'];
        const lines = Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);
        let total = 0;
        for (const line of lines) {
            for (const p of patterns) {
                p.lastIndex = 0;
                total += (line.match(p) ?? []).length;
            }
        }
        return lines.length > 0 ? Math.round((total / lines.length) * 10) : 0;
    }
    normalizeLang(id) {
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(id))
            return 'javascript';
        if (id === 'python')
            return 'python';
        if (id === 'java')
            return 'java';
        return 'javascript';
    }
}
exports.ComplexityScanner = ComplexityScanner;

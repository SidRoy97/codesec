"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexityScanner = void 0;
// Keywords that add +1 to cyclomatic complexity per language
var BRANCHES = {
    javascript: [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+.+:/g, /\bcatch\s*\(/g, /&&|\|\|/g, /\?\s*[^:]/g],
    python: [/\bif\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bexcept\b/g, /\band\b|\bor\b/g],
    java: [/\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g, /\bwhile\s*\(/g, /\bcase\s+.+:/g, /\bcatch\s*\(/g, /&&|\|\|/g],
};
// Single job: count decision points per function and flag ones above the threshold
var ComplexityScanner = /** @class */ (function () {
    function ComplexityScanner(config) {
        this.config = config;
        this.name = 'ComplexityScanner';
    }
    ComplexityScanner.prototype.scan = function (document) {
        var _a, _b;
        var threshold = this.config.getComplexityThreshold();
        var patterns = (_a = BRANCHES[this.normalizeLang(document.languageId)]) !== null && _a !== void 0 ? _a : BRANCHES['javascript'];
        var lines = Array.from({ length: document.lineCount }, function (_, i) { return document.lineAt(i).text; });
        var issues = [];
        for (var i = 0; i < lines.length; i++) {
            // Only score lines that look like function declarations
            if (!/function|def |=>/.test(lines[i]))
                continue;
            var score = 1; // every function starts at complexity 1
            for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
                var p = patterns_1[_i];
                p.lastIndex = 0;
                score += ((_b = lines[i].match(p)) !== null && _b !== void 0 ? _b : []).length;
            }
            if (score > threshold) {
                issues.push({
                    id: "complexity:".concat(i), line: i, column: 0,
                    message: "High cyclomatic complexity (".concat(score, ") \u2014 threshold is ").concat(threshold, "."),
                    severity: score > threshold * 2 ? 'error' : 'warning',
                    category: 'complexity', rule: 'complexity:cyclomatic',
                    suggestion: 'Break this into smaller focused functions.',
                    source: 'static',
                });
            }
        }
        return issues;
    };
    // Average complexity across all lines — used by the dashboard
    ComplexityScanner.prototype.getAverageComplexity = function (document) {
        var _a, _b;
        var patterns = (_a = BRANCHES[this.normalizeLang(document.languageId)]) !== null && _a !== void 0 ? _a : BRANCHES['javascript'];
        var lines = Array.from({ length: document.lineCount }, function (_, i) { return document.lineAt(i).text; });
        var total = 0;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            for (var _c = 0, patterns_2 = patterns; _c < patterns_2.length; _c++) {
                var p = patterns_2[_c];
                p.lastIndex = 0;
                total += ((_b = line.match(p)) !== null && _b !== void 0 ? _b : []).length;
            }
        }
        return lines.length > 0 ? Math.round((total / lines.length) * 10) : 0;
    };
    ComplexityScanner.prototype.normalizeLang = function (id) {
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(id))
            return 'javascript';
        if (id === 'python')
            return 'python';
        if (id === 'java')
            return 'java';
        return 'javascript';
    };
    return ComplexityScanner;
}());
exports.ComplexityScanner = ComplexityScanner;

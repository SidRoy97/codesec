"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateScanner = void 0;
// Single job: detect copy-pasted code blocks using a sliding window hash
var DuplicateScanner = /** @class */ (function () {
    function DuplicateScanner(config) {
        this.config = config;
        this.name = 'DuplicateScanner';
    }
    DuplicateScanner.prototype.scan = function (document) {
        return this.scanWithBlocks(document).issues;
    };
    // Also return the raw blocks so the orchestrator can store them for the dashboard
    DuplicateScanner.prototype.scanWithBlocks = function (document) {
        var _this = this;
        var minLines = this.config.getDuplicateThreshold();
        var lines = this.normalize(document);
        var blocks = this.findDuplicates(lines, minLines);
        var issues = blocks.map(function (b) { return _this.toIssue(b, minLines); });
        return { issues: issues, blocks: blocks };
    };
    // Trim and collapse whitespace so formatting differences don't hide duplicates
    DuplicateScanner.prototype.normalize = function (document) {
        return Array.from({ length: document.lineCount }, function (_, i) {
            return document.lineAt(i).text.trim().replace(/\s+/g, ' ');
        });
    };
    // Slide a window of minLines and hash it — matching hashes = duplicates
    DuplicateScanner.prototype.findDuplicates = function (lines, min) {
        var seen = new Map();
        var reported = new Set();
        var result = [];
        for (var i = 0; i <= lines.length - min; i++) {
            var window_1 = lines.slice(i, i + min);
            // Skip windows that are mostly blank or comments — not interesting duplicates
            var meaningful = window_1.filter(function (l) { return l && !l.startsWith('//') && !l.startsWith('#'); });
            if (meaningful.length < Math.ceil(min * 0.7))
                continue;
            var hash = this.hash(window_1);
            var first = seen.get(hash);
            if (first && !reported.has(first.start)) {
                reported.add(first.start);
                result.push({ startLine: first.start, endLine: first.end, duplicateIn: { startLine: i, endLine: i + min - 1 } });
            }
            else if (!first) {
                seen.set(hash, { start: i, end: i + min - 1 });
            }
        }
        return result;
    };
    // djb2-style hash to fingerprint a window of lines
    DuplicateScanner.prototype.hash = function (lines) {
        var h = 5381;
        for (var _i = 0, _a = lines.join('\n'); _i < _a.length; _i++) {
            var ch = _a[_i];
            h = ((h << 5) + h) + ch.charCodeAt(0);
            h = h & h;
        }
        return h.toString(36);
    };
    DuplicateScanner.prototype.toIssue = function (block, min) {
        var _a, _b;
        return {
            id: "dup:".concat(block.startLine), line: block.startLine, column: 0, endLine: block.endLine,
            message: "Duplicate block (".concat(min, "+ lines) also at line ").concat(((_b = (_a = block.duplicateIn) === null || _a === void 0 ? void 0 : _a.startLine) !== null && _b !== void 0 ? _b : 0) + 1, "."),
            severity: 'warning', category: 'duplicate', rule: 'duplicate:block',
            suggestion: 'Extract shared logic into a reusable function.',
            source: 'static',
        };
    };
    return DuplicateScanner;
}());
exports.DuplicateScanner = DuplicateScanner;

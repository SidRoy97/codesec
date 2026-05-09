"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateScanner = void 0;
// Single job: detect copy-pasted code blocks using a sliding window hash
class DuplicateScanner {
    constructor(config) {
        this.config = config;
        this.name = 'DuplicateScanner';
    }
    scan(document) {
        return this.scanWithBlocks(document).issues;
    }
    // Also return the raw blocks so the orchestrator can store them for the dashboard
    scanWithBlocks(document) {
        const minLines = this.config.getDuplicateThreshold();
        const lines = this.normalize(document);
        const blocks = this.findDuplicates(lines, minLines);
        const issues = blocks.map(b => this.toIssue(b, minLines));
        return { issues, blocks };
    }
    // Trim and collapse whitespace so formatting differences don't hide duplicates
    normalize(document) {
        return Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text.trim().replace(/\s+/g, ' '));
    }
    // Slide a window of minLines and hash it — matching hashes = duplicates
    findDuplicates(lines, min) {
        const seen = new Map();
        const reported = new Set();
        const result = [];
        for (let i = 0; i <= lines.length - min; i++) {
            const window = lines.slice(i, i + min);
            // Skip windows that are mostly blank or comments — not interesting duplicates
            const meaningful = window.filter(l => l && !l.startsWith('//') && !l.startsWith('#'));
            if (meaningful.length < Math.ceil(min * 0.7))
                continue;
            const hash = this.hash(window);
            const first = seen.get(hash);
            if (first && !reported.has(first.start)) {
                reported.add(first.start);
                result.push({ startLine: first.start, endLine: first.end, duplicateIn: { startLine: i, endLine: i + min - 1 } });
            }
            else if (!first) {
                seen.set(hash, { start: i, end: i + min - 1 });
            }
        }
        return result;
    }
    // djb2-style hash to fingerprint a window of lines
    hash(lines) {
        let h = 5381;
        for (const ch of lines.join('\n')) {
            h = ((h << 5) + h) + ch.charCodeAt(0);
            h = h & h;
        }
        return h.toString(36);
    }
    toIssue(block, min) {
        return {
            id: `dup:${block.startLine}`, line: block.startLine, column: 0, endLine: block.endLine,
            message: `Duplicate block (${min}+ lines) also at line ${(block.duplicateIn?.startLine ?? 0) + 1}.`,
            severity: 'warning', category: 'duplicate', rule: 'duplicate:block',
            suggestion: 'Extract shared logic into a reusable function.',
            source: 'static',
        };
    }
}
exports.DuplicateScanner = DuplicateScanner;

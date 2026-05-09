"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisOrchestrator = void 0;
// Single job: coordinate the four scanners and persist the result
// Never touches the UI — publishers do that via the onComplete callback
class AnalysisOrchestrator {
    constructor(store, config, static_, complexity, duplicate, ai, 
    // Called after analysis finishes — publishers subscribe to this
    onComplete) {
        this.store = store;
        this.config = config;
        this.static_ = static_;
        this.complexity = complexity;
        this.duplicate = duplicate;
        this.ai = ai;
        this.onComplete = onComplete;
        // Pending debounce timers per file URI
        this.timers = new Map();
    }
    // Analyze a document, optionally debounced for live-typing use
    async analyze(document, debounceMs = 0) {
        // Ignore unsupported languages and virtual documents (git diffs, output panels)
        if (!this.config.getLanguages().includes(document.languageId))
            return null;
        if (document.uri.scheme !== 'file')
            return null;
        if (debounceMs > 0)
            return this.debounced(document, debounceMs);
        return this.run(document);
    }
    // Run all scanners, merge, deduplicate, save
    async run(document) {
        const all = [];
        // Static rules — fast, always run first
        if (this.config.isStaticEnabled())
            all.push(...this.static_.scan(document));
        // Complexity and duplicate checks — no API cost so always run
        all.push(...this.complexity.scan(document));
        const { issues: dupIssues, blocks } = this.duplicate.scanWithBlocks(document);
        all.push(...dupIssues);
        // AI last — slowest, network call, may be disabled
        all.push(...await this.ai.scan(document));
        const result = {
            uri: document.uri,
            language: document.languageId,
            issues: this.deduplicate(all),
            complexity: this.complexity.getAverageComplexity(document),
            duplicateBlocks: blocks,
            analyzedAt: new Date(),
        };
        // Save to store then notify publishers — they decide how to display it
        this.store.save(result);
        this.onComplete(result);
        return result;
    }
    // Reset the timer every time the user types — only fires after they pause
    debounced(document, ms) {
        const key = document.uri.toString();
        const old = this.timers.get(key);
        if (old)
            clearTimeout(old);
        return new Promise(resolve => {
            const timer = setTimeout(async () => {
                this.timers.delete(key);
                resolve(await this.run(document));
            }, ms);
            this.timers.set(key, timer);
        });
    }
    // Remove issues where the same rule fires on the same line (overlapping patterns)
    deduplicate(issues) {
        const seen = new Set();
        return issues.filter(i => {
            const key = `${i.line}:${i.rule}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    // Use Array.from instead of for...of on Map iterator — works at all TS targets
    dispose() {
        Array.from(this.timers.values()).forEach(t => clearTimeout(t));
    }
}
exports.AnalysisOrchestrator = AnalysisOrchestrator;

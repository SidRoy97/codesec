"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisOrchestrator = void 0;
// Single job: coordinate the four scanners and persist the result
// Never touches the UI — publishers do that via the onComplete callback
var AnalysisOrchestrator = /** @class */ (function () {
    function AnalysisOrchestrator(store, config, static_, complexity, duplicate, ai, 
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
    AnalysisOrchestrator.prototype.analyze = function (document_1) {
        return __awaiter(this, arguments, void 0, function (document, debounceMs) {
            if (debounceMs === void 0) { debounceMs = 0; }
            return __generator(this, function (_a) {
                // Ignore unsupported languages and virtual documents (git diffs, output panels)
                if (!this.config.getLanguages().includes(document.languageId))
                    return [2 /*return*/, null];
                if (document.uri.scheme !== 'file')
                    return [2 /*return*/, null];
                if (debounceMs > 0)
                    return [2 /*return*/, this.debounced(document, debounceMs)];
                return [2 /*return*/, this.run(document)];
            });
        });
    };
    // Run all scanners, merge, deduplicate, save
    AnalysisOrchestrator.prototype.run = function (document) {
        return __awaiter(this, void 0, void 0, function () {
            var all, _a, dupIssues, blocks, _b, _c, _d, result;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        all = [];
                        // Static rules — fast, always run first
                        if (this.config.isStaticEnabled())
                            all.push.apply(all, this.static_.scan(document));
                        // Complexity and duplicate checks — no API cost so always run
                        all.push.apply(all, this.complexity.scan(document));
                        _a = this.duplicate.scanWithBlocks(document), dupIssues = _a.issues, blocks = _a.blocks;
                        all.push.apply(all, dupIssues);
                        _c = 
                        // AI last — slowest, network call, may be disabled
                        (_b = all.push).apply;
                        _d = [
                            // AI last — slowest, network call, may be disabled
                            all];
                        return [4 /*yield*/, this.ai.scan(document)];
                    case 1:
                        // AI last — slowest, network call, may be disabled
                        _c.apply(_b, _d.concat([_e.sent()]));
                        result = {
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
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // Reset the timer every time the user types — only fires after they pause
    AnalysisOrchestrator.prototype.debounced = function (document, ms) {
        var _this = this;
        var key = document.uri.toString();
        var old = this.timers.get(key);
        if (old)
            clearTimeout(old);
        return new Promise(function (resolve) {
            var timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.timers.delete(key);
                            _a = resolve;
                            return [4 /*yield*/, this.run(document)];
                        case 1:
                            _a.apply(void 0, [_b.sent()]);
                            return [2 /*return*/];
                    }
                });
            }); }, ms);
            _this.timers.set(key, timer);
        });
    };
    // Remove issues where the same rule fires on the same line (overlapping patterns)
    AnalysisOrchestrator.prototype.deduplicate = function (issues) {
        var seen = new Set();
        return issues.filter(function (i) {
            var key = "".concat(i.line, ":").concat(i.rule);
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    };
    AnalysisOrchestrator.prototype.dispose = function () {
        for (var _i = 0, _a = this.timers.values(); _i < _a.length; _i++) {
            var t = _a[_i];
            clearTimeout(t);
        }
    };
    return AnalysisOrchestrator;
}());
exports.AnalysisOrchestrator = AnalysisOrchestrator;

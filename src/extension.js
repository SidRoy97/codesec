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
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var ConfigManager_1 = require("./config/ConfigManager");
var ResultStore_1 = require("./ResultStore");
var StaticScanner_1 = require("./scanners/StaticScanner");
var ComplexityScanner_1 = require("./scanners/ComplexityScanner");
var DuplicateScanner_1 = require("./scanners/DuplicateScanner");
var AiScanner_1 = require("./scanners/AiScanner");
var AnalysisOrchestrator_1 = require("./AnalysisOrchestrator");
var DiagnosticsPublisher_1 = require("./publishers/DiagnosticsPublisher");
var StatusBarManager_1 = require("./publishers/StatusBarManager");
function activate(context) {
    var _this = this;
    // --- Build all pieces (Dependency Inversion: inject deps, never hard-code) ---
    var config = new ConfigManager_1.ConfigManager();
    var store = new ResultStore_1.ResultStore();
    var static_ = new StaticScanner_1.StaticScanner();
    var complexity = new ComplexityScanner_1.ComplexityScanner(config);
    var duplicate = new DuplicateScanner_1.DuplicateScanner(config);
    var ai = new AiScanner_1.AiScanner(config);
    var diagPub = new DiagnosticsPublisher_1.DiagnosticsPublisher();
    var statusBar = new StatusBarManager_1.StatusBarManager(store);
    // After every analysis: update squiggles and status bar
    var onComplete = function (result) {
        diagPub.present(result); // show squiggles
        statusBar.render(); // update count in status bar
    };
    var orchestrator = new AnalysisOrchestrator_1.AnalysisOrchestrator(store, config, static_, complexity, duplicate, ai, onComplete);
    // --- Commands ---
    // Analyze the currently open file on demand
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.analyzeFile', function () { return __awaiter(_this, void 0, void 0, function () {
        var editor;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showWarningMessage('CodeSec: No active file.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'CodeSec: Analyzing…', cancellable: false }, function () { return __awaiter(_this, void 0, void 0, function () {
                            var result, n, file;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, orchestrator.analyze(editor.document)];
                                    case 1:
                                        result = _a.sent();
                                        if (!result)
                                            return [2 /*return*/];
                                        n = result.issues.length;
                                        file = vscode.workspace.asRelativePath(editor.document.uri);
                                        vscode.window.showInformationMessage(n === 0 ? "CodeSec: \u2705 No issues in ".concat(file) : "CodeSec: ".concat(n, " issue(s) in ").concat(file));
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    // Scan every supported file in the workspace
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.analyzeWorkspace', function () { return __awaiter(_this, void 0, void 0, function () {
        var exts, uris;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    exts = config.getLanguages().flatMap(langToExts).join(',');
                    return [4 /*yield*/, vscode.workspace.findFiles("**/*.{".concat(exts, "}"), '{**/node_modules/**,**/dist/**}')];
                case 1:
                    uris = _a.sent();
                    if (!uris.length) {
                        vscode.window.showWarningMessage('CodeSec: No supported files found.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CodeSec: Scanning ".concat(uris.length, " files\u2026"), cancellable: true }, function (progress, token) { return __awaiter(_this, void 0, void 0, function () {
                            var i, _a, _b, _c, total;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        i = 0;
                                        _d.label = 1;
                                    case 1:
                                        if (!(i < uris.length)) return [3 /*break*/, 8];
                                        if (token.isCancellationRequested)
                                            return [3 /*break*/, 8];
                                        _d.label = 2;
                                    case 2:
                                        _d.trys.push([2, 5, , 6]);
                                        _b = (_a = orchestrator).analyze;
                                        return [4 /*yield*/, vscode.workspace.openTextDocument(uris[i])];
                                    case 3: return [4 /*yield*/, _b.apply(_a, [_d.sent()])];
                                    case 4:
                                        _d.sent();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        _c = _d.sent();
                                        return [3 /*break*/, 6];
                                    case 6:
                                        progress.report({ message: "".concat(i + 1, "/").concat(uris.length), increment: (1 / uris.length) * 100 });
                                        _d.label = 7;
                                    case 7:
                                        i++;
                                        return [3 /*break*/, 1];
                                    case 8:
                                        total = store.getAll().reduce(function (n, r) { return n + r.issues.length; }, 0);
                                        vscode.window.showInformationMessage("CodeSec: Done \u2014 ".concat(total, " issue(s) in ").concat(store.getAll().length, " files"));
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    // Wipe all results and squiggles
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.clearIssues', function () {
        store.clear();
        diagPub.clearAll();
        statusBar.render();
        vscode.window.showInformationMessage('CodeSec: All issues cleared.');
    }));
    // Open the Activity Bar dashboard
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.openDashboard', function () {
        vscode.commands.executeCommand('workbench.view.extension.codeSec');
    }));
    // --- Event listeners ---
    // Auto-analyze when the user saves, if enabled in settings
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(function (doc) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.shouldAnalyzeOnSave()) return [3 /*break*/, 2];
                    return [4 /*yield*/, orchestrator.analyze(doc)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); }));
    // Analyze while typing — 1.5s debounce so we don't fire on every keystroke
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function (e) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!e.contentChanges.length) return [3 /*break*/, 2];
                    return [4 /*yield*/, orchestrator.analyze(e.document, 1500)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); }));
    // Clean up results when a file is closed so stale data doesn't accumulate
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(function (doc) {
        store.remove(doc.uri);
        diagPub.clear(doc.uri);
        statusBar.render();
    }));
    // Analyze whatever is already open when the extension first loads
    for (var _i = 0, _a = vscode.window.visibleTextEditors; _i < _a.length; _i++) {
        var editor = _a[_i];
        orchestrator.analyze(editor.document);
    }
    context.subscriptions.push(diagPub, statusBar, orchestrator);
    // Friendly first-run nudge for Ollama users
    if (config.getAiProvider() === 'ollama') {
        vscode.window.showInformationMessage('CodeSec: AI runs locally via Ollama (free). Make sure it\'s running.', 'Get Ollama', 'Change Provider').then(function (c) {
            if (c === 'Get Ollama')
                vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
            if (c === 'Change Provider')
                vscode.commands.executeCommand('workbench.action.openSettings', 'codeSec.aiProvider');
        });
    }
}
function deactivate() { }
// Map language IDs to file extensions for the workspace scan glob
function langToExts(lang) {
    var _a;
    var map = {
        javascript: ['js', 'jsx', 'mjs'], typescript: ['ts', 'tsx'],
        python: ['py'], java: ['java'],
    };
    return (_a = map[lang]) !== null && _a !== void 0 ? _a : [lang];
}

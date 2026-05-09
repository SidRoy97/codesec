"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ConfigManager_1 = require("./config/ConfigManager");
const ResultStore_1 = require("./ResultStore");
const StaticScanner_1 = require("./scanners/StaticScanner");
const ComplexityScanner_1 = require("./scanners/ComplexityScanner");
const DuplicateScanner_1 = require("./scanners/DuplicateScanner");
const AiScanner_1 = require("./scanners/AiScanner");
const AnalysisOrchestrator_1 = require("./AnalysisOrchestrator");
const DiagnosticsPublisher_1 = require("./publishers/DiagnosticsPublisher");
const StatusBarManager_1 = require("./publishers/StatusBarManager");
function activate(context) {
    // --- Build all pieces (Dependency Inversion: inject deps, never hard-code) ---
    const config = new ConfigManager_1.ConfigManager();
    const store = new ResultStore_1.ResultStore();
    const static_ = new StaticScanner_1.StaticScanner();
    const complexity = new ComplexityScanner_1.ComplexityScanner(config);
    const duplicate = new DuplicateScanner_1.DuplicateScanner(config);
    const ai = new AiScanner_1.AiScanner(config);
    const diagPub = new DiagnosticsPublisher_1.DiagnosticsPublisher();
    const statusBar = new StatusBarManager_1.StatusBarManager(store);
    // After every analysis: update squiggles and status bar
    const onComplete = (result) => {
        diagPub.present(result); // show squiggles
        statusBar.render(); // update count in status bar
    };
    const orchestrator = new AnalysisOrchestrator_1.AnalysisOrchestrator(store, config, static_, complexity, duplicate, ai, onComplete);
    // --- Commands ---
    // Analyze the currently open file on demand
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.analyzeFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('CodeSec: No active file.');
            return;
        }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'CodeSec: Analyzing…', cancellable: false }, async () => {
            const result = await orchestrator.analyze(editor.document);
            if (!result)
                return;
            const n = result.issues.length;
            const file = vscode.workspace.asRelativePath(editor.document.uri);
            vscode.window.showInformationMessage(n === 0 ? `CodeSec: ✅ No issues in ${file}` : `CodeSec: ${n} issue(s) in ${file}`);
        });
    }));
    // Scan every supported file in the workspace
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.analyzeWorkspace', async () => {
        const exts = config.getLanguages().flatMap(langToExts).join(',');
        const uris = await vscode.workspace.findFiles(`**/*.{${exts}}`, '{**/node_modules/**,**/dist/**}');
        if (!uris.length) {
            vscode.window.showWarningMessage('CodeSec: No supported files found.');
            return;
        }
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `CodeSec: Scanning ${uris.length} files…`, cancellable: true }, async (progress, token) => {
            for (let i = 0; i < uris.length; i++) {
                if (token.isCancellationRequested)
                    break;
                try {
                    await orchestrator.analyze(await vscode.workspace.openTextDocument(uris[i]));
                }
                catch { }
                progress.report({ message: `${i + 1}/${uris.length}`, increment: (1 / uris.length) * 100 });
            }
            const total = store.getAll().reduce((n, r) => n + r.issues.length, 0);
            vscode.window.showInformationMessage(`CodeSec: Done — ${total} issue(s) in ${store.getAll().length} files`);
        });
    }));
    // Wipe all results and squiggles
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.clearIssues', () => {
        store.clear();
        diagPub.clearAll();
        statusBar.render();
        vscode.window.showInformationMessage('CodeSec: All issues cleared.');
    }));
    // Open the Activity Bar dashboard
    context.subscriptions.push(vscode.commands.registerCommand('codeSec.openDashboard', () => {
        vscode.commands.executeCommand('workbench.view.extension.codeSec');
    }));
    // --- Event listeners ---
    // Auto-analyze when the user saves, if enabled in settings
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (config.shouldAnalyzeOnSave())
            await orchestrator.analyze(doc);
    }));
    // Analyze while typing — 1.5s debounce so we don't fire on every keystroke
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (e) => {
        if (e.contentChanges.length)
            await orchestrator.analyze(e.document, 1500);
    }));
    // Clean up results when a file is closed so stale data doesn't accumulate
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => {
        store.remove(doc.uri);
        diagPub.clear(doc.uri);
        statusBar.render();
    }));
    // Analyze whatever is already open when the extension first loads
    for (const editor of vscode.window.visibleTextEditors) {
        orchestrator.analyze(editor.document);
    }
    context.subscriptions.push(diagPub, statusBar, orchestrator);
    // Friendly first-run nudge for Ollama users
    if (config.getAiProvider() === 'ollama') {
        vscode.window.showInformationMessage('CodeSec: AI runs locally via Ollama (free). Make sure it\'s running.', 'Get Ollama', 'Change Provider').then(c => {
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
    const map = {
        javascript: ['js', 'jsx', 'mjs'], typescript: ['ts', 'tsx'],
        python: ['py'], java: ['java'],
    };
    return map[lang] ?? [lang];
}

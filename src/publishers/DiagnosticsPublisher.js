"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsPublisher = void 0;
var vscode = require("vscode");
var types_1 = require("../types");
// Icon per category shown in the Problems panel message
var ICONS = {
    'code-smell': '🧹', security: '🔒', complexity: '📊', duplicate: '📋', ai: '🤖',
};
// Single job: take a FileAnalysisResult and show squiggles in the editor
var DiagnosticsPublisher = /** @class */ (function () {
    function DiagnosticsPublisher() {
        // One collection per extension — named "CodeSec" in the Problems panel
        this.collection = vscode.languages.createDiagnosticCollection('CodeSec');
    }
    // Push issues for one file into the Problems panel
    DiagnosticsPublisher.prototype.present = function (result) {
        var _this = this;
        var diags = result.issues.map(function (i) { return _this.toDiagnostic(i, result.uri); });
        this.collection.set(result.uri, diags);
    };
    // Remove squiggles for a single file
    DiagnosticsPublisher.prototype.clear = function (uri) {
        this.collection.delete(uri);
    };
    // Remove all squiggles across every file
    DiagnosticsPublisher.prototype.clearAll = function () {
        this.collection.clear();
    };
    // Convert our Issue shape to the vscode.Diagnostic shape
    DiagnosticsPublisher.prototype.toDiagnostic = function (issue, docUri) {
        var _a, _b;
        // Look up the open document to clamp line numbers safely
        var doc = vscode.workspace.textDocuments.find(function (d) { return d.uri.toString() === docUri.toString(); });
        var maxL = doc ? doc.lineCount - 1 : issue.line;
        var line = Math.min(issue.line, maxL);
        var lineLen = doc ? doc.lineAt(line).text.length : 200;
        var range = new vscode.Range(line, Math.min(issue.column, lineLen), Math.min((_a = issue.endLine) !== null && _a !== void 0 ? _a : line, maxL), Math.min((_b = issue.endColumn) !== null && _b !== void 0 ? _b : lineLen, lineLen));
        // Suggestion goes on a second line so it's visible without clicking
        var msg = "".concat(ICONS[issue.category], " ").concat(issue.message).concat(issue.suggestion ? "\n\uD83D\uDCA1 ".concat(issue.suggestion) : '');
        var diag = new vscode.Diagnostic(range, msg, (0, types_1.toVsCodeSeverity)(issue.severity));
        // Source label shown in Problems panel — AI issues get a different label
        diag.source = issue.source === 'ai' ? 'CodeSec (AI)' : 'CodeSec';
        diag.code = issue.rule;
        return diag;
    };
    DiagnosticsPublisher.prototype.dispose = function () {
        this.collection.dispose();
    };
    return DiagnosticsPublisher;
}());
exports.DiagnosticsPublisher = DiagnosticsPublisher;

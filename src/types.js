"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toVsCodeSeverity = toVsCodeSeverity;
var vscode = require("vscode");
// Convert our severity string to what VS Code's Problems panel expects
function toVsCodeSeverity(s) {
    var map = {
        error: vscode.DiagnosticSeverity.Error,
        warning: vscode.DiagnosticSeverity.Warning,
        info: vscode.DiagnosticSeverity.Information,
        hint: vscode.DiagnosticSeverity.Hint,
    };
    return map[s];
}

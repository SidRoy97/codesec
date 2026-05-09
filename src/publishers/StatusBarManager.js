"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarManager = void 0;
var vscode = require("vscode");
// Single job: count issues in the store and update the status bar text + color
var StatusBarManager = /** @class */ (function () {
    function StatusBarManager(store) {
        this.store = store;
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        // Clicking the status bar opens the dashboard
        this.item.command = 'codeSec.openDashboard';
        this.item.show();
        this.render();
    }
    // Recalculate and redraw after every analysis
    StatusBarManager.prototype.render = function () {
        var all = this.store.getAll();
        var errors = all.reduce(function (n, r) { return n + r.issues.filter(function (i) { return i.severity === 'error'; }).length; }, 0);
        var warnings = all.reduce(function (n, r) { return n + r.issues.filter(function (i) { return i.severity === 'warning'; }).length; }, 0);
        var total = all.reduce(function (n, r) { return n + r.issues.length; }, 0);
        if (total === 0) {
            // Green checkmark when the workspace is clean
            this.item.text = '$(check) CodeSec';
            this.item.backgroundColor = undefined;
            this.item.tooltip = 'CodeSec: No issues found';
            return;
        }
        var parts = [];
        if (errors > 0)
            parts.push("$(error) ".concat(errors));
        if (warnings > 0)
            parts.push("$(warning) ".concat(warnings));
        this.item.text = "CodeSec: ".concat(parts.join('  '));
        this.item.tooltip = "CodeSec: ".concat(total, " issue(s) \u2014 click to open dashboard");
        this.item.backgroundColor = errors > 0
            ? new vscode.ThemeColor('statusBarItem.errorBackground')
            : new vscode.ThemeColor('statusBarItem.warningBackground');
    };
    StatusBarManager.prototype.dispose = function () { this.item.dispose(); };
    return StatusBarManager;
}());
exports.StatusBarManager = StatusBarManager;

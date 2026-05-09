"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticScanner = void 0;
var javascriptRules_1 = require("../rules/javascriptRules");
var reactRules_1 = require("../rules/reactRules");
var pythonRules_1 = require("../rules/pythonRules");
var javaRules_1 = require("../rules/javaRules");
// Detect React usage even in plain .ts/.js files
var REACT_IMPORT = /^import\s+.*['"]react['"]/im;
// Single job: pick the right rule set for the language and run it
var StaticScanner = /** @class */ (function () {
    function StaticScanner() {
        this.name = 'StaticScanner';
    }
    StaticScanner.prototype.scan = function (document) {
        var lang = document.languageId;
        var lines = this.getLines(document);
        var issues = [];
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(lang)) {
            issues.push.apply(issues, (0, javascriptRules_1.runJavaScriptRules)(lines));
            // Also run React rules if the file is JSX/TSX or imports React
            var isReact = ['javascriptreact', 'typescriptreact'].includes(lang) || REACT_IMPORT.test(document.getText());
            if (isReact)
                issues.push.apply(issues, (0, reactRules_1.runReactRules)(lines));
        }
        else if (lang === 'python') {
            issues.push.apply(issues, (0, pythonRules_1.runPythonRules)(lines));
        }
        else if (lang === 'java') {
            issues.push.apply(issues, (0, javaRules_1.runJavaRules)(lines));
        }
        return issues;
    };
    // Get all lines of the document as a plain string array
    StaticScanner.prototype.getLines = function (document) {
        return Array.from({ length: document.lineCount }, function (_, i) { return document.lineAt(i).text; });
    };
    return StaticScanner;
}());
exports.StaticScanner = StaticScanner;

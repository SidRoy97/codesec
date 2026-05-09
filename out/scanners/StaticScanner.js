"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticScanner = void 0;
const javascriptRules_1 = require("../rules/javascriptRules");
const reactRules_1 = require("../rules/reactRules");
const pythonRules_1 = require("../rules/pythonRules");
const javaRules_1 = require("../rules/javaRules");
// Detect React usage even in plain .ts/.js files
const REACT_IMPORT = /^import\s+.*['"]react['"]/im;
// Single job: pick the right rule set for the language and run it
class StaticScanner {
    constructor() {
        this.name = 'StaticScanner';
    }
    scan(document) {
        const lang = document.languageId;
        const lines = this.getLines(document);
        const issues = [];
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(lang)) {
            issues.push(...(0, javascriptRules_1.runJavaScriptRules)(lines));
            // Also run React rules if the file is JSX/TSX or imports React
            const isReact = ['javascriptreact', 'typescriptreact'].includes(lang) || REACT_IMPORT.test(document.getText());
            if (isReact)
                issues.push(...(0, reactRules_1.runReactRules)(lines));
        }
        else if (lang === 'python') {
            issues.push(...(0, pythonRules_1.runPythonRules)(lines));
        }
        else if (lang === 'java') {
            issues.push(...(0, javaRules_1.runJavaRules)(lines));
        }
        return issues;
    }
    // Get all lines of the document as a plain string array
    getLines(document) {
        return Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);
    }
}
exports.StaticScanner = StaticScanner;

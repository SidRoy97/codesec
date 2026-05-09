"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
var vscode = require("vscode");
// Single job: be the one place that reads VS Code workspace settings
var ConfigManager = /** @class */ (function () {
    function ConfigManager() {
    }
    // Helper to get the vscode config object once
    ConfigManager.prototype.cfg = function () {
        return vscode.workspace.getConfiguration('codeSec');
    };
    // Which AI backend: ollama | openrouter | anthropic | openai-compatible
    ConfigManager.prototype.getAiProvider = function () {
        var _a;
        return (_a = this.cfg().get('aiProvider')) !== null && _a !== void 0 ? _a : 'ollama';
    };
    // Model name e.g. "qwen2.5-coder:7b" — empty means use the provider default
    ConfigManager.prototype.getAiModel = function () {
        var _a;
        return (_a = this.cfg().get('aiModel')) !== null && _a !== void 0 ? _a : '';
    };
    // API key for cloud providers — empty string means no key needed (Ollama)
    ConfigManager.prototype.getAiApiKey = function () {
        var _a;
        return (_a = this.cfg().get('aiApiKey')) !== null && _a !== void 0 ? _a : '';
    };
    // Override the default base URL if the user is running on a different port
    ConfigManager.prototype.getAiBaseUrl = function () {
        var _a;
        return (_a = this.cfg().get('aiBaseUrl')) !== null && _a !== void 0 ? _a : '';
    };
    // Whether to call the AI at all — users can turn this off to save time
    ConfigManager.prototype.isAiEnabled = function () {
        var _a;
        return (_a = this.cfg().get('enableAiAnalysis')) !== null && _a !== void 0 ? _a : true;
    };
    // Whether to run built-in static regex rules
    ConfigManager.prototype.isStaticEnabled = function () {
        var _a;
        return (_a = this.cfg().get('enableStaticAnalysis')) !== null && _a !== void 0 ? _a : true;
    };
    // Functions above this complexity score get flagged
    ConfigManager.prototype.getComplexityThreshold = function () {
        var _a;
        return (_a = this.cfg().get('complexityThreshold')) !== null && _a !== void 0 ? _a : 10;
    };
    // Blocks shorter than this won't be flagged as duplicates
    ConfigManager.prototype.getDuplicateThreshold = function () {
        var _a;
        return (_a = this.cfg().get('duplicateLineThreshold')) !== null && _a !== void 0 ? _a : 6;
    };
    // Which programming languages we should analyze
    ConfigManager.prototype.getLanguages = function () {
        var _a;
        return (_a = this.cfg().get('languages')) !== null && _a !== void 0 ? _a : ['javascript', 'typescript', 'python', 'java'];
    };
    // Trigger analysis automatically whenever the user saves
    ConfigManager.prototype.shouldAnalyzeOnSave = function () {
        var _a;
        return (_a = this.cfg().get('analyzeOnSave')) !== null && _a !== void 0 ? _a : true;
    };
    return ConfigManager;
}());
exports.ConfigManager = ConfigManager;

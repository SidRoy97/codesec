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
exports.AiScanner = void 0;
var vscode = require("vscode");
// Default model per provider when the user hasn't set one
var DEFAULT_MODELS = {
    ollama: 'qwen2.5-coder:7b', // best free local code model
    openrouter: 'qwen/qwen-2.5-coder-32b-instruct:free',
    anthropic: 'claude-sonnet-4-20250514',
    'openai-compatible': 'llama3',
};
// Default base URL per provider
var DEFAULT_URLS = {
    ollama: 'http://localhost:11434',
    openrouter: 'https://openrouter.ai/api',
    anthropic: 'https://api.anthropic.com',
    'openai-compatible': 'http://localhost:1234',
};
// Instruct the AI to return strict JSON — no prose, no markdown
var SYSTEM = "You are a senior software engineer doing a code review.\nFind real concrete issues only. Do not invent issues.\nCheck: security vulnerabilities, bugs, code smells, performance problems.\n\nReturn ONLY a JSON array. Each element:\n{\"line\":<1-indexed>,\"severity\":\"error\"|\"warning\"|\"info\"|\"hint\",\n \"category\":\"code-smell\"|\"security\"|\"complexity\"|\"duplicate\",\n \"message\":\"<what is wrong>\",\"suggestion\":\"<how to fix>\"}\n\nReturn [] if no issues. JSON only \u2014 no markdown, no explanation.";
// Single job: call the AI, parse its response, return Issues
var AiScanner = /** @class */ (function () {
    function AiScanner(config) {
        this.config = config;
        this.name = 'AiScanner';
    }
    AiScanner.prototype.scan = function (document) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, model, url, key, userMsg, text, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.config.isAiEnabled())
                            return [2 /*return*/, []];
                        // Skip very large files — too many tokens and too slow
                        if (document.getText().length > 60000) {
                            vscode.window.showWarningMessage('CodeSec: File >60KB — skipping AI scan.');
                            return [2 /*return*/, []];
                        }
                        provider = this.config.getAiProvider();
                        model = this.config.getAiModel() || DEFAULT_MODELS[provider];
                        url = (this.config.getAiBaseUrl() || DEFAULT_URLS[provider]).replace(/\/$/, '');
                        key = this.config.getAiApiKey();
                        userMsg = "Language: ".concat(document.languageId, "\n```\n").concat(document.getText(), "\n```");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        text = void 0;
                        if (!(provider === 'anthropic')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.callAnthropic(url, key, model, userMsg)];
                    case 2:
                        text = _a.sent();
                        return [3 /*break*/, 7];
                    case 3:
                        if (!(provider === 'ollama')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.callOllama(url, model, userMsg)];
                    case 4:
                        text = _a.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, this.callOpenAI(url, key, model, userMsg, provider)];
                    case 6:
                        // openrouter and openai-compatible both speak OpenAI chat format
                        text = _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, this.parse(text)];
                    case 8:
                        err_1 = _a.sent();
                        this.handleError(err_1, provider);
                        return [2 /*return*/, []];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // Also used by CodeActionsProvider for fix and explain requests
    AiScanner.prototype.generateText = function (system, user) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, model, url, key;
            return __generator(this, function (_a) {
                provider = this.config.getAiProvider();
                model = this.config.getAiModel() || DEFAULT_MODELS[provider];
                url = (this.config.getAiBaseUrl() || DEFAULT_URLS[provider]).replace(/\/$/, '');
                key = this.config.getAiApiKey();
                try {
                    if (provider === 'anthropic')
                        return [2 /*return*/, this.callAnthropic(url, key, model, user, system)];
                    if (provider === 'ollama')
                        return [2 /*return*/, this.callOllama(url, model, user, system)];
                    return [2 /*return*/, this.callOpenAI(url, key, model, user, provider, system)];
                }
                catch (err) {
                    this.handleError(err, provider);
                    return [2 /*return*/, ''];
                }
                return [2 /*return*/];
            });
        });
    };
    // --- Private: one method per API format ---
    AiScanner.prototype.callOllama = function (url_1, model_1, user_1) {
        return __awaiter(this, arguments, void 0, function (url, model, user, system) {
            var res, data;
            var _a, _b;
            if (system === void 0) { system = SYSTEM; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, fetch("".concat(url, "/api/chat"), {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: model, stream: false, options: { temperature: 0.1 },
                                messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
                        })];
                    case 1:
                        res = _c.sent();
                        // Model not pulled yet — give a specific helpful message
                        if (res.status === 404) {
                            vscode.window.showErrorMessage("CodeSec: Ollama model \"".concat(model, "\" not found. Run: ollama pull ").concat(model));
                            throw new Error('model not found');
                        }
                        if (!res.ok)
                            throw new Error("Ollama ".concat(res.status));
                        return [4 /*yield*/, res.json()];
                    case 2:
                        data = _c.sent();
                        return [2 /*return*/, (_b = (_a = data === null || data === void 0 ? void 0 : data.message) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : ''];
                }
            });
        });
    };
    AiScanner.prototype.callOpenAI = function (url_1, key_1, model_1, user_1, provider_1) {
        return __awaiter(this, arguments, void 0, function (url, key, model, user, provider, system) {
            var headers, res, _a, _b, _c, data;
            var _d, _e, _f, _g;
            if (system === void 0) { system = SYSTEM; }
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        headers = { 'Content-Type': 'application/json' };
                        if (key)
                            headers['Authorization'] = "Bearer ".concat(key);
                        // OpenRouter requires these to track usage in their dashboard
                        if (provider === 'openrouter') {
                            headers['HTTP-Referer'] = 'https://github.com/your-org/codesec';
                            headers['X-Title'] = 'CodeSec';
                        }
                        return [4 /*yield*/, fetch("".concat(url, "/v1/chat/completions"), {
                                method: 'POST',
                                headers: headers,
                                body: JSON.stringify({ model: model, temperature: 0.1, max_tokens: 2048,
                                    messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
                            })];
                    case 1:
                        res = _h.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        _a = Error.bind;
                        _c = (_b = "".concat(provider, " ").concat(res.status, ": ")).concat;
                        return [4 /*yield*/, res.text()];
                    case 2: throw new (_a.apply(Error, [void 0, _c.apply(_b, [_h.sent()])]))();
                    case 3: return [4 /*yield*/, res.json()];
                    case 4:
                        data = _h.sent();
                        return [2 /*return*/, (_g = (_f = (_e = (_d = data === null || data === void 0 ? void 0 : data.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content) !== null && _g !== void 0 ? _g : ''];
                }
            });
        });
    };
    AiScanner.prototype.callAnthropic = function (url_1, key_1, model_1, user_1) {
        return __awaiter(this, arguments, void 0, function (url, key, model, user, system) {
            var res, _a, _b, _c, data;
            var _d, _e, _f;
            if (system === void 0) { system = SYSTEM; }
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, fetch("".concat(url, "/v1/messages"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
                            body: JSON.stringify({ model: model, max_tokens: 2048, system: system, messages: [{ role: 'user', content: user }] }),
                        })];
                    case 1:
                        res = _g.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        _a = Error.bind;
                        _c = (_b = "Anthropic ".concat(res.status, ": ")).concat;
                        return [4 /*yield*/, res.text()];
                    case 2: throw new (_a.apply(Error, [void 0, _c.apply(_b, [_g.sent()])]))();
                    case 3: return [4 /*yield*/, res.json()];
                    case 4:
                        data = _g.sent();
                        return [2 /*return*/, (_f = (_e = (_d = data === null || data === void 0 ? void 0 : data.content) === null || _d === void 0 ? void 0 : _d.find(function (b) { return b.type === 'text'; })) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : ''];
                }
            });
        });
    };
    // Pull the JSON array out of the response even if the model added surrounding prose
    AiScanner.prototype.parse = function (raw) {
        var _a;
        if (!raw)
            return [];
        var json = ((_a = raw.match(/\[[\s\S]*\]/)) !== null && _a !== void 0 ? _a : [])[0];
        if (!json)
            return [];
        var parsed;
        try {
            parsed = JSON.parse(json);
            if (!Array.isArray(parsed))
                return [];
        }
        catch (_b) {
            console.error('CodeSec: failed to parse AI JSON');
            return [];
        }
        return parsed
            .filter(function (i) { return typeof i.line === 'number' && i.line >= 1 && i.message; })
            .map(function (i, idx) {
            var _a, _b;
            return ({
                id: "ai:".concat(i.line, ":").concat(idx), message: i.message,
                severity: (_a = i.severity) !== null && _a !== void 0 ? _a : 'warning',
                category: (_b = i.category) !== null && _b !== void 0 ? _b : 'code-smell',
                line: Math.max(0, i.line - 1), // convert from 1-indexed to 0-indexed
                column: 0, endLine: Math.max(0, i.line - 1),
                rule: 'ai:review', suggestion: i.suggestion, source: 'ai',
            });
        });
    };
    AiScanner.prototype.handleError = function (err, provider) {
        var msg = err instanceof Error ? err.message : String(err);
        if (provider === 'ollama' && msg.includes('ECONNREFUSED')) {
            vscode.window.showErrorMessage('CodeSec: Ollama not running. Start it: ollama serve', 'Get Ollama')
                .then(function (c) { return c && vscode.env.openExternal(vscode.Uri.parse('https://ollama.com')); });
        }
        else if (msg.includes('401')) {
            vscode.window.showErrorMessage("CodeSec: Invalid API key for ".concat(provider, "."));
        }
        else if (msg.includes('429')) {
            vscode.window.showWarningMessage("CodeSec: Rate limit hit (".concat(provider, ")."));
        }
        else {
            console.error("CodeSec AI [".concat(provider, "]:"), msg);
        }
    };
    return AiScanner;
}());
exports.AiScanner = AiScanner;

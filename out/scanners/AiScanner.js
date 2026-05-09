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
exports.AiScanner = void 0;
const vscode = __importStar(require("vscode"));
// Default model per provider when the user hasn't set one
const DEFAULT_MODELS = {
    ollama: 'qwen2.5-coder:7b', // best free local code model
    openrouter: 'qwen/qwen-2.5-coder-32b-instruct:free',
    anthropic: 'claude-sonnet-4-20250514',
    'openai-compatible': 'llama3',
};
// Default base URL per provider
const DEFAULT_URLS = {
    ollama: 'http://localhost:11434',
    openrouter: 'https://openrouter.ai/api',
    anthropic: 'https://api.anthropic.com',
    'openai-compatible': 'http://localhost:1234',
};
// Instruct the AI to return strict JSON — no prose, no markdown
const SYSTEM = `You are a senior software engineer doing a code review.
Find real concrete issues only. Do not invent issues.
Check: security vulnerabilities, bugs, code smells, performance problems.

Return ONLY a JSON array. Each element:
{"line":<1-indexed>,"severity":"error"|"warning"|"info"|"hint",
 "category":"code-smell"|"security"|"complexity"|"duplicate",
 "message":"<what is wrong>","suggestion":"<how to fix>"}

Return [] if no issues. JSON only — no markdown, no explanation.`;
// Single job: call the AI, parse its response, return Issues
class AiScanner {
    constructor(config) {
        this.config = config;
        this.name = 'AiScanner';
    }
    async scan(document) {
        if (!this.config.isAiEnabled())
            return [];
        // Skip very large files — too many tokens and too slow
        if (document.getText().length > 60000) {
            vscode.window.showWarningMessage('CodeSec: File >60KB — skipping AI scan.');
            return [];
        }
        const provider = this.config.getAiProvider();
        const model = this.config.getAiModel() || DEFAULT_MODELS[provider];
        const url = (this.config.getAiBaseUrl() || DEFAULT_URLS[provider]).replace(/\/$/, '');
        const key = this.config.getAiApiKey();
        const userMsg = `Language: ${document.languageId}\n\`\`\`\n${document.getText()}\n\`\`\``;
        try {
            let text;
            // Route to the right API format — Anthropic uses a different shape than OpenAI
            if (provider === 'anthropic') {
                text = await this.callAnthropic(url, key, model, userMsg);
            }
            else if (provider === 'ollama') {
                text = await this.callOllama(url, model, userMsg);
            }
            else {
                // openrouter and openai-compatible both speak OpenAI chat format
                text = await this.callOpenAI(url, key, model, userMsg, provider);
            }
            return this.parse(text);
        }
        catch (err) {
            this.handleError(err, provider);
            return [];
        }
    }
    // Also used by CodeActionsProvider for fix and explain requests
    async generateText(system, user) {
        const provider = this.config.getAiProvider();
        const model = this.config.getAiModel() || DEFAULT_MODELS[provider];
        const url = (this.config.getAiBaseUrl() || DEFAULT_URLS[provider]).replace(/\/$/, '');
        const key = this.config.getAiApiKey();
        try {
            if (provider === 'anthropic')
                return this.callAnthropic(url, key, model, user, system);
            if (provider === 'ollama')
                return this.callOllama(url, model, user, system);
            return this.callOpenAI(url, key, model, user, provider, system);
        }
        catch (err) {
            this.handleError(err, provider);
            return '';
        }
    }
    // --- Private: one method per API format ---
    async callOllama(url, model, user, system = SYSTEM) {
        const res = await fetch(`${url}/api/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, stream: false, options: { temperature: 0.1 },
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        });
        // Model not pulled yet — give a specific helpful message
        if (res.status === 404) {
            vscode.window.showErrorMessage(`CodeSec: Ollama model "${model}" not found. Run: ollama pull ${model}`);
            throw new Error('model not found');
        }
        if (!res.ok)
            throw new Error(`Ollama ${res.status}`);
        const data = await res.json();
        return data?.message?.content ?? '';
    }
    async callOpenAI(url, key, model, user, provider, system = SYSTEM) {
        const headers = { 'Content-Type': 'application/json' };
        if (key)
            headers['Authorization'] = `Bearer ${key}`;
        // OpenRouter requires these to track usage in their dashboard
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://github.com/your-org/codesec';
            headers['X-Title'] = 'CodeSec';
        }
        const res = await fetch(`${url}/v1/chat/completions`, {
            method: 'POST', headers,
            body: JSON.stringify({ model, temperature: 0.1, max_tokens: 2048,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        });
        if (!res.ok)
            throw new Error(`${provider} ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? '';
    }
    async callAnthropic(url, key, model, user, system = SYSTEM) {
        const res = await fetch(`${url}/v1/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: 'user', content: user }] }),
        });
        if (!res.ok)
            throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data?.content?.find(b => b.type === 'text')?.text ?? '';
    }
    // Pull the JSON array out of the response even if the model added surrounding prose
    parse(raw) {
        if (!raw)
            return [];
        const json = (raw.match(/\[[\s\S]*\]/) ?? [])[0];
        if (!json)
            return [];
        let parsed;
        try {
            parsed = JSON.parse(json);
            if (!Array.isArray(parsed))
                return [];
        }
        catch {
            console.error('CodeSec: failed to parse AI JSON');
            return [];
        }
        return parsed
            .filter(i => typeof i.line === 'number' && i.line >= 1 && i.message)
            .map((i, idx) => ({
            id: `ai:${i.line}:${idx}`, message: i.message,
            severity: i.severity ?? 'warning',
            category: i.category ?? 'code-smell',
            line: Math.max(0, i.line - 1), // convert from 1-indexed to 0-indexed
            column: 0, endLine: Math.max(0, i.line - 1),
            rule: 'ai:review', suggestion: i.suggestion, source: 'ai',
        }));
    }
    handleError(err, provider) {
        const msg = err instanceof Error ? err.message : String(err);
        if (provider === 'ollama' && msg.includes('ECONNREFUSED')) {
            vscode.window.showErrorMessage('CodeSec: Ollama not running. Start it: ollama serve', 'Get Ollama')
                .then(c => c && vscode.env.openExternal(vscode.Uri.parse('https://ollama.com')));
        }
        else if (msg.includes('401')) {
            vscode.window.showErrorMessage(`CodeSec: Invalid API key for ${provider}.`);
        }
        else if (msg.includes('429')) {
            vscode.window.showWarningMessage(`CodeSec: Rate limit hit (${provider}).`);
        }
        else {
            console.error(`CodeSec AI [${provider}]:`, msg);
        }
    }
}
exports.AiScanner = AiScanner;

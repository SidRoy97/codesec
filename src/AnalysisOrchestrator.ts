import * as vscode from 'vscode';
import { FileAnalysisResult, Issue } from './types';
import { IResultStore, IConfigProvider } from './interfaces';
import { StaticScanner }     from './scanners/StaticScanner';
import { ComplexityScanner } from './scanners/ComplexityScanner';
import { DuplicateScanner }  from './scanners/DuplicateScanner';
import { AiScanner }         from './scanners/AiScanner';

// Single job: coordinate the four scanners and persist the result
// Never touches the UI — publishers do that via the onComplete callback
export class AnalysisOrchestrator implements vscode.Disposable {

  // Pending debounce timers per file URI
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly store:      IResultStore,
    private readonly config:     IConfigProvider,
    private readonly static_:    StaticScanner,
    private readonly complexity: ComplexityScanner,
    private readonly duplicate:  DuplicateScanner,
    private readonly ai:         AiScanner,
    // Called after analysis finishes — publishers subscribe to this
    private readonly onComplete: (result: FileAnalysisResult) => void,
  ) {}

  // Analyze a document, optionally debounced for live-typing use
  async analyze(document: vscode.TextDocument, debounceMs = 0): Promise<FileAnalysisResult | null> {
    // Ignore unsupported languages and virtual documents (git diffs, output panels)
    if (!this.config.getLanguages().includes(document.languageId)) return null;
    if (document.uri.scheme !== 'file') return null;

    if (debounceMs > 0) return this.debounced(document, debounceMs);
    return this.run(document);
  }

  // Run all scanners, merge, deduplicate, save
  private async run(document: vscode.TextDocument): Promise<FileAnalysisResult> {
    const all: Issue[] = [];

    // Static rules — fast, always run first
    if (this.config.isStaticEnabled()) all.push(...this.static_.scan(document));

    // Complexity and duplicate checks — no API cost so always run
    all.push(...this.complexity.scan(document));
    const { issues: dupIssues, blocks } = this.duplicate.scanWithBlocks(document);
    all.push(...dupIssues);

    // AI last — slowest, network call, may be disabled
    all.push(...await this.ai.scan(document));

    const result: FileAnalysisResult = {
      uri:             document.uri,
      language:        document.languageId,
      issues:          this.deduplicate(all),
      complexity:      this.complexity.getAverageComplexity(document),
      duplicateBlocks: blocks,
      analyzedAt:      new Date(),
    };

    // Save to store then notify publishers — they decide how to display it
    this.store.save(result);
    this.onComplete(result);
    return result;
  }

  // Reset the timer every time the user types — only fires after they pause
  private debounced(document: vscode.TextDocument, ms: number): Promise<FileAnalysisResult | null> {
    const key = document.uri.toString();
    const old = this.timers.get(key);
    if (old) clearTimeout(old);

    return new Promise(resolve => {
      const timer = setTimeout(async () => {
        this.timers.delete(key);
        resolve(await this.run(document));
      }, ms);
      this.timers.set(key, timer);
    });
  }

  // Remove issues where the same rule fires on the same line (overlapping patterns)
  private deduplicate(issues: Issue[]): Issue[] {
    const seen = new Set<string>();
    return issues.filter(i => {
      const key = `${i.line}:${i.rule}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Use Array.from instead of for...of on Map iterator — works at all TS targets
  dispose(): void {
    Array.from(this.timers.values()).forEach(t => clearTimeout(t));
  }
}
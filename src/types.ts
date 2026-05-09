import * as vscode from 'vscode';

// How bad an issue is
export type IssueSeverity = 'error' | 'warning' | 'info' | 'hint';

// What kind of problem it is
export type IssueCategory = 'code-smell' | 'security' | 'complexity' | 'duplicate' | 'ai';

// One problem found in a file
export interface Issue {
  id:          string;
  message:     string;
  severity:    IssueSeverity;
  category:    IssueCategory;
  line:        number;      // 0-indexed to match VS Code
  column:      number;
  endLine?:    number;
  endColumn?:  number;
  rule?:       string;      // e.g. "js:no-eval"
  suggestion?: string;      // how to fix it
  source:      'static' | 'ai';
}

// Everything learned about one file after a full analysis
export interface FileAnalysisResult {
  uri:             vscode.Uri;
  language:        string;
  issues:          Issue[];
  complexity:      number;
  duplicateBlocks: DuplicateBlock[];
  analyzedAt:      Date;
}

// A block of code that appears more than once
export interface DuplicateBlock {
  startLine:    number;
  endLine:      number;
  duplicateIn?: { startLine: number; endLine: number };
}

// Convert our severity string to what VS Code's Problems panel expects
export function toVsCodeSeverity(s: IssueSeverity): vscode.DiagnosticSeverity {
  const map: Record<IssueSeverity, vscode.DiagnosticSeverity> = {
    error:   vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info:    vscode.DiagnosticSeverity.Information,
    hint:    vscode.DiagnosticSeverity.Hint,
  };
  return map[s];
}
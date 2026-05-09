import * as vscode from 'vscode';
import { FileAnalysisResult } from './types';
import { IResultStore } from './interfaces';

// In-memory map from file URI → last analysis result for that file
export class ResultStore implements IResultStore {

  // Key is the URI string so we can look up by vscode.Uri easily
  private store = new Map<string, FileAnalysisResult>();

  // Save or overwrite the result for a file
  save(result: FileAnalysisResult): void {
    this.store.set(result.uri.toString(), result);
  }

  // Get the last result for a file, or undefined if never analyzed
  get(uri: vscode.Uri): FileAnalysisResult | undefined {
    return this.store.get(uri.toString());
  }

  // Get all results — used by the dashboard and status bar
  getAll(): FileAnalysisResult[] {
    return Array.from(this.store.values());
  }

  // Remove one file when it's closed so stale results don't accumulate
  remove(uri: vscode.Uri): void {
    this.store.delete(uri.toString());
  }

  // Wipe everything when the user clicks "Clear All"
  clear(): void {
    this.store.clear();
  }
}
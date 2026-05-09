import * as vscode from 'vscode';
import { Issue, FileAnalysisResult } from '../types';

// Every scanner does exactly one thing: take a document, return issues
// To add a new scanner: implement this interface, add it to the orchestrator — nothing else changes
export interface IScanner {
  readonly name: string;
  scan(document: vscode.TextDocument): Promise<Issue[]> | Issue[];
}

// Anything that stores and retrieves analysis results
export interface IResultStore {
  save(result: FileAnalysisResult): void;
  get(uri: vscode.Uri): FileAnalysisResult | undefined;
  getAll(): FileAnalysisResult[];
  remove(uri: vscode.Uri): void;
  clear(): void;
}

// Anything that reads configuration values
export interface IConfigProvider {
  getAiProvider(): string;
  getAiModel(): string;
  getAiApiKey(): string;
  getAiBaseUrl(): string;
  isAiEnabled(): boolean;
  isStaticEnabled(): boolean;
  getComplexityThreshold(): number;
  getDuplicateThreshold(): number;
  getLanguages(): string[];
  shouldAnalyzeOnSave(): boolean;
}

// Anything that displays results to the user
export interface IResultPresenter {
  present(result: FileAnalysisResult): void;
  clear(uri: vscode.Uri): void;
  clearAll(): void;
}
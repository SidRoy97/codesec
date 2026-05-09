import * as vscode from 'vscode';
import { Issue } from '../types';
import { IScanner } from '../interfaces';
import { runJavaScriptRules } from '../rules/javascriptRules';
import { runReactRules }      from '../rules/reactRules';
import { runPythonRules }     from '../rules/pythonRules';
import { runJavaRules }       from '../rules/javaRules';

// Detect React usage even in plain .ts/.js files
const REACT_IMPORT = /^import\s+.*['"]react['"]/im;

// Single job: pick the right rule set for the language and run it
export class StaticScanner implements IScanner {
  readonly name = 'StaticScanner';

  scan(document: vscode.TextDocument): Issue[] {
    const lang  = document.languageId;
    const lines = this.getLines(document);
    const issues: Issue[] = [];

    if (['javascript','typescript','javascriptreact','typescriptreact'].includes(lang)) {
      issues.push(...runJavaScriptRules(lines));

      // Also run React rules if the file is JSX/TSX or imports React
      const isReact = ['javascriptreact','typescriptreact'].includes(lang) || REACT_IMPORT.test(document.getText());
      if (isReact) issues.push(...runReactRules(lines));

    } else if (lang === 'python') {
      issues.push(...runPythonRules(lines));
    } else if (lang === 'java') {
      issues.push(...runJavaRules(lines));
    }

    return issues;
  }

  // Get all lines of the document as a plain string array
  private getLines(document: vscode.TextDocument): string[] {
    return Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);
  }
}
import * as vscode from 'vscode';
import { ConfigManager }        from './config/ConfigManager';
import { ResultStore }          from './ResultStore';
import { StaticScanner }        from './scanners/StaticScanner';
import { ComplexityScanner }    from './scanners/ComplexityScanner';
import { DuplicateScanner }     from './scanners/DuplicateScanner';
import { AiScanner }            from './scanners/AiScanner';
import { AnalysisOrchestrator } from './AnalysisOrchestrator';
import { DiagnosticsPublisher } from './publishers/DiagnosticsPublisher';
import { StatusBarManager }     from './publishers/StatusBarManager';
import { FileAnalysisResult }   from './types';

export function activate(context: vscode.ExtensionContext): void {

  // --- Build all pieces (Dependency Inversion: inject deps, never hard-code) ---
  const config     = new ConfigManager();
  const store      = new ResultStore();
  const static_    = new StaticScanner();
  const complexity = new ComplexityScanner(config);
  const duplicate  = new DuplicateScanner(config);
  const ai         = new AiScanner(config);
  const diagPub    = new DiagnosticsPublisher();
  const statusBar  = new StatusBarManager(store);

  // After every analysis: update squiggles and status bar
  const onComplete = (result: FileAnalysisResult): void => {
    diagPub.present(result);  // show squiggles
    statusBar.render();       // update count in status bar
  };

  const orchestrator = new AnalysisOrchestrator(store, config, static_, complexity, duplicate, ai, onComplete);

  // --- Commands ---

  // Analyze the currently open file on demand
  context.subscriptions.push(
    vscode.commands.registerCommand('codeSec.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showWarningMessage('CodeSec: No active file.'); return; }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'CodeSec: Analyzing…', cancellable: false },
        async () => {
          const result = await orchestrator.analyze(editor.document);
          if (!result) return;
          const n    = result.issues.length;
          const file = vscode.workspace.asRelativePath(editor.document.uri);
          vscode.window.showInformationMessage(n === 0 ? `CodeSec: ✅ No issues in ${file}` : `CodeSec: ${n} issue(s) in ${file}`);
        }
      );
    })
  );

  // Scan every supported file in the workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('codeSec.analyzeWorkspace', async () => {
      const exts = config.getLanguages().flatMap(langToExts).join(',');
      const uris = await vscode.workspace.findFiles(`**/*.{${exts}}`, '{**/node_modules/**,**/dist/**}');
      if (!uris.length) { vscode.window.showWarningMessage('CodeSec: No supported files found.'); return; }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `CodeSec: Scanning ${uris.length} files…`, cancellable: true },
        async (progress, token) => {
          for (let i = 0; i < uris.length; i++) {
            if (token.isCancellationRequested) break;
            try { await orchestrator.analyze(await vscode.workspace.openTextDocument(uris[i])); } catch {}
            progress.report({ message: `${i+1}/${uris.length}`, increment: (1 / uris.length) * 100 });
          }
          const total = store.getAll().reduce((n, r) => n + r.issues.length, 0);
          vscode.window.showInformationMessage(`CodeSec: Done — ${total} issue(s) in ${store.getAll().length} files`);
        }
      );
    })
  );

  // Wipe all results and squiggles
  context.subscriptions.push(
    vscode.commands.registerCommand('codeSec.clearIssues', () => {
      store.clear(); diagPub.clearAll(); statusBar.render();
      vscode.window.showInformationMessage('CodeSec: All issues cleared.');
    })
  );

  // Open the Activity Bar dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('codeSec.openDashboard', () => {
      vscode.commands.executeCommand('workbench.view.extension.codeSec');
    })
  );

  // --- Event listeners ---

  // Auto-analyze when the user saves, if enabled in settings
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async doc => {
      if (config.shouldAnalyzeOnSave()) await orchestrator.analyze(doc);
    })
  );

  // Analyze while typing — 1.5s debounce so we don't fire on every keystroke
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async e => {
      if (e.contentChanges.length) await orchestrator.analyze(e.document, 1500);
    })
  );

  // Clean up results when a file is closed so stale data doesn't accumulate
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => {
      store.remove(doc.uri); diagPub.clear(doc.uri); statusBar.render();
    })
  );

  // Analyze whatever is already open when the extension first loads
  for (const editor of vscode.window.visibleTextEditors) {
    orchestrator.analyze(editor.document);
  }

  context.subscriptions.push(diagPub, statusBar, orchestrator);

  // Friendly first-run nudge for Ollama users
  if (config.getAiProvider() === 'ollama') {
    vscode.window.showInformationMessage(
      'CodeSec: AI runs locally via Ollama (free). Make sure it\'s running.',
      'Get Ollama', 'Change Provider'
    ).then(c => {
      if (c === 'Get Ollama')      vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
      if (c === 'Change Provider') vscode.commands.executeCommand('workbench.action.openSettings', 'codeSec.aiProvider');
    });
  }
}

export function deactivate(): void {}

// Map language IDs to file extensions for the workspace scan glob
function langToExts(lang: string): string[] {
  const map: Record<string, string[]> = {
    javascript: ['js','jsx','mjs'], typescript: ['ts','tsx'],
    python: ['py'], java: ['java'],
  };
  return map[lang] ?? [lang];
}
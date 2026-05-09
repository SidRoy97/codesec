"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultStore = void 0;
// In-memory map from file URI → last analysis result for that file
class ResultStore {
    constructor() {
        // Key is the URI string so we can look up by vscode.Uri easily
        this.store = new Map();
    }
    // Save or overwrite the result for a file
    save(result) {
        this.store.set(result.uri.toString(), result);
    }
    // Get the last result for a file, or undefined if never analyzed
    get(uri) {
        return this.store.get(uri.toString());
    }
    // Get all results — used by the dashboard and status bar
    getAll() {
        return Array.from(this.store.values());
    }
    // Remove one file when it's closed so stale results don't accumulate
    remove(uri) {
        this.store.delete(uri.toString());
    }
    // Wipe everything when the user clicks "Clear All"
    clear() {
        this.store.clear();
    }
}
exports.ResultStore = ResultStore;

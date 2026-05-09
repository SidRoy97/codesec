"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultStore = void 0;
// In-memory map from file URI → last analysis result for that file
var ResultStore = /** @class */ (function () {
    function ResultStore() {
        // Key is the URI string so we can look up by vscode.Uri easily
        this.store = new Map();
    }
    // Save or overwrite the result for a file
    ResultStore.prototype.save = function (result) {
        this.store.set(result.uri.toString(), result);
    };
    // Get the last result for a file, or undefined if never analyzed
    ResultStore.prototype.get = function (uri) {
        return this.store.get(uri.toString());
    };
    // Get all results — used by the dashboard and status bar
    ResultStore.prototype.getAll = function () {
        return Array.from(this.store.values());
    };
    // Remove one file when it's closed so stale results don't accumulate
    ResultStore.prototype.remove = function (uri) {
        this.store.delete(uri.toString());
    };
    // Wipe everything when the user clicks "Clear All"
    ResultStore.prototype.clear = function () {
        this.store.clear();
    };
    return ResultStore;
}());
exports.ResultStore = ResultStore;

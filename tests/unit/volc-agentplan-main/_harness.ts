/**
 * volc-agentplan-main test harness
 *
 * The src/volc-agentplan-main/*.js modules are vanilla JS scripts designed to be
 * concatenated and injected into a page's MAIN world. They declare functions
 * and vars in the global scope — they have no ES module exports.
 *
 * Strategy: execute each source file via Node's `vm.runInContext`, which
 * runs the script inside an explicitly provided sandbox object. All top-level
 * `var` declarations and `function` declarations are written into the sandbox,
 * making them accessible to tests.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const SRC_DIR = resolve(__dirname, '../../../src/volc-agentplan-main');

export type VolcAgentplanScope = Record<string, unknown>;

function makeSandbox(): VolcAgentplanScope {
  const doc = {
    getElementById: (_id: string) => null,
    createElement: (_tag: string) => ({
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      style: {},
      innerHTML: '',
      textContent: '',
      className: '',
      id: '',
    }),
    body: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    cookie: '',
  };

  const win = {
    addEventListener: () => {},
    removeEventListener: () => {},
    postMessage: () => {},
  };

  return {
    document: doc,
    window: win,
    sessionStorage: { getItem: () => null, setItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} },
    performance: { now: () => Date.now() },
    setTimeout: (fn: Function, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: unknown) => clearTimeout(id as number),
    setInterval: () => 0,
    clearInterval: () => {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({ code: 200 }) }),
    console,
    Math,
    Date,
  };
}

export function loadVolcAgentplanModules(moduleNames: string[]): VolcAgentplanScope {
  const sandbox = vm.createContext(makeSandbox());

  for (const name of moduleNames) {
    const filePath = resolve(SRC_DIR, name.endsWith('.js') ? name : `${name}.js`);
    const code = readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox);
  }

  return sandbox as VolcAgentplanScope;
}

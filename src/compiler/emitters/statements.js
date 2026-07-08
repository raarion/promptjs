// @ts-check

/**
 * PromptJS v1.0.0 — Statement Emitters / Emitor Statement (entry point)
 * ============================================================================
 *
 * Behavior-preserving modularization of the former monolithic
 * `src/compiler/emitters/statements.js`.
 *
 * This file is now a SMALL ENTRY POINT. The actual visitor implementations
 * live in `./statements/<topic>.js`, each exposing `install(PromptJSCompiler,
 * accept)`. Every visitor is still mounted onto `PromptJSCompiler.prototype`
 * exactly as before — only the file layout changed. The external import path
 * (`require('./emitters/statements')`) and the `{ install }` export are
 * preserved, so `src/compiler/promptjs-compiler.js` is unchanged.
 *
 * No compiler behavior, emitted code, or public API was changed by this
 * refactor. See the per-topic modules for the visitor bodies.
 */

'use strict';

const coreHelpers = require('./statements/core-helpers');
const declarations = require('./statements/declarations');
const dom = require('./statements/dom');
const propertiesAndBindings = require('./statements/properties-and-bindings');
const events = require('./statements/events');
const reactivity = require('./statements/reactivity');
const lists = require('./statements/lists');
const controlFlow = require('./statements/control-flow');
const dataMutations = require('./statements/data-mutations');
const fetchEmitters = require('./statements/fetch');
const components = require('./statements/components');
const navigation = require('./statements/navigation');
const interop = require('./statements/interop');
const expressions = require('./statements/expressions');

/**
 * Pasang semua statement visitor ke `PromptJSCompiler.prototype`.
 *
 * Dipanggil sekali saat module load (lihat `src/compiler/promptjs-compiler.js`).
 * Setelah `install`, instance PromptJSCompiler akan memiliki semua `visit<NodeType>`
 * method yang siap dipakai oleh `accept` dispatch dari `compile()`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, accept) {
  coreHelpers.install(PromptJSCompiler, accept);
  declarations.install(PromptJSCompiler, accept);
  dom.install(PromptJSCompiler, accept);
  propertiesAndBindings.install(PromptJSCompiler, accept);
  events.install(PromptJSCompiler, accept);
  reactivity.install(PromptJSCompiler, accept);
  lists.install(PromptJSCompiler, accept);
  controlFlow.install(PromptJSCompiler, accept);
  dataMutations.install(PromptJSCompiler, accept);
  fetchEmitters.install(PromptJSCompiler, accept);
  components.install(PromptJSCompiler, accept);
  navigation.install(PromptJSCompiler, accept);
  interop.install(PromptJSCompiler, accept);
  expressions.install(PromptJSCompiler, accept);
}

module.exports = { install };

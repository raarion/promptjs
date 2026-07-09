// @ts-check

/**
 * PromptJS Resolver — modular entry point.
 * ============================================================================
 *
 * Menggabungkan semua modul resolver: core, aliases, visitors, dan analysis
 * ke dalam satu konstruktor PromptJSResolver.
 *
 * Arsitektur modular (v132+):
 *   core/        — Scope, SemanticSymbol, resolver state, globals
 *   aliases/     — Property/method aliases + context detection
 *   visitors/    — 10 visitor mixin modules (33 visit methods)
 *   analysis/    — fetch-auto-state, write-tracking, gather-globals
 */

const { BaseVisitor } = require('../utils/visitor');

// Core
const { Scope } = require('./core/scope');
const { SemanticSymbol } = require('./core/symbol');
const {
  JS_GLOBALS,
  BUILTIN_FUNCTIONS,
  VALID_EVENT_NAMES,
  VALID_PERBARUI_PROPERTIES,
} = require('./core/globals');
const resolverState = require('./core/resolver-state');

// Aliases
const aliasContext = require('./aliases/context');

// Analysis
const fetchAutoState = require('./analysis/fetch-auto-state');
const writeTracking = require('./analysis/write-tracking');
const gatherGlobals = require('./analysis/gather-globals');

// Visitors
const declarationsVisitors = require('./visitors/declarations');
const identifiersVisitors = require('./visitors/identifiers');
const memberExpressionVisitors = require('./visitors/member-expression');
const callsVisitors = require('./visitors/calls');
const mutationsVisitors = require('./visitors/mutations');
const fetchVisitors = require('./visitors/fetch');
const listsVisitors = require('./visitors/lists');
const componentsVisitors = require('./visitors/components');
const eventsVisitors = require('./visitors/events');
const controlFlowVisitors = require('./visitors/control-flow');

// ============================================================================
// CONSTRUCTOR
// ============================================================================

/**
 * Constructor PromptJSResolver — resolver berbasis visitor pattern.
 *
 * @constructor
 * @this {PromptJSResolver & { genericVisit: (node: Object) => void, accept: (node: Object, visitor: Object) => any }}
 */
function PromptJSResolver() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this.currentScope = null;
  this.buatStack = [];
  this.allSymbols = [];
  this.currentJalankanCallee = null;
  this._symbolIdCounter = 0;
}

PromptJSResolver.prototype = Object.create(BaseVisitor.prototype);
PromptJSResolver.prototype.constructor = PromptJSResolver;

// TypeScript hints
/** @type {(node: Object) => void} */
PromptJSResolver.prototype.genericVisit;

/** @type {Object | null} */
PromptJSResolver.prototype._frontMatterData;

/** @type {boolean} */
PromptJSResolver.prototype._suppressUndeclaredCascade;

// ============================================================================
// APPLY MIXINS
// ============================================================================

// Re-export constructors for external consumers
PromptJSResolver.Scope = Scope;
PromptJSResolver.SemanticSymbol = SemanticSymbol;
PromptJSResolver.JS_GLOBALS = JS_GLOBALS;
PromptJSResolver.BUILTIN_FUNCTIONS = BUILTIN_FUNCTIONS;
PromptJSResolver.VALID_EVENT_NAMES = VALID_EVENT_NAMES;
PromptJSResolver.VALID_PERBARUI_PROPERTIES = VALID_PERBARUI_PROPERTIES;

// resolve — entry point (directly on prototype for TypeScript visibility)
PromptJSResolver.prototype.resolve = resolverState.resolve;

// Other state & core methods (addSymbol, addError, addWarning, markAsJSExternal)
Object.assign(PromptJSResolver.prototype, /** @type {any} */ (resolverState));

// Alias context methods (_isDomElement, _isReactiveDataVar, _isArrayLikeVar)
Object.assign(PromptJSResolver.prototype, aliasContext);

// Analysis methods (_markFetchAutoStateUsed, _trackWrite, gatherGlobals)
Object.assign(PromptJSResolver.prototype, fetchAutoState);
Object.assign(PromptJSResolver.prototype, writeTracking);
Object.assign(PromptJSResolver.prototype, gatherGlobals);

// Visitor methods
Object.assign(PromptJSResolver.prototype, declarationsVisitors);
Object.assign(PromptJSResolver.prototype, identifiersVisitors);
Object.assign(PromptJSResolver.prototype, memberExpressionVisitors);
Object.assign(PromptJSResolver.prototype, callsVisitors);
Object.assign(PromptJSResolver.prototype, mutationsVisitors);
Object.assign(PromptJSResolver.prototype, fetchVisitors);
Object.assign(PromptJSResolver.prototype, listsVisitors);
Object.assign(PromptJSResolver.prototype, componentsVisitors);
Object.assign(PromptJSResolver.prototype, eventsVisitors);
Object.assign(PromptJSResolver.prototype, controlFlowVisitors);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = PromptJSResolver;

'use strict';

/**
 * Component emitters: KomponenDeclaration (factory) + GunakanStatement (instantiate/mount).
 *
 * This module is a behavior-preserving extraction from the former monolithic
 * `src/compiler/emitters/statements.js`. Every visitor is installed onto
 * `PromptJSCompiler.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang visitor untuk modul ini ke `PromptJSCompiler.prototype`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, accept) {
  PromptJSCompiler.prototype.visitKomponenDeclaration = function (node) {
    // Component = factory function that takes a single named-props object and
    // returns a DOM element. Props are destructured into locals so the body can
    // reference them by name (e.g. `judul`).
    const componentVar = `__komp_${node.name}`;

    this.emit(`function ${componentVar}(props) {`);
    this.indent++;
    this.emit(`props = props || {};`);
    this.emit(`// Component: ${node.name}`);
    if (node.params && node.params.length > 0) {
      node.params.forEach((p) => {
        if (p.defaultValue) {
          // Documented default parameter: fall back when the prop is omitted.
          const def = this.lowerExpression(p.defaultValue);
          this.emit(`const ${p.name} = props.${p.name} !== undefined ? props.${p.name} : ${def};`);
        } else {
          this.emit(`const ${p.name} = props.${p.name};`);
        }
      });
    }
    this.emit(`const __root = document.createElement("div");`);

    // v132 #79: CSS scoping -- push this component's name so any element
    // created while visiting its body (visitBuatStatement, nested list/Saat
    // markers, etc.) is stamped with `data-pjs-<fileScope>-<componentName>`
    // instead of the page/file-level scope. A NESTED `Komponen` declared
    // inside this one's body pushes its OWN name on top (see below), so its
    // elements correctly get their own component's scope, not the parent's
    // -- popped back off when that nested component's body finishes.
    this._componentScopeStack.push(node.name);
    const scopeAttr = this.currentCssScopeAttr();
    if (scopeAttr) {
      this.emit(`__root.setAttribute(${JSON.stringify(scopeAttr)}, "");`);
    }

    // Set currentParent so child elements append to __root
    const prevParent = this.currentParent;
    this.currentParent = '__root';

    // Visit body (buat, ketika, etc.)
    if (node.body) accept(node.body, this);

    this.currentParent = prevParent;
    this._componentScopeStack.pop();

    this.emit(`return __root;`);
    this.indent--;
    this.emit(`}`);

    // Expose component factory globally
    this.emit(`window.${node.name} = ${componentVar};`);
  };

  PromptJSCompiler.prototype.visitGunakanStatement = function (node) {
    // "gunakan NamaKomponen dengan props di target"
    const componentFactory = `__komp_${node.componentName}`;

    // Build props object
    let propsArg = '';
    if (node.props && node.props.length > 0) {
      const propPairs = node.props.map((p) => {
        const val = this.lowerExpression(p.value);
        return `"${p.key}": ${val}`;
      });
      propsArg = `{ ${propPairs.join(', ')} }`;
    }

    const instanceVar = this.genVar('komp');
    this.emit(`const ${instanceVar} = ${componentFactory}(${propsArg});`);

    // Mount ke target
    if (node.mountTarget) {
      const mountTarget = this.resolveTarget(node.mountTarget);
      this.emit(`${mountTarget}.appendChild(${instanceVar});`);
    } else if (this.currentParent) {
      this.emit(`${this.currentParent}.appendChild(${instanceVar});`);
    } else {
      this.emit(`document.body.appendChild(${instanceVar});`);
    }
  };
}

module.exports = { install };

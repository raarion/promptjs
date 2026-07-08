'use strict';

/**
 * PromptJS v1.0.0 — Parser Shared: Event Modifier Constants
 * ============================================================================
 *
 * Event modifier tables shared by both `Ketika ...:` (_parseKetikaStatement)
 * and the inline `on_x.mod = ...` form (_parseOnEventStatement) so the two
 * paths cannot drift out of sync again.
 */

// v132 stabilization: event modifiers that are parsed AND actually have a
// codegen effect (src/compiler/emitters/statements.js MODIFIER_MAP / the
// `{ once: true }` addEventListener option).
const VALID_EVENT_MODIFIERS = {
  cegah: true,
  prevent: true,
  sekali: true,
  once: true,
  hentikan: true,
  stop: true,
};

// v132 stabilization (P0.1): modifier NAMES that are recognizable (borrowed
// from common web-framework vocabulary) but have NO implementation in the
// compiler yet. These must not be silently dropped — silently accepting them
// as if they did something would be a repeat of the original `.sekali`/
// `.once` no-op bug. Anything not in either list is treated as "this DOT is
// probably part of a target expression, not a modifier" (unchanged prior
// behavior), preserving the escape hatch for a genuine dotted target.
const KNOWN_UNSUPPORTED_MODIFIERS = {
  capture: true,
  passive: true,
  self: true,
  exact: true,
};

module.exports = { VALID_EVENT_MODIFIERS, KNOWN_UNSUPPORTED_MODIFIERS };

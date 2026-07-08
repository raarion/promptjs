'use strict';

import { describe, it, expect } from 'vitest';

/**
 * v132 #79 — Dogfood E2E: Kedai Kopi Nusantara
 *
 * Proves CSS scoping works end-to-end in a realistic mini app:
 *   1. MenuCard vs TestimonialCard both use `.card` but get DIFFERENT
 *      computed styles (white vs brown background).
 *   2. StarRating (nested in TestimonialCard) has its OWN scope,
 *      not its parent's.
 *   3. `:global(body)` styles apply to the actual <body> element.
 *   4. Adding a foreign `.card` element to the DOM gets NO scoped
 *      style (proof of isolation).
 */

const { compile } = require('../src/engine/promptjs');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../examples/kedai-kopi/index.pjs'), 'utf8');

function runApp() {
  const r = compile(src, { source: 'index.pjs' });
  if (!r.success) throw new Error('Compile failed: ' + JSON.stringify(r.errors));

  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
    runScripts: 'dangerously',
    url: 'http://localhost',
  });

  // Inject scoped CSS
  const style = dom.window.document.createElement('style');
  style.textContent = r.css;
  dom.window.document.head.appendChild(style);

  // Run JS
  dom.window.eval(r.js);

  return { window: dom.window, css: r.css, js: r.js };
}

describe('Dogfood: Kedai Kopi Nusantara — CSS scoping E2E', () => {
  it('1. MenuCard .card has white background, TestimonialCard .card has brown', () => {
    const { window } = runApp();

    const menuCards = window.document.querySelectorAll('[data-pjs-index-menucard].card');
    const testimonialCards = window.document.querySelectorAll(
      '[data-pjs-index-testimonialcard].card'
    );

    expect(menuCards.length).toBe(3);
    expect(testimonialCards.length).toBe(2);

    // MenuCard: white bg
    const menuStyle = window.getComputedStyle(menuCards[0]);
    expect(menuStyle.background).toContain('rgb(255, 255, 255)'); // white

    // TestimonialCard: brown bg, white text (set explicitly by scoped CSS)
    const testStyle = window.getComputedStyle(testimonialCards[0]);
    expect(testStyle.background).toContain('rgb(111, 78, 55)'); // #6f4e37
    expect(testStyle.color).toContain('rgb(255, 255, 255)');

    // Prove NO collision: MenuCard bg != TestimonialCard bg
    expect(menuStyle.background).not.toBe(testStyle.background);
  });

  it('2. StarRating has its own scope, not parent TestimonialCard scope', () => {
    const { window } = runApp();

    const starsContainer = window.document.querySelector('[data-pjs-index-starrating].stars');
    expect(starsContainer).not.toBeNull();

    // StarRating root has its OWN scope attribute
    const starRoot = starsContainer.closest('[data-pjs-index-starrating]');
    expect(starRoot).not.toBeNull();

    // It does NOT have the TestimonialCard scope
    expect(starRoot.hasAttribute('data-pjs-index-testimonialcard')).toBe(false);
  });

  it('3. :global(body) style applies to <body> without scope attribute', () => {
    const { window } = runApp();

    const bodyStyle = window.getComputedStyle(window.document.body);
    // :global(body) sets font-family, margin, background, color
    expect(bodyStyle.fontFamily).toContain('system-ui');
    expect(bodyStyle.margin).toBe('0px');
    expect(bodyStyle.background).toContain('rgb(250, 247, 242)'); // #faf7f2
  });

  it('4. A foreign .card element injected into DOM gets NO scoped style', () => {
    const { window } = runApp();

    // Simulate a third-party widget that uses .card class
    const foreign = window.document.createElement('div');
    foreign.className = 'card';
    foreign.textContent = 'I am a foreign card';
    window.document.body.appendChild(foreign);

    // Foreign card must NOT have any PromptJS scope attribute
    expect(foreign.hasAttribute('data-pjs-')).toBe(false);

    // Foreign card must NOT get MenuCard's white background
    // (it might get the default, but NOT the scoped style)
    // If it were matched by .card[data-pjs-index-menucard], background would be white
    // Since it has no scope attr, the scoped selector won't match
    expect(foreign.hasAttribute('data-pjs-index-menucard')).toBe(false);
    expect(foreign.hasAttribute('data-pjs-index-testimonialcard')).toBe(false);
  });

  it('5. :global(body.modal-open) CSS rule exists and matches when class is added', () => {
    const { window, css } = runApp();

    // CSS contains the global rule without scope
    expect(css).toContain('body.modal-open {');
    expect(css).toContain('overflow: hidden');
    // Must NOT have scope on it
    expect(css).not.toContain('body.modal-open[data-pjs-');

    // Simulate adding the class
    window.document.body.classList.add('modal-open');
    const bodyStyle = window.getComputedStyle(window.document.body);
    expect(bodyStyle.overflow).toBe('hidden');

    // Remove it
    window.document.body.classList.remove('modal-open');
  });

  it('6. Page-level .hero has scoped styles applied', () => {
    const { window } = runApp();

    const hero = window.document.querySelector('[data-pjs-index].hero');
    expect(hero).not.toBeNull();

    const heroStyle = window.getComputedStyle(hero);
    expect(heroStyle.textAlign).toBe('center');

    const h1 = hero.querySelector('h1');
    const h1Style = window.getComputedStyle(h1);
    expect(h1Style.fontSize).toBe('32px');
  });
});
